import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows, useGLTF, useAnimations } from "@react-three/drei";
import { useRef, useMemo, Suspense } from "react";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import { shopFraming } from "@/lib/shop-framing";

/** Scroll progress 0..1 shared by the page. */
export type Progress = { current: number; reduced?: boolean };
/** When true (reduced motion), everything jumps straight to its target. */
let SNAP = false;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Map progress p from [a,b] into 0..1 with smoothstep easing. */
const seg = (p: number, a: number, b: number) => {
  const t = clamp01((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (cur: number, target: number, k: number, dt: number) =>
  SNAP ? target : cur + (target - cur) * (1 - Math.exp(-k * Math.min(dt, 0.05)));
function SnapSync({ progress }: { progress: Progress }) {
  useFrame(() => { SNAP = !!progress.reduced; });
  return null;
}

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
const BRANDS = [
  { bg: "#c2452d", fg: "#fff3d6", t: "ATTA" }, { bg: "#f2c230", fg: "#8a1c1c", t: "DAL" },
  { bg: "#2d6fb0", fg: "#ffffff", t: "SURF" }, { bg: "#3f8f3a", fg: "#fff6c8", t: "CHAI" },
  { bg: "#f4efe2", fg: "#c2452d", t: "SALT" }, { bg: "#e07a2a", fg: "#ffffff", t: "BISK" },
  { bg: "#6b2f8a", fg: "#ffe9a8", t: "CHOC" }, { bg: "#1f4f3a", fg: "#f2c230", t: "OIL" },
];

/** One canvas atlas of packaged-goods labels, sliced via UV offsets per box. */
function useLabelAtlas() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 64;
    const g = c.getContext("2d")!;
    BRANDS.forEach((b, i) => {
      const x = i * 64;
      g.fillStyle = b.bg; g.fillRect(x, 0, 64, 64);
      g.fillStyle = b.fg; g.fillRect(x, 40, 64, 6);
      g.beginPath(); g.arc(x + 32, 22, 12, 0, Math.PI * 2); g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1;
      g.fillStyle = b.bg; g.font = "bold 9px sans-serif"; g.textAlign = "center"; g.fillText(b.t, x + 32, 25);
      g.fillStyle = b.fg; g.font = "bold 10px sans-serif"; g.fillText(b.t, x + 32, 58);
    });
    return BRANDS.map((_, i) => {
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.repeat.set(1 / BRANDS.length, 1);
      t.offset.set(i / BRANDS.length, 0);
      return t;
    });
  }, []);
}

function Shelf({ x }: { x: number }) {
  const labels = useLabelAtlas();
  const items = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number]; b: number; jar: boolean }[] = [];
    let seed = Math.abs(Math.round(x * 97)) + 13;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    [0.55, 1.25, 1.95, 2.6].forEach((y) => {
      let cx = -0.7;
      const brand = Math.floor(rnd() * BRANDS.length);
      while (cx < 0.6) {
        const w = 0.13 + rnd() * 0.05;
        const hgt = 0.26 + rnd() * 0.14;
        // products are stocked in runs of the same brand, like a real shelf
        out.push({ p: [cx + w / 2, y + hgt / 2, 0.22], s: [w * 0.92, hgt, 0.16], b: (brand + Math.floor((cx + 0.7) / 0.45)) % BRANDS.length, jar: rnd() < 0.15 });
        cx += w;
      }
    });
    return out;
  }, [x]);
  return (
    <group position={[x, 0, -0.6]}>
      <mesh position={[0, 1.4, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 2.9, 0.4]} />
        <meshStandardMaterial color="#4a2e18" roughness={0.85} />
      </mesh>
      {[0.53, 1.23, 1.93, 2.58].map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0.2]} castShadow receiveShadow><boxGeometry args={[1.6, 0.04, 0.45]} /><meshStandardMaterial color="#8a5a33" roughness={0.7} /></mesh>
          {/* price strip */}
          <mesh position={[0, y - 0.035, 0.43]}><boxGeometry args={[1.6, 0.05, 0.01]} /><meshStandardMaterial color="#f4efe2" roughness={0.6} /></mesh>
        </group>
      ))}
      {items.map((it, i) =>
        it.jar ? (
          <mesh key={i} position={it.p} castShadow>
            <cylinderGeometry args={[it.s[0] / 2, it.s[0] / 2, it.s[1], 16]} />
            <meshPhysicalMaterial color="#e8c070" roughness={0.1} transmission={0.5} thickness={0.2} />
          </mesh>
        ) : (
          <mesh key={i} position={it.p} castShadow>
            <boxGeometry args={it.s} />
            <meshStandardMaterial map={labels[it.b] ?? null} roughness={0.5} />
          </mesh>
        ),
      )}
    </group>
  );
}

