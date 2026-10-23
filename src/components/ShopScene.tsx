import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

/** Scroll progress 0..1 shared by the page. */
export type Progress = { current: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Map progress p from [a,b] into 0..1 with smoothstep easing. */
const seg = (p: number, a: number, b: number) => {
  const t = clamp01((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (cur: number, target: number, k: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-k * Math.min(dt, 0.05)));

function useCanvasTexture(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number, repeat: [number, number] = [1, 1]) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d")!, w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ---------- Shutter: rolls up into a drum as you scroll ---------- */
function Shutter({ progress }: { progress: Progress }) {
  const panel = useRef<THREE.Mesh>(null);
  const tex = useCanvasTexture((g, w, h) => {
    for (let y = 0; y < h; y += 16) {
      const grd = g.createLinearGradient(0, y, 0, y + 16);
      grd.addColorStop(0, "#b8bdbf"); grd.addColorStop(0.6, "#8d9396"); grd.addColorStop(1, "#5a5f62");
      g.fillStyle = grd; g.fillRect(0, y, w, 16);
    }
    // rust & graffiti speckle
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${120 + Math.random() * 60},${60 + Math.random() * 30},30,${Math.random() * 0.25})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 1 + Math.random() * 3);
    }
    g.fillStyle = "rgba(194,69,45,0.85)"; g.font = "bold 22px sans-serif";
    g.fillText("KIRANA", 40, 120); g.fillText("STORE", 46, 150);
  }, 256, 256, [2, 1]);
  const H = 3.2;
  useFrame(() => {
    const open = seg(progress.current, 0.02, 0.22);
    if (!panel.current) return;
    const vis = Math.max(0.001, 1 - open);
    panel.current.scale.y = vis;
    panel.current.position.y = 3.2 - (H * vis) / 2;
    tex.repeat.y = vis;
    tex.offset.y = 1 - vis;
  });
  return (
    <group position={[0, 0, 1.05]}>
      <mesh ref={panel} castShadow>
        <boxGeometry args={[5.6, H, 0.05]} />
        <meshStandardMaterial map={tex} metalness={0.55} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.25, 0.05]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.18, 0.18, 5.7, 20]} />
        <meshStandardMaterial color="#6b7073" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ---------- Shop interior ---------- */
const PRODUCT_COLORS = ["#e8a33d", "#c2452d", "#5b8c3a", "#f2d16b", "#8a4b2a", "#d96f32", "#2d6fb0", "#f4efe2"];

function Shelf({ x }: { x: number }) {
  const items = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number]; c: string; jar: boolean }[] = [];
    [0.55, 1.25, 1.95, 2.6].forEach((y, r) => {
      let cx = -0.68;
      while (cx < 0.62) {
        const w = 0.14 + Math.random() * 0.12;
        const hgt = 0.22 + Math.random() * 0.22;
        out.push({ p: [cx + w / 2, y + hgt / 2, 0.22], s: [w * 0.9, hgt, 0.16], c: PRODUCT_COLORS[(out.length * 3 + r) % PRODUCT_COLORS.length]!, jar: Math.random() < 0.25 });
        cx += w;
      }
    });
    return out;
  }, []);
  return (
    <group position={[x, 0, -0.6]}>
      <mesh position={[0, 1.4, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 2.9, 0.4]} />
        <meshStandardMaterial color="#5e3a1e" roughness={0.85} />
      </mesh>
      {[0.53, 1.23, 1.93, 2.58].map((y) => (
        <mesh key={y} position={[0, y, 0.2]} castShadow><boxGeometry args={[1.6, 0.04, 0.45]} /><meshStandardMaterial color="#8a5a33" roughness={0.7} /></mesh>
      ))}
      {items.map((it, i) =>
        it.jar ? (
          <mesh key={i} position={it.p} castShadow>
            <cylinderGeometry args={[it.s[0] / 2, it.s[0] / 2, it.s[1], 14]} />
            <meshPhysicalMaterial color={it.c} roughness={0.15} transmission={0.4} thickness={0.2} />
          </mesh>
        ) : (
          <mesh key={i} position={it.p} castShadow>
            <boxGeometry args={it.s} />
            <meshStandardMaterial color={it.c} roughness={0.55} />
          </mesh>
        ),
      )}
    </group>
  );
}

