import { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/* -------- Heart curve for love-eyes -------- */
class HeartCurve extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(a), 3);
    const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
    return target.set(x * 0.00145, (y + 2.5) * 0.00145, 0);
  }
}
const heartCurve = new HeartCurve();

/* -------- Spiral curve for dizzy eyes -------- */
class SpiralCurve extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const turns = 2.75;
    const a = t * Math.PI * 2 * turns;
    const r = 0.004 + t * 0.032;
    return target.set(Math.cos(a) * r, Math.sin(a) * r, 0);
  }
}
const spiralCurve = new SpiralCurve();

/* -------- Materials (MKR palette) -------- */
const MKR_CYAN = "#22d3ee";
const MKR_BLUE = "#1e88ff";

const earBaseMat = new THREE.MeshStandardMaterial({ color: "#e8eef7", roughness: 0.5 });
const earRingMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3 });
const earCenterMat = new THREE.MeshStandardMaterial({ color: "#b8c4d6", roughness: 0.8 });
const antennaBaseMat = new THREE.MeshStandardMaterial({ color: "#7a8aa0", roughness: 0.4, metalness: 0.5 });
const antennaStickMat = new THREE.MeshStandardMaterial({ color: "#c8d3e2", roughness: 0.4, metalness: 0.2 });
const antennaTipMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.13, 0.83, 1).multiplyScalar(2), toneMapped: false });
const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(MKR_CYAN).multiplyScalar(2), toneMapped: false });
const heartMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(MKR_CYAN).multiplyScalar(2.4),
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
});
const heartGlowMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(MKR_CYAN).multiplyScalar(1.8),
  transparent: true,
  opacity: 0.38,
  blending: THREE.AdditiveBlending,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
});
const headMat = new THREE.MeshStandardMaterial({ color: "#0a0d14", roughness: 1, metalness: 0 });
const bodyMat = new THREE.MeshStandardMaterial({ color: "#d8dde5", roughness: 0.55, metalness: 0.1 });
const neckMat = new THREE.MeshStandardMaterial({ color: "#b6bfcc", roughness: 0.5, metalness: 0.3 });
const screenGlowMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(MKR_CYAN),
  transparent: true,
  opacity: 0.35,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
});

/* -------- Ear -------- */
function RobotEar({ position, isLeft = false }: { position: [number, number, number]; isLeft?: boolean }) {
  const dir = isLeft ? -1 : 1;
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={earBaseMat} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.025, 32]} />
      </mesh>
      <mesh position={[dir * 0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={earRingMat} castShadow>
        <torusGeometry args={[0.032, 0.008, 16, 32]} />
      </mesh>
      <mesh position={[dir * 0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={earCenterMat}>
        <cylinderGeometry args={[0.03, 0.03, 0.005, 32]} />
      </mesh>
      <group position={[dir * 0.015, 0.035, 0]} rotation={[-0.4, 0, 0]}>
        <mesh position={[0, 0.01, 0]} material={antennaBaseMat}>
          <cylinderGeometry args={[0.006, 0.008, 0.02, 16]} />
        </mesh>
        <mesh position={[0, 0.06, 0]} material={antennaStickMat}>
          <cylinderGeometry args={[0.003, 0.003, 0.1, 8]} />
        </mesh>
        <mesh position={[0, 0.11, 0]} material={antennaTipMat}>
          <sphereGeometry args={[0.008, 16, 16]} />
        </mesh>
      </group>
    </group>
  );
}

/* -------- Angry materials -------- */
const angryMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color("#ff3b3b").multiplyScalar(2.2),
  toneMapped: false,
});
const angryGlowMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color("#ff5555").multiplyScalar(1.6),
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
});