/** Jute sacks of rice / dal / sugar with open tops, as in front of most kiranas. */
function Sack({ p, grain }: { p: [number, number, number]; grain: string }) {
  const jute = useCanvasTexture((g, w, h) => {
    g.fillStyle = "#b8955e"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90,60,30,0.35)";
    for (let i = 0; i < w; i += 3) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
    for (let i = 0; i < h; i += 3) { g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }, 64, 64, [4, 2]);
  return (
    <group position={p}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.28, 0.6, 18, 1, true]} />
        <meshStandardMaterial map={jute} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.62, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.25, 0.05, 8, 20]} />
        <meshStandardMaterial map={jute} roughness={1} />
      </mesh>
      <mesh position={[0, 0.56, 0]} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[0.235, 18, 10]} />
        <meshStandardMaterial color={grain} roughness={0.95} />
      </mesh>
    </group>
  );
}

/** Strips of snack sachets hanging from the shop front. */
function SnackStrip({ x, color }: { x: number; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current && !SNAP) ref.current.rotation.z = Math.sin(clock.elapsedTime * 1.2 + x * 3) * 0.04;
  });
  return (
    <group ref={ref} position={[x, 3.0, 1.2]}>
      <mesh position={[0, -0.45, 0]}><boxGeometry args={[0.01, 0.9, 0.01]} /><meshStandardMaterial color="#333" /></mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, -0.08 - i * 0.15, 0.01]} castShadow>
          <boxGeometry args={[0.16, 0.13, 0.025]} />
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Crate({ p, fruit }: { p: [number, number, number]; fruit: string }) {
  const fruits = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ x: -0.3 + (i % 4) * 0.2 + ((i * 37) % 7 - 3) * 0.01, z: -0.17 + Math.floor(i / 4) * 0.115, y: 0.24 + ((i * 13) % 5) * 0.012, s: 0.08 + ((i * 7) % 4) * 0.008 })), []);
  return (
    <group position={p}>
      {[-0.15, 0, 0.15].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow><boxGeometry args={[0.82, 0.1, 0.56]} /><meshStandardMaterial color="#b07a44" roughness={0.95} /></mesh>
      ))}
      {fruits.map((f, i) => (
        <mesh key={i} position={[f.x, f.y, f.z]} castShadow>
          <sphereGeometry args={[f.s, 16, 12]} />
          <meshPhysicalMaterial color={fruit} roughness={0.35} clearcoat={0.4} clearcoatRoughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- People (CC0 rigged Quaternius characters) ---------- */
const SKIN = "#9a6a48";
const GROCER = { White: "#f1ead8", LightBrown: "#efe6d0", Red_Dark: "#2f5d3a", LightBlue: "#e9e2cf" };
const WOMAN = { White: "#c94f7c", Grey: "#d9a441", Brown: "#5a2f2a", Orange: "#c94f7c" };
const MAN = { White: "#3f72af", LightBrown: "#3a3a40", Red_Dark: "#3f72af" };
const HEIGHT = 1.72;

function Person({
  model, outfit = {}, bag, phase = 0, wave, path, progress, standYaw,
}: {
  model: string; outfit?: Record<string, string>; bag?: boolean; phase?: number; wave?: [number, number];
  path: { from: [number, number, number]; to: [number, number, number]; range: [number, number] };
  progress: Progress; standYaw?: number;
}) {
  const root = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(model);
  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((mat) => {
        const n = (mat as THREE.MeshStandardMaterial).clone();
        if (n.name.startsWith("Skin")) n.color.set(SKIN);
        else if (n.name.startsWith("Hair") || n.name === "Eyebrows") n.color.set("#1a120d");
        else if (outfit[n.name]) n.color.set(outfit[n.name]!);
        n.roughness = Math.max(n.roughness, 0.7);
        return n;
      });
      m.material = Array.isArray(m.material) ? mats : mats[0]!;
    });
    const box = new THREE.Box3().setFromObject(c);
    const s = HEIGHT / Math.max(0.01, box.max.y - box.min.y);
    c.scale.setScalar(s);
    c.position.y = -box.min.y * s;
    return c;
  }, [scene, outfit]);
  const { actions } = useAnimations(animations, root);
  const current = useRef<string>("");
  const moving = useRef(0);

  const play = (name: string) => {
    if (current.current === name) return;
    const next = actions[name];
    if (!next) return;
    const prev = current.current ? actions[current.current] : null;
    next.reset().setEffectiveTimeScale(1).play();
    next.time = phase % Math.max(0.1, next.getClip().duration);
    if (prev) prev.crossFadeTo(next, SNAP ? 0 : 0.35, false);
    current.current = name;
  };

  useFrame((_, dt) => {
    const p = progress.current;
    const k = seg(p, path.range[0], path.range[1]);
    const g = root.current;
    if (!g) return;
    const tx = THREE.MathUtils.lerp(path.from[0], path.to[0], k);
    const tz = THREE.MathUtils.lerp(path.from[2], path.to[2], k);
    const prevX = g.position.x, prevZ = g.position.z;
    g.position.x = damp(g.position.x, tx, 3, dt);
    g.position.z = damp(g.position.z, tz, 3, dt);
    const speed = Math.hypot(g.position.x - prevX, g.position.z - prevZ) / Math.max(dt, 1e-3);
    moving.current = damp(moving.current, speed, 6, dt);
    if (speed > 0.05) g.rotation.y = damp(g.rotation.y, Math.atan2(tx - prevX, tz - prevZ), 6, dt);
    else g.rotation.y = damp(g.rotation.y, standYaw ?? Math.atan2(-g.position.x * 0.25, -1), 3, dt);
    const waving = wave && p > wave[0] && p < wave[1];
    if (SNAP) { play(waving ? "Wave" : "Idle"); Object.values(actions).forEach((a) => a && (a.paused = true)); return; }
    Object.values(actions).forEach((a) => a && (a.paused = false));
    play(moving.current > 0.15 ? "Walk" : waving ? "Wave" : "Idle");
  });

  return (
    <group ref={root} position={path.from}>
      <primitive object={clone} />
      {bag && (
        <mesh position={[0.32, 0.7, 0.05]} castShadow>
          <boxGeometry args={[0.26, 0.32, 0.14]} />
          <meshStandardMaterial color="#efe0b4" roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}
useGLTF.preload("/models/grocer.glb");
useGLTF.preload("/models/woman.glb");
useGLTF.preload("/models/man.glb");

/* ---------- Lights that flicker on ---------- */
function ShopLights({ progress }: { progress: Progress }) {
  const tube = useRef<THREE.MeshStandardMaterial>(null);
  const point = useRef<THREE.PointLight>(null);
  const sign = useRef<THREE.MeshStandardMaterial>(null);
  const signTex = useCanvasTexture((g, w, h) => {
    g.fillStyle = "#f2b632"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#8a1c1c"; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = "#8a1c1c"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "bold 46px Georgia, serif"; g.fillText("SHARMA KIRANA STORE", w / 2, h * 0.42);
    g.font = "bold 22px sans-serif"; g.fillStyle = "#2f5d3a";
    g.fillText("शर्मा किराना स्टोर  ·  Ph. 98765 43210  ·  UPI accepted", w / 2, h * 0.8);
  }, 1024, 104);
  useFrame(({ clock }) => {
    const p = progress.current;
    const on = seg(p, 0.2, 0.32);
    // tube-light flicker while switching on
    const flick = !SNAP && on > 0 && on < 1 ? (Math.sin(clock.elapsedTime * 60) > 0.2 ? 1 : 0.15) : 1;
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
        <meshStandardMaterial ref={sign} map={signTex} emissiveMap={signTex} color="#ffffff" emissive="#ffffff" emissiveIntensity={0.05} />
      </mesh>
    </>
  );
}

/* ---------- Dust motes drifting in the shop air (cinematic depth) ---------- */
function DustMotes() {
  const ref = useRef<THREE.Points>(null);
  const { positions, seeds } = useMemo(() => {
    const n = 90;
    const positions = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 1] = 0.3 + Math.random() * 3;
      positions[i * 3 + 2] = -0.5 + Math.random() * 3;
      seeds[i] = Math.random() * 10;
    }
    return { positions, seeds };
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current || SNAP) return;
    const t = clock.elapsedTime;
    const attr = ref.current.geometry.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < seeds.length; i++) {
      attr.setY(i, 0.3 + ((seeds[i]! * 0.7 + t * 0.06) % 3));
      attr.setX(i, attr.getX(i) + Math.sin(t * 0.5 + seeds[i]!) * 0.0012);
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#ffd9a0" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

/* ---------- The khata ledger: hero object, opens as you scroll ---------- */
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
  const cover = useRef<THREE.Group>(null);
  const target = new THREE.Vector3(0, 1.2, 0.3);
  const tmp = new THREE.Vector3();
  const pageTex = useCanvasTexture((g, w, h) => {
    g.fillStyle = "#fdf6e3"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(150,110,60,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    g.strokeStyle = "rgba(160,40,30,0.55)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(w * 0.16, 0); g.lineTo(w * 0.16, h); g.stroke();
    g.strokeStyle = "rgba(70,100,170,0.3)"; g.lineWidth = 1.5;
    for (let y = h * 0.14; y < h; y += h * 0.095) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = "#8a1c1c"; g.font = "bold 30px Georgia, serif"; g.textBaseline = "middle";
    g.fillText("KHAATA — October", w * 0.2, h * 0.07);
    g.fillStyle = "#3a2a1a"; g.font = "italic 24px Georgia, serif";
    const rows = [
      ["21 Oct", "Aashirvaad Atta 10kg x12", "5,780"], ["", "Fortune Oil 1L x24", "3,830"],
      ["", "Tata Salt 1kg x40", "960"], ["", "Parle-G 800g x30", "2,760"],
      ["", "UPI wasooli — Sharma ji", "1,200"], ["20 Oct", "Mandi — sabzi wholesale", "2,140"],
      ["", "Cash counter (shaam)", "6,660"],
    ];
    rows.forEach((r, i) => {
      const y = h * 0.14 + i * h * 0.095 + h * 0.048;
      g.fillText(r[0]!, w * 0.02, y);
      g.fillText(r[1]!, w * 0.2, y);
      g.textAlign = "right"; g.fillText(r[2]!, w * 0.95, y); g.textAlign = "left";
    });
  }, 512, 640);
  const clothTex = useCanvasTexture((g, w, h) => {
    g.fillStyle = "#8a1c1c"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < w; i += 3) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
    for (let i = 0; i < h; i += 3) { g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    g.strokeStyle = "rgba(242,182,50,0.8)"; g.lineWidth = 4;
    g.strokeRect(10, 10, w - 20, h - 20);
  }, 128, 128, [2, 2]);
  useFrame(({ clock, pointer }) => {
    const p = progress.current;
    const t = SNAP ? 0 : clock.elapsedTime;
    items.forEach((it, i) => {
      const m = refs.current[i];
      if (!m) return;
      const appear = seg(p, 0.42 + it.delay * 0.5, 0.5 + it.delay * 0.5);
      const fly = seg(p, 0.66 + it.delay, 0.78 + it.delay);
      tmp.copy(it.start);
      tmp.x += pointer.x * 0.6 + Math.sin(t * it.spin) * 0.08;
      tmp.y += pointer.y * 0.3 + Math.sin(t * 1.3 + i) * 0.15;
      tmp.lerp(target, fly);
      m.position.copy(tmp);
      m.rotation.y = t * it.spin;
      const s = appear * (1 - fly * 0.85);
      m.scale.setScalar(Math.max(0.001, s));
    });
    if (cover.current) {
      const open = seg(p, 0.56, 0.74);
      cover.current.rotation.z = -open * Math.PI * 0.97;
    }
    if (book.current && !SNAP) book.current.position.y = 1.13 + Math.sin(t * 0.8) * 0.004;
  });
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m; }} rotation-x={it.coin ? Math.PI / 2 : 0}>
          {it.coin ? <cylinderGeometry args={[0.14, 0.14, 0.04, 28]} /> : <planeGeometry args={[0.28, 0.44]} />}
          {it.coin
            ? <meshStandardMaterial color="#f2b632" metalness={0.35} roughness={0.3} emissive="#b87a10" emissiveIntensity={0.55} />
            : <meshStandardMaterial color="#fffaf0" emissive="#ffe9b0" emissiveIntensity={0.3} side={THREE.DoubleSide} />}
        </mesh>
      ))}
      {/* ledger on the counter, tilted toward the viewer */}
      <group ref={book} position={[0, 1.13, 0.32]} rotation-x={0.22}>
        {/* base: red cloth cover + page block + written page */}
        <mesh position={[0.36, 0, 0]} castShadow receiveShadow><boxGeometry args={[0.72, 0.04, 0.92]} /><meshStandardMaterial map={clothTex} roughness={0.85} /></mesh>
        <mesh position={[0.35, 0.045, 0]}><boxGeometry args={[0.66, 0.05, 0.86]} /><meshStandardMaterial color="#f3e8cd" roughness={0.9} /></mesh>
        <mesh position={[0.35, 0.071, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.64, 0.84]} />
          <meshStandardMaterial map={pageTex} roughness={0.85} />
        </mesh>
        {/* opening side: cover + blank page flip over the spine */}
        <group ref={cover} position={[0, 0.02, 0]}>
          <mesh position={[-0.36, 0, 0]} castShadow><boxGeometry args={[0.72, 0.035, 0.92]} /><meshStandardMaterial map={clothTex} roughness={0.85} /></mesh>
          <mesh position={[-0.35, 0.022, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.66, 0.86]} /><meshStandardMaterial color="#f7efdb" roughness={0.9} /></mesh>
        </group>
        {/* spine with red thread binding */}
        <mesh position={[0, 0.01, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, 0.92, 12]} /><meshStandardMaterial color="#6d1414" roughness={0.9} /></mesh>
        {[-0.3, 0, 0.3].map((z) => (
          <mesh key={z} position={[0, 0.045, z]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.12, 8]} /><meshStandardMaterial color="#c2452d" roughness={0.7} /></mesh>
        ))}
      </group>
    </>
  );
}