function Crate({ p, fruit }: { p: [number, number, number]; fruit: string }) {
  const fruits = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ x: -0.28 + (i % 4) * 0.19 + (Math.random() - 0.5) * 0.04, z: -0.15 + Math.floor(i / 4) * 0.15, y: 0.25 + Math.random() * 0.05, s: 0.085 + Math.random() * 0.025 })), []);
  return (
    <group position={p}>
      {[-0.15, 0, 0.15].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow><boxGeometry args={[0.82, 0.1, 0.56]} /><meshStandardMaterial color="#b07a44" roughness={0.95} /></mesh>
      ))}
      {fruits.map((f, i) => (
        <mesh key={i} position={[f.x, f.y, f.z]} castShadow>
          <sphereGeometry args={[f.s, 14, 10]} />
          <meshStandardMaterial color={fruit} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- People ---------- */
function Person({
  shirt, apron, bag, phase = 0, wave, path, progress,
}: {
  shirt: string; apron?: boolean; bag?: boolean; phase?: number; wave?: [number, number];
  path: { from: [number, number, number]; to: [number, number, number]; range: [number, number] };
  progress: Progress;
}) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Mesh | null)[]>([]);
  const last = useRef(0);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + phase;
    const p = progress.current;
    const k = seg(p, path.range[0], path.range[1]);
    if (root.current) {
      const g = root.current;
      const tx = THREE.MathUtils.lerp(path.from[0], path.to[0], k);
      const tz = THREE.MathUtils.lerp(path.from[2], path.to[2], k);
      const prevX = g.position.x, prevZ = g.position.z;
      g.position.x = damp(g.position.x, tx, 5, dt);
      g.position.z = damp(g.position.z, tz, 5, dt);
      const speed = Math.hypot(g.position.x - prevX, g.position.z - prevZ) / Math.max(dt, 1e-3);
      last.current = damp(last.current, Math.min(speed, 1.5), 8, dt);
      if (speed > 0.05) g.rotation.y = damp(g.rotation.y, Math.atan2(tx - prevX, tz - prevZ), 6, dt);
      else g.rotation.y = damp(g.rotation.y, Math.atan2(-g.position.x * 0.3, -1), 2, dt);
    }
    const walk = last.current;
    legs.current.forEach((l, i) => { if (l) l.rotation.x = Math.sin(t * 9 + i * Math.PI) * 0.5 * walk; });
    if (body.current) {
      body.current.scale.y = 1 + Math.sin(t * 2) * 0.015;
      body.current.position.y = Math.abs(Math.sin(t * 9)) * 0.05 * walk;
    }
    if (head.current) head.current.rotation.y = Math.sin(t * 0.7) * 0.3;
    if (armR.current) {
      const w = wave ? seg(p, wave[0], wave[0] + 0.04) * (1 - seg(p, wave[1] - 0.04, wave[1])) : 0;
      armR.current.rotation.z = -w * 2.6 + Math.sin(t * 8) * 0.35 * w;
      armR.current.rotation.x = Math.sin(t * 9) * 0.4 * walk;
    }
  });
  return (
    <group ref={root} position={path.from}>
      <group ref={body}>
        <mesh position={[0, 0.95, 0]} castShadow><capsuleGeometry args={[0.26, 0.6, 6, 16]} /><meshStandardMaterial color={shirt} roughness={0.8} /></mesh>
        {apron && <mesh position={[0, 0.82, 0.24]}><boxGeometry args={[0.4, 0.62, 0.03]} /><meshStandardMaterial color="#2f5d3a" roughness={0.9} /></mesh>}
        {[-0.11, 0.11].map((x, i) => (
          <group key={x} position={[x, 0.55, 0]}>
            <mesh ref={(m) => { legs.current[i] = m; }} position={[0, 0, 0]}>
              <capsuleGeometry args={[0.085, 0.42, 4, 8]} />
              <meshStandardMaterial color="#3a2f2a" roughness={0.9} />
            </mesh>
          </group>
        ))}
        <mesh position={[-0.33, 0.95, 0]} rotation-z={0.15} castShadow><capsuleGeometry args={[0.07, 0.45, 4, 8]} /><meshStandardMaterial color={shirt} roughness={0.8} /></mesh>
        <group ref={armR} position={[0.32, 1.22, 0]}>
          <mesh position={[0, -0.27, 0]} castShadow><capsuleGeometry args={[0.07, 0.45, 4, 8]} /><meshStandardMaterial color={shirt} roughness={0.8} /></mesh>
          <mesh position={[0, -0.58, 0]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color="#b97a4f" /></mesh>
          {bag && <mesh position={[0.02, -0.78, 0]} castShadow><boxGeometry args={[0.26, 0.32, 0.14]} /><meshStandardMaterial color="#efe0b4" roughness={0.95} /></mesh>}
        </group>
      </group>
      <group ref={head} position={[0, 1.68, 0]}>
        <mesh castShadow><sphereGeometry args={[0.22, 24, 18]} /><meshStandardMaterial color="#b97a4f" roughness={0.6} /></mesh>
        <mesh position={[0, 0.1, -0.03]}><sphereGeometry args={[0.225, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.2]} /><meshStandardMaterial color="#1e1612" roughness={0.7} /></mesh>
        {[-0.075, 0.075].map((x) => (
          <mesh key={x} position={[x, 0.02, 0.2]}><sphereGeometry args={[0.022, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
        ))}
        <mesh position={[0, -0.07, 0.195]} rotation-z={Math.PI}><torusGeometry args={[0.055, 0.011, 6, 12, Math.PI]} /><meshStandardMaterial color="#5a1f1a" /></mesh>
      </group>
    </group>
  );
}

/* ---------- Lights that flicker on ---------- */
function ShopLights({ progress }: { progress: Progress }) {
  const tube = useRef<THREE.MeshStandardMaterial>(null);
  const point = useRef<THREE.PointLight>(null);
  const sign = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const p = progress.current;
    const on = seg(p, 0.2, 0.32);
    // tube-light flicker while switching on
    const flick = on > 0 && on < 1 ? (Math.sin(clock.elapsedTime * 60) > 0.2 ? 1 : 0.15) : 1;
    const v = on * flick;
    if (tube.current) tube.current.emissiveIntensity = 0.1 + v * 3;
    if (point.current) point.current.intensity = v * 9;
    if (sign.current) sign.current.emissiveIntensity = 0.05 + seg(p, 0.28, 0.36) * 0.9;
  });
  return (
    <>
      <mesh position={[0, 3.05, -0.2]}>
        <boxGeometry args={[2.4, 0.06, 0.06]} />
        <meshStandardMaterial ref={tube} color="#fff6e0" emissive="#fff1cc" emissiveIntensity={0.1} />
      </mesh>
      <pointLight ref={point} position={[0, 2.6, 0.4]} intensity={0} distance={7} decay={1.6} color="#ffd59a" castShadow shadow-mapSize={[512, 512]} />
      <mesh position={[0, 3.6, 1.42]}>
        <boxGeometry args={[4.4, 0.45, 0.02]} />
        <meshStandardMaterial ref={sign} color="#f2b632" emissive="#f2a020" emissiveIntensity={0.05} />
      </mesh>
    </>
  );
}

