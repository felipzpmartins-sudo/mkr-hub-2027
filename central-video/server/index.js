import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import crypto from "node:crypto";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 8080);
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const hubProvisionKey = process.env.CENTRAL_VIDEO_HUB_PROVISION_KEY;
const uploadDir = process.env.UPLOAD_DIR || "/data/uploads";

if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");
if (!jwtSecret) throw new Error("JWT_SECRET não configurado.");

fs.mkdirSync(uploadDir, { recursive: true });
const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  // This service owns the `videos` schema. Keeping it out of `public` prevents
  // collisions with tables belonging to the other Maker applications.
  options: "-c search_path=videos,public",
});
const app = express();
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadDir));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

const crew = [
  ["captain", "Guilherme", "capitao", "guilherme.captain@centraldevideos.com"],
  ["richard", "Richard", "tripulante", "richard@centraldevideos.com"],
  ["mah", "Mah", "tripulante", "mah@centraldevideos.com"],
  ["jade", "Jade", "tripulante", "jade@centraldevideos.com"],
];

async function initialise() {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS videos;
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      name text NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL CHECK (role IN ('solicitante','capitao','tripulante')),
      crew_key text UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS video_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text,
      video_type text NOT NULL,
      brand text,
      platform text,
      format text,
      orientation text,
      deadline date,
      status text NOT NULL DEFAULT 'new',
      requester_id uuid REFERENCES users(id) ON DELETE SET NULL,
      requester_name text NOT NULL,
      assigned_to jsonb NOT NULL DEFAULT '[]',
      assigned_names jsonb NOT NULL DEFAULT '[]',
      attachments jsonb NOT NULL DEFAULT '[]',
      deliverables jsonb NOT NULL DEFAULT '[]',
      notes jsonb NOT NULL DEFAULT '[]',
      progress integer NOT NULL DEFAULT 0,
      whatsapp text,
      drive_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // The service originally stored users and requests in `public`. When the service was
  // moved into its own schema, PostgreSQL started reading the newly-created
  // empty `videos.video_requests` table instead. Bring those legacy requests
  // over once, preserving the attachment and deliverable metadata (and their
  // file URLs). `ON CONFLICT` keeps this safe on every subsequent restart.
  const { rows: [legacy] } = await pool.query(
    "SELECT to_regclass('public.video_requests') IS NOT NULL AS exists",
  );
  const { rows: [legacyUsers] } = await pool.query(
    "SELECT to_regclass('public.users') IS NOT NULL AS exists",
  );
  if (legacyUsers.exists) {
    await pool.query(`
      INSERT INTO videos.users (id, email, name, password_hash, role, crew_key, created_at)
      SELECT id, email, name, password_hash, role, crew_key, created_at
      FROM public.users
      ON CONFLICT DO NOTHING
    `);
  }
  if (legacy.exists) {
    await pool.query(`
      INSERT INTO videos.video_requests (
        id, title, description, video_type, brand, platform, format,
        orientation, deadline, status, requester_id, requester_name, assigned_to,
        assigned_names, attachments, deliverables, notes, progress, whatsapp,
        drive_url, created_at, updated_at
      )
      SELECT
        id, title, description, video_type, brand, platform, format,
        orientation, deadline, status,
        CASE WHEN EXISTS (SELECT 1 FROM videos.users WHERE id = legacy.requester_id)
          THEN legacy.requester_id ELSE NULL END,
        requester_name, to_jsonb(assigned_to),
        to_jsonb(assigned_names), COALESCE(attachments, '[]'::jsonb),
        COALESCE(deliverables, '[]'::jsonb), COALESCE(notes, '[]'::jsonb),
        COALESCE(progress, 0), whatsapp, drive_url, created_at, updated_at
      FROM public.video_requests AS legacy
      ON CONFLICT (id) DO NOTHING
    `);
  }

  const hash = await bcrypt.hash(process.env.CREW_PASSWORD || "!AUDIOvisual", 12);
  for (const [crewKey, name, role, email] of crew) {
    await pool.query(
      `INSERT INTO users (email, name, password_hash, role, crew_key)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO NOTHING`,
      [email, name, hash, role, crewKey],
    );
  }
}