/* ---------- Camera dolly ---------- */
function CameraRig({ progress }: { progress: Progress }) {
  const { camera, size } = useThree();
  const framing = shopFraming(size.width, size.height);
  const look = useRef(new THREE.Vector3(2.6, 1, 0));
  useFrame(({ pointer }, dt) => {
    const p = progress.current;
    const a = seg(p, 0, 0.42);   // street → shop front
    const b = seg(p, 0.38, 0.7); // glide in to the counter
    const c = seg(p, 0.7, 1);    // dive into the open khata
    const par = 1 - c * 0.85;    // parallax fades as the camera commits
    let x: number, y: number, z: number, lx: number, ly: number, lz: number;
    if (framing.mobile) {
      x = THREE.MathUtils.lerp(2.6, 2.52, c);
      y = THREE.MathUtils.lerp(THREE.MathUtils.lerp(2.1, 0.6, b), 0.55, c);
      z = THREE.MathUtils.lerp(THREE.MathUtils.lerp(framing.distance + (1 - a) * 0.8, 3.4, b), 2.0, c);
      lx = 2.52; ly = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.4, -0.2, b), -0.5, c); lz = THREE.MathUtils.lerp(0, 0.33, c);
    } else {
      x = THREE.MathUtils.lerp(THREE.MathUtils.lerp(THREE.MathUtils.lerp(-1.5, 0.2, a), 1.7, b), 2.3, c) + pointer.x * 0.4 * par;
      y = THREE.MathUtils.lerp(THREE.MathUtils.lerp(THREE.MathUtils.lerp(2.8, 1.9, a), 0.7, b), 0.5, c) + pointer.y * 0.2 * par;
      z = THREE.MathUtils.lerp(THREE.MathUtils.lerp(THREE.MathUtils.lerp(13, 10.5, a), 4.4, b), 2.0, c);
      lx = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.4, 1.8, b), 2.5, c);
      ly = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.9, -0.1, b), -0.52, c);
      lz = THREE.MathUtils.lerp(0, 0.33, c);
    }
    camera.position.set(damp(camera.position.x, x, 4, dt), damp(camera.position.y, y, 4, dt), damp(camera.position.z, z, 4, dt));
    look.current.set(damp(look.current.x, lx, 4, dt), damp(look.current.y, ly, 4, dt), damp(look.current.z, lz, 4, dt));
    camera.lookAt(look.current);
  });
  return null;
}