/* ---------- Coins & receipts that fly into the ledger ---------- */
function LedgerFlow({ progress }: { progress: Progress }) {
  const items = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      start: new THREE.Vector3((Math.random() - 0.5) * 9, 2 + Math.random() * 3, 1 + Math.random() * 3),
      coin: i % 3 !== 0,
      delay: (i / 14) * 0.12,
      spin: Math.random() * 3 + 1,
    })),
    [],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const book = useRef<THREE.Group>(null);
  const target = new THREE.Vector3(0, 1.1, 0.35);
  const tmp = new THREE.Vector3();
  useFrame(({ clock, pointer }) => {
    const p = progress.current;
    const t = clock.elapsedTime;
    items.forEach((it, i) => {
      const m = refs.current[i];
      if (!m) return;
      const appear = seg(p, 0.5 + it.delay * 0.5, 0.58 + it.delay * 0.5);
      const fly = seg(p, 0.72 + it.delay, 0.82 + it.delay);
      tmp.copy(it.start);
      tmp.x += pointer.x * 0.6 + Math.sin(t * it.spin) * 0.08;
      tmp.y += pointer.y * 0.3 + Math.sin(t * 1.3 + i) * 0.15;
      tmp.lerp(target, fly);
      m.position.copy(tmp);
      m.rotation.y = t * it.spin;
      const s = appear * (1 - fly * 0.85);
      m.scale.setScalar(Math.max(0.001, s));
    });
    if (book.current) {
      const open = seg(p, 0.66, 0.74);
      (book.current.children[1] as THREE.Object3D).rotation.z = -open * Math.PI * 0.95;
      book.current.scale.setScalar(0.001 + seg(p, 0.6, 0.66));
    }
  });
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m; }} rotation-x={it.coin ? Math.PI / 2 : 0}>
          {it.coin ? <cylinderGeometry args={[0.22, 0.22, 0.05, 28]} /> : <planeGeometry args={[0.38, 0.6]} />}
          {it.coin
            ? <meshStandardMaterial color="#f2b632" metalness={0.95} roughness={0.22} emissive="#8a5500" emissiveIntensity={0.35} />
            : <meshStandardMaterial color="#fffaf0" emissive="#ffe9b0" emissiveIntensity={0.3} side={THREE.DoubleSide} />}
        </mesh>
      ))}
      <group ref={book} position={[0, 1.04, 0.35]}>
        <mesh position={[0.25, 0, 0]}><boxGeometry args={[0.5, 0.04, 0.6]} /><meshStandardMaterial color="#fdf6e3" /></mesh>
        <group position={[0, 0.02, 0]}>
          <mesh position={[0.25, 0, 0]}><boxGeometry args={[0.5, 0.03, 0.6]} /><meshStandardMaterial color="#9b1d1d" roughness={0.6} /></mesh>
        </group>
      </group>
    </>
  );
}