function publicUser(row) { return { id: row.id, name: row.name, email: row.email, role: row.role, crew_key: row.crew_key }; }
function tokenFor(user) { return jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: "7d" }); }
function auth(required = true) {
  return async (req, res, next) => {
    const value = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!value) return required ? res.status(401).json({ message: "Sessão necessária." }) : next();
    try {
      const payload = jwt.verify(value, jwtSecret);
      const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [payload.sub]);
      if (!rows[0]) return res.status(401).json({ message: "Sessão inválida." });
      req.user = rows[0];
      next();
    } catch { return res.status(401).json({ message: "Sessão expirada. Entre novamente." }); }
  };
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ message: "Preencha nome, e-mail e senha de pelo menos 6 caracteres." });
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query("INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'solicitante') RETURNING *", [name.trim(), email.trim().toLowerCase(), hash]);
    return res.status(201).json({ token: tokenFor(rows[0]), user: publicUser(rows[0]) });
  } catch (error) { return res.status(409).json({ message: "Este e-mail já possui cadastro." }); }
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [String(email || "").trim().toLowerCase()]);
  if (!rows[0] || !(await bcrypt.compare(password || "", rows[0].password_hash))) return res.status(401).json({ message: "E-mail ou senha incorretos." });
  return res.json({ token: tokenFor(rows[0]), user: publicUser(rows[0]) });
});
// This endpoint is server-to-server only. It lets the MKR HUB connect an
// existing Central de Vídeos account by its verified HUB e-mail, or create a
// new requester account without exposing a second password to the person.
app.post("/api/auth/hub-provision", async (req, res) => {
  if (!hubProvisionKey || req.get("x-hub-provision-key") !== hubProvisionKey)
    return res.status(403).json({ message: "Integração do MKR HUB não autorizada." });
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!name || !email.includes("@"))
    return res.status(400).json({ message: "Identidade do MKR HUB inválida." });
  let user;
  const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  user = rows[0];
  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("base64url"), 12);
    const created = await pool.query(
      "INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'solicitante') RETURNING *",
      [name, email, passwordHash],
    );
    user = created.rows[0];
  }
  return res.json({ token: tokenFor(user), user: publicUser(user) });
});
app.post("/api/auth/crew", async (req, res) => {
  const { crewKey, password } = req.body;
  const { rows } = await pool.query("SELECT * FROM users WHERE crew_key=$1", [crewKey]);
  if (!rows[0] || !(await bcrypt.compare(password || "", rows[0].password_hash))) return res.status(401).json({ message: "Senha incorreta." });
  return res.json({ token: tokenFor(rows[0]), user: publicUser(rows[0]) });
});
app.get("/api/auth/me", auth(), (req, res) => res.json({ user: publicUser(req.user) }));
app.get("/api/crew", auth(), async (_req, res) => {
  const { rows } = await pool.query("SELECT id,name,role,crew_key FROM users WHERE role='tripulante' ORDER BY name");
  res.json(rows);
});

app.get("/api/requests", auth(), async (req, res) => {
  const params = []; let where = "";
  if (req.user.role === "solicitante") { params.push(req.user.id); where = "WHERE requester_id=$1"; }
  const { rows } = await pool.query(`SELECT * FROM video_requests ${where} ORDER BY created_at DESC LIMIT 100`, params);
  res.json(rows);
});
app.post("/api/requests", auth(), async (req, res) => {
  const v = req.body;
  if (!v.title || !v.video_type || !v.requester_name) return res.status(400).json({ message: "Preencha os campos obrigatórios." });
  const { rows } = await pool.query(
    `INSERT INTO video_requests (title,description,video_type,requester_name,requester_id,whatsapp,brand,platform,format,orientation,deadline,drive_url,attachments)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [v.title,v.description || null,v.video_type,v.requester_name,req.user.id,v.whatsapp || null,v.brand || null,v.platform || null,v.format || null,v.orientation || null,v.deadline || null,v.drive_url || null,JSON.stringify(v.attachments || [])],
  );
  res.status(201).json(rows[0]);
});
app.patch("/api/requests/:id", auth(), async (req, res) => {
  const { rows: existing } = await pool.query("SELECT * FROM video_requests WHERE id=$1", [req.params.id]);
  if (!existing[0]) return res.status(404).json({ message: "Solicitação não encontrada." });
  if (req.user.role === "solicitante" && existing[0].requester_id !== req.user.id) return res.status(403).json({ message: "Sem permissão." });
  const allowed = ["status","assigned_to","assigned_names","progress","notes","deliverables"];
  const values = []; const sets = [];
  for (const key of allowed) if (req.body[key] !== undefined) { values.push(["assigned_to","assigned_names","notes","deliverables"].includes(key) ? JSON.stringify(req.body[key]) : req.body[key]); sets.push(`${key}=$${values.length}`); }
  if (!sets.length) return res.status(400).json({ message: "Nenhuma alteração recebida." });
  values.push(req.params.id);
  const { rows } = await pool.query(`UPDATE video_requests SET ${sets.join(",")}, updated_at=now() WHERE id=$${values.length} RETURNING *`, values);
  res.json(rows[0]);
});
app.delete("/api/requests/:id", auth(), async (req, res) => {
  if (req.user.role !== "capitao") return res.status(403).json({ message: "Apenas o capitão pode excluir." });
  await pool.query("DELETE FROM video_requests WHERE id=$1", [req.params.id]); res.status(204).end();
});
app.post("/api/uploads", auth(), upload.array("files", 10), (req, res) => {
  const files = (req.files || []).map((file) => ({ name: file.originalname, size: file.size, path: file.filename, url: `/uploads/${file.filename}` }));
  res.status(201).json(files);
});

app.use(express.static(path.join(root, "dist")));
app.get("/{*splat}", (_req, res) => res.sendFile(path.join(root, "dist", "index.html")));

initialise().then(() => app.listen(port, () => console.log(`Central de Vídeos em :${port}`))).catch((error) => { console.error(error); process.exit(1); });