function Sky({ progress }: { progress: Progress }) {
  const { size } = useThree();
  const { fogScale } = shopFraming(size.width, size.height);
  const fog = useRef<THREE.Fog>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const dawn = new THREE.Color("#2a1a14"), day = new THREE.Color("#7a4a2a");
  const c = new THREE.Color();
  useFrame(({ scene }) => {
    const k = seg(progress.current, 0, 0.5);
    c.copy(dawn).lerp(day, k);
    if (fog.current) {
      fog.current.color.copy(c);
      fog.current.near = 11 * fogScale;
      fog.current.far = 26 * fogScale;
    }
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
      <SnapSync progress={progress} />
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
        <Suspense fallback={null}>
          <Person model="/models/grocer.glb" outfit={GROCER} phase={0} wave={[0.36, 0.56]} progress={progress}
            standYaw={0} path={{ from: [0, 0.02, -0.3], to: [0, 0.02, -0.3], range: [0, 1] }} />
          <Person model="/models/woman.glb" outfit={WOMAN} bag phase={1.3} progress={progress}
            path={{ from: [-7, 0, 4], to: [-0.7, 0, 1.45], range: [0.32, 0.55] }} />
          <Person model="/models/man.glb" outfit={MAN} bag phase={2.4} progress={progress}
            path={{ from: [8, 0, 4.5], to: [0.85, 0, 1.55], range: [0.38, 0.62] }} />
        </Suspense>
        <Shutter progress={progress} />
        <Crate p={[-2.2, 0.2, 1.7]} fruit="#d93b2b" />
        <Crate p={[-1.3, 0.2, 1.9]} fruit="#f2a531" />
        <Crate p={[2.0, 0.2, 1.8]} fruit="#7ab648" />
        <Sack p={[2.6, 0, 1.3]} grain="#f4efe2" />
        <Sack p={[-2.65, 0, 1.25]} grain="#e8b84a" />
        <Sack p={[2.8, 0, 2.0]} grain="#a8572b" />
        {[-2.5, -2.2, 2.2, 2.5].map((x, i) => <SnackStrip key={x} x={x} color={["#e8452d", "#2d6fb0", "#f2c230", "#3f8f3a"][i]!} />)}
        {/* pavement step in front of the shop */}
        <mesh position={[0, 0.06, 1.35]} receiveShadow castShadow><boxGeometry args={[6.6, 0.12, 0.6]} /><meshStandardMaterial color="#8d8478" roughness={0.95} /></mesh>
        <LedgerFlow progress={progress} />
        <DustMotes />
        <ContactShadows position={[0, 0.01, 2]} opacity={0.5} scale={14} blur={2.5} far={4} />
      </group>
    </Canvas>
  );
}
