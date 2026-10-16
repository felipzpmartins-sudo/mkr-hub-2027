// Gera as camadas da cena cinematográfica (céu e mar de nuvens) usadas por <Scene />
// em public/atmosphere. Tudo é procedural: nenhuma imagem de terceiros.
// Uso: node scripts/generate-atmosphere.mjs   (ATMOS_PREVIEW=prev.png grava uma prévia)
// Depende de `sharp`, que já vem instalado junto com o Next.js.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const W = 2000;
const H = 1125;
const HORIZON = 0.575 * H;
const SUN = { x: 0.74 * W, y: HORIZON - 0.03 * H };
const out = resolve(process.cwd(), "public", "atmosphere");
await mkdir(out, { recursive: true });

// ---------- ruído (simplex 2D com semente) ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeFbm(seed) {
  const rand = rng(seed);
  const perm = new Uint8Array(512);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
  const grad = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  function noise(x, y) {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      const g = grad[perm[ii + perm[jj]] & 7];
      t0 *= t0;
      n += t0 * t0 * (g[0] * x0 + g[1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      const g = grad[perm[ii + i1 + perm[jj + j1]] & 7];
      t1 *= t1;
      n += t1 * t1 * (g[0] * x1 + g[1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      const g = grad[perm[ii + 1 + perm[jj + 1]] & 7];
      t2 *= t2;
      n += t2 * t2 * (g[0] * x2 + g[1] * y2);
    }
    return 70 * n; // ~[-1, 1]
  }
  return (x, y, octaves = 5) => {
    let amp = 0.5;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * freq, y * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2.07;
    }
    return sum / norm; // ~[-1, 1]
  };
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

// ---------- céu ----------
function sky() {
  const fbm = makeFbm(3);
  const buf = Buffer.alloc(W * H * 3);
  const stops = [
    [0.0, [5, 12, 20]],
    [0.22, [11, 29, 41]],
    [0.4, [28, 58, 72]],
    [0.5, [88, 96, 98]],
    [0.56, [214, 150, 96]],
    [0.575, [250, 178, 104]],
    [1.0, [160, 96, 60]],
  ];
  const dither = rng(7);
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    let c = stops[stops.length - 1][1];
    for (let k = 0; k < stops.length - 1; k++) {
      if (t >= stops[k][0] && t <= stops[k + 1][0]) {
        c = mix3(stops[k][1], stops[k + 1][1], smooth(stops[k][0], stops[k + 1][0], t));
        break;
      }
    }
    for (let x = 0; x < W; x++) {
      const dx = x - SUN.x;
      const dy = (y - SUN.y) * 1.5;
      const r2 = dx * dx + dy * dy;
      const halo = Math.exp(-r2 / (2 * (0.27 * W) ** 2));
      const glow = Math.exp(-r2 / (2 * (0.1 * W) ** 2));
      const core = Math.exp(-r2 / (2 * (0.026 * W) ** 2));
      // cirros finos esticados na horizontal, acesos perto do sol
      const band = smooth(0.18, 0.4, t) * (1 - smooth(0.5, 0.57, t));
      const cirrus =
        smooth(0.18, 0.62, fbm((x / W) * 3.1 + 5, (y / H) * 21.0, 5) * 0.5 + 0.5) * band;
      const lit = Math.exp(-r2 / (2 * (0.45 * W) ** 2));
      let r = c[0] + 215 * halo * 0.5 + 80 * glow + 70 * core + cirrus * (22 + 150 * lit);
      let g = c[1] + 112 * halo * 0.5 + 68 * glow + 66 * core + cirrus * (28 + 92 * lit);
      let b = c[2] + 42 * halo * 0.5 + 38 * glow + 48 * core + cirrus * (36 + 40 * lit);
      // escurece a esquerda para o texto respirar (vinheta cinematográfica)
      const shade = 1 - 0.42 * smooth(0.0, 0.75, 1 - x / W);
      const n = (dither() - 0.5) * 2.4;
      const o = (y * W + x) * 3;
      buf[o] = clamp(r * shade + n, 0, 255);
      buf[o + 1] = clamp(g * shade + n, 0, 255);
      buf[o + 2] = clamp(b * shade + n, 0, 255);
    }
  }
  return buf;
}

// ---------- mar de nuvens (perspectiva + relevo iluminado) ----------
function deck({ seed, scale, slope }) {
  const fbm = makeFbm(seed);
  // "billow": lóbulos arredondados separados por vales, como o topo de cúmulos
  const height = (u, v, oct) => {
    const wu = fbm(u * 0.45 + 9.1, v * 0.45 + 3.7, 3);
    const wv = fbm(u * 0.45 + 41.3, v * 0.45 + 17.9, 3);
    const n = fbm(u + wu * 0.3, v + wv * 0.3, oct);
    const big = fbm(u * 0.35 + 77, v * 0.35 + 5, 3) * 0.5 + 0.5;
    const lobes = 1 - Math.abs(n);
    return lobes * lobes * 0.7 + big * 0.3;
  };
  const buf = Buffer.alloc(W * H * 4);
  const shadowCol = [86, 84, 100];
  const fillCol = [150, 122, 118];
  const litCol = [255, 196, 134];
  const hotCol = [255, 238, 204];
  const hazeCol = [244, 168, 104];
  const L = (() => {
    const v = [0.45, 0.34, 0.82];
    const m = Math.hypot(...v);
    return v.map((c) => c / m);
  })();
  for (let y = Math.floor(HORIZON - 4); y < H; y++) {
    const t = (y - HORIZON) / (H - HORIZON);
    const z = 1 / (Math.max(t, 0) + 0.3);
    const oct = z > 2.6 ? 4 : 6;
    const edge = smooth(-0.01, 0.04, t);
    for (let x = 0; x < W; x++) {
      const u = (x / W - 0.5) * z * scale + 20;
      const v = z * scale * 0.7 + 7;
      const e = 0.05;
      const h = height(u, v, oct);
      const gu = (-(height(u + e, v, oct) - height(u - e, v, oct)) / (2 * e)) * slope;
      const gv = (-(height(u, v + e, oct) - height(u, v - e, oct)) / (2 * e)) * slope;
      const nl = Math.hypot(gu, 1, gv);
      const diff = (gu * L[0] + L[1] + gv * L[2]) / nl; // -1..1
      const wrap = clamp(diff * 0.5 + 0.5);
      const lit = smooth(0.38, 0.86, wrap);
      const hot = smooth(0.7, 1.0, wrap);
      const occlusion = mix(0.62, 1, smooth(0.25, 0.85, h));
      let col = mix3(shadowCol, fillCol, smooth(0.2, 0.7, wrap));
      col = mix3(col, litCol, lit);
      col = mix3(col, hotCol, hot * 0.55);
      col = col.map((c) => c * occlusion);
      const haze = smooth(1.5, 3.2, z);
      col = mix3(col, hazeCol, haze * 0.9);
      const sx = (x - SUN.x) / W;
      const sy = (y - SUN.y) / H;
      const sunBloom = Math.exp(-(sx * sx * 5.2 + sy * sy * 16));
      col = mix3(col, hotCol, sunBloom * 0.45);
      const o = (y * W + x) * 4;
      buf[o] = clamp(col[0], 0, 255);
      buf[o + 1] = clamp(col[1], 0, 255);
      buf[o + 2] = clamp(col[2], 0, 255);
      buf[o + 3] = clamp(edge * 255, 0, 255);
    }
  }
  return buf;
}

// ---------- relevo escuro em primeiro plano, com postes e fios ----------
function ridge() {
  const fbm = makeFbm(29);
  const buf = Buffer.alloc(W * H * 4);
  const top = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const p = x / W;
    const slope = smooth(0.0, 0.92, p);
    const body = H * (0.66 + 0.4 * slope) - H * 0.07 * Math.sin(p * 3.1 + 0.4) * (1 - slope);
    top[x] = body + fbm(p * 4.2, 3.3, 4) * H * 0.045 + fbm(p * 22, 8.1, 3) * H * 0.006;
  }
  const dark = [10, 8, 7];
  for (let x = 0; x < W; x++) {
    for (let y = Math.max(0, Math.floor(top[x] - 3)); y < H; y++) {
      const d = y - top[x]; // distância abaixo da borda
      const cover = smooth(-1.2, 1.2, d);
      if (cover <= 0) continue;
      const grain = fbm(x * 0.012, y * 0.02, 4) * 0.5 + 0.5;
      const depth = clamp(d / (H * 0.4));
      let r = mix(34, dark[0], smooth(0, 1, depth)) * (0.75 + 0.5 * grain);
      let g = mix(24, dark[1], smooth(0, 1, depth)) * (0.75 + 0.5 * grain);
      let b = mix(18, dark[2], smooth(0, 1, depth)) * (0.75 + 0.5 * grain);
      // luz de contorno quente na borda voltada ao sol
      const slopeX = top[Math.min(W - 1, x + 3)] - top[Math.max(0, x - 3)];
      const facing = clamp(0.55 + slopeX * 0.05, 0.2, 1);
      const rim = Math.pow(clamp(1 - d / 7), 2.2) * facing;
      r += 255 * rim * 0.7;
      g += 160 * rim * 0.7;
      b += 90 * rim * 0.7;
      const o = (y * W + x) * 4;
      buf[o] = clamp(r, 0, 255);
      buf[o + 1] = clamp(g, 0, 255);
      buf[o + 2] = clamp(b, 0, 255);
      buf[o + 3] = clamp(cover * 255, 0, 255);
    }
  }
  const plot = (px, py, rad) => {
    for (let yy = Math.floor(py - rad); yy <= Math.ceil(py + rad); yy++) {
      for (let xx = Math.floor(px - rad); xx <= Math.ceil(px + rad); xx++) {
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const dist = Math.hypot(xx - px, yy - py);
        const a = clamp(rad + 0.6 - dist);
        if (a <= 0) continue;
        const o = (yy * W + xx) * 4;
        const prev = buf[o + 3] / 255;
        const na = prev + (1 - prev) * a;
        buf[o] = (buf[o] * prev * (1 - a) + 12 * a) / (na || 1);
        buf[o + 1] = (buf[o + 1] * prev * (1 - a) + 9 * a) / (na || 1);
        buf[o + 2] = (buf[o + 2] * prev * (1 - a) + 8 * a) / (na || 1);
        buf[o + 3] = na * 255;
      }
    }
  };
  const line = (x0, y0, x1, y1, rad, sag = 0) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      plot(mix(x0, x1, t), mix(y0, y1, t) + sag * 4 * t * (1 - t), rad);
    }
  };
  const pole = (xr, tall) => {
    const x = Math.round(xr * W);
    const base = top[x] + 6;
    const topY = base - tall * H;
    line(x, base, x, topY, 2.2);
    line(
      x - 0.028 * W * tall * 4,
      topY + 0.018 * H,
      x + 0.028 * W * tall * 4,
      topY + 0.018 * H,
      1.6,
    );
    line(x - 0.02 * W * tall * 4, topY + 0.05 * H, x + 0.02 * W * tall * 4, topY + 0.05 * H, 1.3);
    return { x, y: topY + 0.018 * H, w: 0.028 * W * tall * 4 };
  };
  const a = pole(0.16, 0.2);
  const b = pole(0.3, 0.145);
  const c = pole(0.405, 0.1);
  const d = pole(0.485, 0.07);
  for (const k of [-1, 1]) {
    line(a.x + k * a.w, a.y, b.x + k * b.w, b.y, 0.9, 38);
    line(b.x + k * b.w, b.y, c.x + k * c.w, c.y, 0.8, 22);
    line(c.x + k * c.w, c.y, d.x + k * d.w, d.y, 0.7, 12);
  }
  line(a.x, a.y + 0.032 * H, b.x, b.y + 0.032 * H, 0.8, 40);
  line(b.x, b.y + 0.032 * H, c.x, c.y + 0.032 * H, 0.7, 24);
  line(a.x, a.y, -20, a.y + 0.02 * H, 0.9, 20);
  return buf;
}