/* -------- Eye (blinking + heart + dizzy + angry) -------- */
function RobotEye({
  position,
  isLovedRef,
  isDizzyRef,
  isAngryRef,
  spinDir = 1,
  browTilt = 1,
}: {
  position: [number, number, number];
  isLovedRef: React.MutableRefObject<boolean>;
  isDizzyRef: React.MutableRefObject<boolean>;
  isAngryRef: React.MutableRefObject<boolean>;
  spinDir?: 1 | -1;
  browTilt?: 1 | -1;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const normalRef = useRef<THREE.Mesh>(null);
  const heartRef = useRef<THREE.Group>(null);
  const spiralRef = useRef<THREE.Group>(null);
  const angryRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !normalRef.current || !heartRef.current || !spiralRef.current || !angryRef.current) return;
    const isAngry = isAngryRef.current;
    const isHeart = isLovedRef.current && !isAngry;
    const isDizzy = isDizzyRef.current && !isHeart && !isAngry;
    normalRef.current.visible = !isHeart && !isDizzy && !isAngry;
    heartRef.current.visible = isHeart;
    spiralRef.current.visible = isDizzy;
    angryRef.current.visible = isAngry;

    if (isDizzy) {
      spiralRef.current.rotation.z += spinDir * delta * 6.5;
    }

    const cycle = clock.getElapsedTime() % 3.5;
    let sy = 1;
    if (cycle < 0.15 && !isHeart && !isDizzy && !isAngry) {
      const p = cycle / 0.15;
      sy = Math.max(0.05, 1 - Math.sin(p * Math.PI));
    }
    groupRef.current.scale.set(1, sy, 1);
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={normalRef} material={eyeMat}>
        <capsuleGeometry args={[0.011, 0.055, 8, 16]} />
      </mesh>
      <group ref={heartRef} visible={false} position={[0, -0.012, 0.024]}>
        <mesh material={heartGlowMat} renderOrder={20}>
          <tubeGeometry args={[heartCurve, 96, 0.007, 12, true]} />
        </mesh>
        <mesh material={heartMat} renderOrder={21}>
          <tubeGeometry args={[heartCurve, 96, 0.0036, 12, true]} />
        </mesh>
      </group>
      <group ref={spiralRef} visible={false} position={[0, 0, 0.024]}>
        <mesh material={heartGlowMat} renderOrder={20}>
          <tubeGeometry args={[spiralCurve, 160, 0.006, 10, false]} />
        </mesh>
        <mesh material={heartMat} renderOrder={21}>
          <tubeGeometry args={[spiralCurve, 160, 0.003, 10, false]} />
        </mesh>
      </group>
      {/* angry: slanted brow + squinted eye */}
      <group ref={angryRef} visible={false} position={[0, 0, 0.024]}>
        {/* squinted eye (short slash) */}
        <mesh material={angryMat} rotation={[0, 0, (Math.PI / 2) + browTilt * 0.35]}>
          <capsuleGeometry args={[0.009, 0.05, 6, 12]} />
        </mesh>
        {/* angry brow above */}
        <mesh position={[0, 0.038, 0.001]} rotation={[0, 0, browTilt * -0.55]} material={angryMat}>
          <boxGeometry args={[0.075, 0.012, 0.01]} />
        </mesh>
        <mesh position={[0, 0.038, 0.001]} rotation={[0, 0, browTilt * -0.55]} material={angryGlowMat}>
          <boxGeometry args={[0.095, 0.022, 0.012]} />
        </mesh>
      </group>
    </group>
  );
}