/* ---------- Camera dolly ---------- */
function CameraRig({ progress }: { progress: Progress }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(2.6, 1, 0));
  useFrame(({ pointer }, dt) => {
    const p = progress.current;
    const a = seg(p, 0, 0.45);
    const b = seg(p, 0.6, 0.95);
    // wide street → mid → close on counter
    const x = THREE.MathUtils.lerp(THREE.MathUtils.lerp(-1.5, 0.2, a), 0.8, b) + pointer.x * 0.4;
    const y = THREE.MathUtils.lerp(THREE.MathUtils.lerp(2.8, 1.9, a), 1.6, b) + pointer.y * 0.2;
    const z = THREE.MathUtils.lerp(THREE.MathUtils.lerp(13, 10.5, a), 5.2, b);
    camera.position.set(damp(camera.position.x, x, 4, dt), damp(camera.position.y, y, 4, dt), damp(camera.position.z, z, 4, dt));
    const lx = THREE.MathUtils.lerp(0.4, 1.2, b);
    const ly = THREE.MathUtils.lerp(0.9, 0.0, b);
    look.current.set(damp(look.current.x, lx, 4, dt), damp(look.current.y, ly, 4, dt), 0);
    camera.lookAt(look.current);
  });
  return null;
}

function Sky({ progress }: { progress: Progress }) {
  const fog = useRef<THREE.Fog>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const dawn = new THREE.Color("#2a1a14"), day = new THREE.Color("#7a4a2a");
  const c = new THREE.Color();
  useFrame(({ scene }) => {
    const k = seg(progress.current, 0, 0.5);
    c.copy(dawn).lerp(day, k);
    if (fog.current) fog.current.color.copy(c);
    if (scene.background instanceof THREE.Color) scene.background.copy(c);
    if (hemi.current) hemi.current.intensity = 0.25 + k * 0.5;
  });
  return (
    <>
      <color attach="background" args={["#2a1a14"]} />
      <fog ref={fog} attach="fog" args={["#2a1a14", 11, 26]} />
      <hemisphereLight ref={hemi} args={["#ffd7a0", "#3a2418", 0.3]} />
    </>
  );
}