async function save(name, buffer, channels, options) {
  const file = resolve(out, name);
  const info = await sharp(buffer, { raw: { width: W, height: H, channels } })
    .webp(options)
    .toFile(file);
  console.log(`${name}: ${(info.size / 1024).toFixed(0)} KB`);
}

console.log("Gerando céu...");
const skyBuffer = sky();
await save("sky.webp", skyBuffer, 3, { quality: 76, effort: 5 });

console.log("Gerando mar de nuvens...");
const sea = deck({ seed: 11, scale: 2.6, slope: 1.1 });
await save("clouds.webp", sea, 4, { quality: 68, alphaQuality: 80, effort: 5 });

console.log("Gerando relevo...");
const land = ridge();
await save("ridge.webp", land, 4, { quality: 70, alphaQuality: 90, effort: 5 });

// Prévia composta opcional para conferir o resultado: ATMOS_PREVIEW=caminho.png
if (process.env.ATMOS_PREVIEW) {
  const layer = await sharp(sea, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toBuffer();
  const landLayer = await sharp(land, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toBuffer();
  const full = await sharp(skyBuffer, { raw: { width: W, height: H, channels: 3 } })
    .composite([{ input: layer }, { input: landLayer }])
    .png()
    .toBuffer();
  await sharp(full).resize(1280).png().toFile(process.env.ATMOS_PREVIEW);
}
console.log("Pronto.");