/* -------- Robot -------- */
function Robot({ lookTargetRef }: { lookTargetRef: React.MutableRefObject<{ x: number; y: number } | null> }) {
  const isLovedRef = useRef(false);
  const isDizzyRef = useRef(false);
  const isAngryRef = useRef(false);
  const angryUntilRef = useRef(0);
  const clickTimesRef = useRef<number[]>([]);
  const angryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dizzyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const cursor = useRef({ x: 0, y: 0 });

  // Detect fast/jittery mouse movement -> dizzy spirals for a moment
  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let lastT = performance.now();
    let energy = 0;
    let initialized = false;
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      const dt = Math.max(16, now - lastT);
      if (initialized) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt; // px/ms
        // decay + accumulate
        energy = energy * 0.85 + speed;
        if (energy > 18) {
          isDizzyRef.current = true;
          if (dizzyTimeoutRef.current) clearTimeout(dizzyTimeoutRef.current);
          dizzyTimeoutRef.current = setTimeout(() => {
            isDizzyRef.current = false;
            energy = 0;
          }, 1400);
        }
      }
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
      initialized = true;
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (dizzyTimeoutRef.current) clearTimeout(dizzyTimeoutRef.current);
    };
  }, []);


  useFrame((state, delta) => {
    if (!bodyRef.current || !headRef.current) return;
    const dt = Math.min(delta, 0.1);

    // pick either external look target or pointer
    const ext = lookTargetRef.current;
    const tx = ext ? ext.x : state.pointer.x;
    const ty = ext ? ext.y : state.pointer.y;

    cursor.current.x = THREE.MathUtils.lerp(cursor.current.x, tx, 6 * dt);
    cursor.current.y = THREE.MathUtils.lerp(cursor.current.y, ty, 6 * dt);

    const cx = cursor.current.x;
    const cy = cursor.current.y;

    bodyRef.current.rotation.y = THREE.MathUtils.lerp(bodyRef.current.rotation.y, -cx * 0.55, 8 * dt);
    bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, -cy * 0.2, 8 * dt);
    bodyRef.current.rotation.z = THREE.MathUtils.lerp(bodyRef.current.rotation.z, -cx * 0.08, 8 * dt);

    headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, cx * 1.1, 12 * dt);
    headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -cy * 0.35, 12 * dt);

    // idle float
    bodyRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.4) * 0.02;

    // angry shake
    if (isAngryRef.current) {
      const t = state.clock.elapsedTime * 42;
      headRef.current.rotation.z += Math.sin(t) * 0.09;
      headRef.current.position.x = Math.sin(t * 1.1) * 0.015;
    } else {
      headRef.current.position.x = THREE.MathUtils.lerp(headRef.current.position.x, 0, 8 * dt);
    }
  });

  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const now = performance.now();
    // track clicks in the last 1.2s
    clickTimesRef.current = clickTimesRef.current.filter((t) => now - t < 1200);
    clickTimesRef.current.push(now);

    if (clickTimesRef.current.length >= 3) {
      // enter angry mode
      isAngryRef.current = true;
      isLovedRef.current = false;
      angryUntilRef.current = now + 2200;
      if (angryTimeoutRef.current) clearTimeout(angryTimeoutRef.current);
      angryTimeoutRef.current = setTimeout(() => {
        isAngryRef.current = false;
        clickTimesRef.current = [];
      }, 2200);
      return;
    }

    if (isAngryRef.current) return;
    isLovedRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      isLovedRef.current = false;
    }, 2000);
  };

  return (
    <group
      ref={bodyRef}
      onPointerDown={handleDown}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      {/* body - spherical shape */}
      <mesh position={[0, -0.05, 0]} castShadow receiveShadow material={bodyMat}>
        <sphereGeometry args={[0.42, 64, 64]} />
      </mesh>
      {/* soft cyan glow at chest */}
      <mesh position={[0, 0, 0.4]}>
        <circleGeometry args={[0.08, 32]} />
        <primitive object={screenGlowMat} attach="material" />
      </mesh>

      {/* neck ring */}
      <mesh position={[0, 0.4, 0]} material={neckMat}>
        <cylinderGeometry args={[0.2, 0.22, 0.05, 48]} />
      </mesh>

      {/* head */}
      <group ref={headRef} position={[0, 0.62, 0]}>
        <mesh castShadow material={headMat}>
          <sphereGeometry args={[0.24, 64, 64]} />
        </mesh>
        {/* face screen (subtle cyan curved shine) */}
        <mesh position={[0, 0.02, 0.19]} rotation={[0, 0, 0]}>
          <sphereGeometry args={[0.16, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
          <meshBasicMaterial
            color={MKR_BLUE}
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {/* eyes */}
        <RobotEye position={[-0.06, 0.02, 0.23]} isLovedRef={isLovedRef} isDizzyRef={isDizzyRef} isAngryRef={isAngryRef} spinDir={1} browTilt={1} />
        <RobotEye position={[0.06, 0.02, 0.23]} isLovedRef={isLovedRef} isDizzyRef={isDizzyRef} isAngryRef={isAngryRef} spinDir={-1} browTilt={-1} />
        {/* ears */}
        <RobotEar position={[-0.23, 0, 0]} isLeft />
        <RobotEar position={[0.23, 0, 0]} />
      </group>
    </group>
  );
}

/* -------- Responsive wrapper -------- */
function Fit({ children }: { children: React.ReactNode }) {
  const { viewport } = useThree();
  const scale = Math.min(2.1, viewport.width / 1.7);
  return <group scale={scale} position={[0, -0.35, 0]}>{children}</group>;
}

/* -------- Public component -------- */
export interface MkrRobotProps {
  /** External "look at" target in normalized [-1..1] space (x right, y up). null => follow cursor */
  lookAt?: { x: number; y: number } | null;
  className?: string;
}

export default function MkrRobot({ lookAt = null, className }: MkrRobotProps) {
  const lookRef = useRef<{ x: number; y: number } | null>(lookAt);
  useEffect(() => {
    lookRef.current = lookAt;
  }, [lookAt]);

  const [enabled, setEnabled] = useState(true);
  const [showJade, setShowJade] = useState(false);
  useEffect(() => {
    const sequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight"];
    let idx = 0;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === sequence[idx]) {
        idx++;
        if (idx === sequence.length) {
          idx = 0;
          setShowJade(true);
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = setTimeout(() => setShowJade(false), 4000);
        }
      } else {
        idx = e.key === sequence[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setEnabled(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const jadeOverlay = showJade && typeof document !== "undefined" ? createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle, rgba(34,211,238,0.25), rgba(0,0,0,0.85))",
        pointerEvents: "none",
        animation: "fade-in 0.4s ease-out",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(3rem, 14vw, 12rem)",
          fontWeight: 900,
          color: "#22d3ee",
          textShadow: "0 0 40px #22d3ee, 0 0 80px #1e88ff",
          textAlign: "center",
          letterSpacing: "0.05em",
          animation: "scale-in 0.5s ease-out",
          margin: 0,
        }}
      >
        JADE<br />MÃE DO ROBÔ
      </h1>
    </div>,
    document.body
  ) : null;

  if (!enabled) {
    return <>{jadeOverlay}</>;
  }


  return (
    <div className={className} style={{ width: "100%", height: "100%", overflow: "visible" }}>
      {jadeOverlay}
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [0, 0.35, 4.2], fov: 34 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
        style={{ background: "transparent", overflow: "visible" }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[-3, 2.5, 2]} intensity={0.9} color="#7ec8ff" castShadow />
        <directionalLight position={[2.5, 2.8, -1.5]} intensity={0.7} color={MKR_CYAN} />
        <directionalLight position={[0, -1, 2]} intensity={0.25} color={MKR_BLUE} />
        <pointLight position={[0, 0.3, 1.6]} intensity={0.35} color={MKR_CYAN} />
        <Fit>
          <Robot lookTargetRef={lookRef} />
          <ContactShadows position={[0, -0.9, 0]} opacity={0.45} scale={2.4} blur={2.6} far={1.5} color="#0a1a3a" />
        </Fit>
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