export default function ShopScene({ progress }: { progress: Progress }) {
  const ground = useCanvasTexture((g, w, h) => {
    g.fillStyle = "#5c4836"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const v = 70 + Math.random() * 40;
      g.fillStyle = `rgba(${v + 20},${v},${v - 20},0.35)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.strokeStyle = "rgba(30,20,12,0.5)"; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }, 256, 256, [8, 4]);
  const wall = useCanvasTexture((g, w, h) => {
    g.fillStyle = "#e9cf98"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,80,40,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
  }, 128, 128, [3, 2]);

  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [-1.5, 2.8, 13], fov: 40 }}>
      <Sky progress={progress} />
      <CameraRig progress={progress} />
      <directionalLight position={[6, 9, 7]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} color="#ffcf98" />
      <Environment resolution={64}>
        <Lightformer intensity={1.5} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={0.8} color="#ffcf8a" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
      <group position={[2.6, -1.6, 0]} rotation-y={-0.25}>
        <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, 0, 2]}>
          <planeGeometry args={[32, 14]} />
          <meshStandardMaterial map={ground} roughness={1} />
        </mesh>
        <mesh position={[0, 1.7, -1]} receiveShadow><boxGeometry args={[6.4, 3.4, 0.2]} /><meshStandardMaterial map={wall} roughness={0.95} /></mesh>
        <mesh position={[0, 0.02, 0]} receiveShadow rotation-x={-Math.PI / 2}><planeGeometry args={[5.8, 2.2]} /><meshStandardMaterial color="#8c6a4a" roughness={0.8} /></mesh>
        <mesh position={[-3.05, 1.7, 0]} castShadow><boxGeometry args={[0.3, 3.4, 2.2]} /><meshStandardMaterial color="#b23f28" roughness={0.8} /></mesh>
        <mesh position={[3.05, 1.7, 0]} castShadow><boxGeometry args={[0.3, 3.4, 2.2]} /><meshStandardMaterial color="#b23f28" roughness={0.8} /></mesh>
        <mesh position={[0, 3.6, 0.2]} castShadow><boxGeometry args={[6.6, 0.7, 2.4]} /><meshStandardMaterial color="#2f5d3a" roughness={0.8} /></mesh>
        {Array.from({ length: 11 }).map((_, i) => (
          <mesh key={i} position={[-3 + i * 0.6, 3.15, 1.55]} rotation-x={0.5} castShadow>
            <boxGeometry args={[0.6, 0.04, 0.7]} />
            <meshStandardMaterial color={i % 2 ? "#fff3d6" : "#c2452d"} roughness={0.9} />
          </mesh>
        ))}
        <ShopLights progress={progress} />
        <Shelf x={-1.9} />
        <Shelf x={1.9} />
        <mesh position={[0, 0.5, 0.3]} castShadow receiveShadow><boxGeometry args={[2.2, 1, 0.7]} /><meshStandardMaterial color="#7a4c2a" roughness={0.75} /></mesh>
        <mesh position={[0, 1.01, 0.3]} receiveShadow><boxGeometry args={[2.3, 0.04, 0.8]} /><meshStandardMaterial color="#3d2a1c" roughness={0.4} /></mesh>
        {/* weighing scale */}
        <mesh position={[-0.7, 1.1, 0.35]} castShadow><boxGeometry args={[0.35, 0.12, 0.3]} /><meshStandardMaterial color="#d8dcdd" metalness={0.6} roughness={0.3} /></mesh>
        <Person shirt="#e8d4b0" apron phase={0} wave={[0.36, 0.56]} progress={progress}
          path={{ from: [0, 0.1, -0.35], to: [0, 0.1, -0.35], range: [0, 1] }} />
        <Shutter progress={progress} />
        <Crate p={[-2.2, 0.2, 1.7]} fruit="#d93b2b" />
        <Crate p={[-1.3, 0.2, 1.9]} fruit="#f2a531" />
        <Crate p={[2.0, 0.2, 1.8]} fruit="#7ab648" />
        <Person shirt="#c96f9a" bag phase={1.3} progress={progress}
          path={{ from: [-7, 0, 4], to: [-0.7, 0, 1.4], range: [0.32, 0.55] }} />
        <Person shirt="#3f72af" bag phase={2.4} progress={progress}
          path={{ from: [8, 0, 4.5], to: [0.8, 0, 1.5], range: [0.38, 0.62] }} />
        <LedgerFlow progress={progress} />
        <ContactShadows position={[0, 0.01, 2]} opacity={0.5} scale={14} blur={2.5} far={4} />
      </group>
    </Canvas>
  );
}
