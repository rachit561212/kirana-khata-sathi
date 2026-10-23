import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Float, ContactShadows } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

const DAMP = 3;

function Shutter({ open }: { open: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 256;
    const g = c.getContext("2d")!;
    for (let y = 0; y < 256; y += 16) {
      g.fillStyle = "#9aa0a3"; g.fillRect(0, y, 64, 12);
      g.fillStyle = "#6c7275"; g.fillRect(0, y + 12, 64, 4);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useFrame((_, d) => {
    if (!ref.current) return;
    const target = open ? 3.1 : 0;
    ref.current.position.y += (target - ref.current.position.y) * (1 - Math.exp(-1.6 * Math.min(d, 0.05)));
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 1.6, 1.05]}>
        <boxGeometry args={[5.6, 3.2, 0.05]} />
        <meshStandardMaterial map={tex} metalness={0.6} roughness={0.45} />
      </mesh>
    </group>
  );
}

function Shelf({ x }: { x: number }) {
  const colors = ["#e8a33d", "#c2452d", "#5b8c3a", "#f2d16b", "#8a4b2a", "#d96f32"];
  return (
    <group position={[x, 0, -0.6]}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[1.6, 2.8, 0.5]} />
        <meshStandardMaterial color="#7a4a26" roughness={0.8} />
      </mesh>
      {[0.5, 1.2, 1.9, 2.5].map((y, r) =>
        Array.from({ length: 5 }).map((_, i) => (
          <mesh key={`${r}-${i}`} position={[-0.6 + i * 0.3, y, 0.28]} castShadow>
            <boxGeometry args={[0.22, 0.35, 0.18]} />
            <meshStandardMaterial color={colors[(i + r * 2) % colors.length]!} roughness={0.6} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Crate({ p, fruit }: { p: [number, number, number]; fruit: string }) {
  return (
    <group position={p}>
      <mesh castShadow><boxGeometry args={[0.8, 0.4, 0.55]} /><meshStandardMaterial color="#a8743f" roughness={0.9} /></mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-0.25 + (i % 3) * 0.25, 0.27, -0.1 + Math.floor(i / 3) * 0.2]} castShadow>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshStandardMaterial color={fruit} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Person({ p, shirt, apron, bag, phase = 0, rotY = 0 }: { p: [number, number, number]; shirt: string; apron?: boolean; bag?: boolean; phase?: number; rotY?: number }) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    if (body.current) body.current.scale.y = 1 + Math.sin(t * 2) * 0.02;
    if (head.current) head.current.rotation.y = Math.sin(t * 0.7) * 0.35;
  });
  return (
    <group position={p} rotation-y={rotY}>
      <group ref={body}>
        <mesh position={[0, 0.85, 0]} castShadow><capsuleGeometry args={[0.28, 0.7, 6, 16]} /><meshStandardMaterial color={shirt} roughness={0.7} /></mesh>
        {apron && <mesh position={[0, 0.75, 0.25]}><boxGeometry args={[0.42, 0.7, 0.04]} /><meshStandardMaterial color="#2f5d3a" /></mesh>}
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, 0.25, 0]} castShadow><capsuleGeometry args={[0.09, 0.4, 4, 8]} /><meshStandardMaterial color="#3a2f2a" /></mesh>
        ))}
        {bag && (
          <mesh position={[0.4, 0.6, 0]} castShadow><boxGeometry args={[0.28, 0.35, 0.16]} /><meshStandardMaterial color="#f1e2b8" roughness={0.9} /></mesh>
        )}
      </group>
      <group ref={head} position={[0, 1.65, 0]}>
        <mesh castShadow><sphereGeometry args={[0.24, 24, 18]} /><meshStandardMaterial color="#b97a4f" roughness={0.6} /></mesh>
        <mesh position={[0, 0.12, -0.03]}><sphereGeometry args={[0.245, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.2]} /><meshStandardMaterial color="#1e1612" /></mesh>
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 0.02, 0.22]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
        ))}
        <mesh position={[0, -0.08, 0.215]} rotation-z={Math.PI}><torusGeometry args={[0.06, 0.012, 6, 12, Math.PI]} /><meshStandardMaterial color="#5a1f1a" /></mesh>
      </group>
    </group>
  );
}

function Floaters() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ pointer }, d) => {
    if (!group.current) return;
    const k = 1 - Math.exp(-DAMP * Math.min(d, 0.05));
    group.current.rotation.y += (pointer.x * 0.35 - group.current.rotation.y) * k;
    group.current.rotation.x += (-pointer.y * 0.15 - group.current.rotation.x) * k;
  });
  const coins: [number, number, number][] = [[-3.2, 3.4, 1.5], [3.4, 3.0, 1.2], [-2.4, 4.2, 0.4], [2.6, 4.4, 0.6], [0.4, 4.6, 1.6]];
  const receipts: [number, number, number][] = [[-3.8, 2.2, 2], [3.9, 1.9, 2.2], [1.6, 3.9, 2.4]];
  return (
    <group ref={group} position={[2.4, -0.6, 0]}>
      {coins.map((p, i) => (
        <Float key={i} speed={2} rotationIntensity={1.5} floatIntensity={1.2}>
          <mesh position={p} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.28, 0.28, 0.06, 32]} />
            <meshStandardMaterial color="#f2b632" metalness={0.9} roughness={0.25} emissive="#a86a00" emissiveIntensity={0.4} />
          </mesh>
        </Float>
      ))}
      {receipts.map((p, i) => (
        <Float key={i} speed={1.4} rotationIntensity={0.8} floatIntensity={1}>
          <mesh position={p}>
            <planeGeometry args={[0.45, 0.7]} />
            <meshStandardMaterial color="#fffaf0" emissive="#ffe9b0" emissiveIntensity={0.35} side={THREE.DoubleSide} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function ShopScene({ open }: { open: boolean }) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.6, 12.5], fov: 40 }}>
      <fog attach="fog" args={["#3b2618", 10, 22]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 8, 6]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} color="#ffd9a8" />
      <pointLight position={[0, 2.8, 0.3]} intensity={6} distance={6} color="#ffb85c" />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={1} color="#ffcf8a" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
      <group position={[2.6, -1.6, 0]} rotation-y={-0.25}>
        {/* street */}
        <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, 0, 2]}>
          <planeGeometry args={[30, 12]} />
          <meshStandardMaterial color="#5a4636" roughness={1} />
        </mesh>
        {/* shop shell */}
        <mesh position={[0, 1.7, -1]} receiveShadow><boxGeometry args={[6.4, 3.4, 0.2]} /><meshStandardMaterial color="#f0d9a8" roughness={0.9} /></mesh>
        <mesh position={[-3.05, 1.7, 0]}><boxGeometry args={[0.3, 3.4, 2.2]} /><meshStandardMaterial color="#c2452d" /></mesh>
        <mesh position={[3.05, 1.7, 0]}><boxGeometry args={[0.3, 3.4, 2.2]} /><meshStandardMaterial color="#c2452d" /></mesh>
        <mesh position={[0, 3.6, 0.2]} castShadow><boxGeometry args={[6.6, 0.7, 2.4]} /><meshStandardMaterial color="#2f5d3a" /></mesh>
        <mesh position={[0, 3.6, 1.42]}><boxGeometry args={[4.4, 0.45, 0.02]} /><meshStandardMaterial color="#f2b632" emissive="#f2b632" emissiveIntensity={0.25} /></mesh>
        {/* awning stripes */}
        {Array.from({ length: 11 }).map((_, i) => (
          <mesh key={i} position={[-3 + i * 0.6, 3.15, 1.55]} rotation-x={0.5}>
            <boxGeometry args={[0.6, 0.05, 0.7]} />
            <meshStandardMaterial color={i % 2 ? "#fff3d6" : "#c2452d"} />
          </mesh>
        ))}
        <Shelf x={-1.9} />
        <Shelf x={1.9} />
        <mesh position={[0, 0.5, 0.3]} castShadow receiveShadow><boxGeometry args={[2.2, 1, 0.7]} /><meshStandardMaterial color="#8a5a33" roughness={0.8} /></mesh>
        <Person p={[0, 0.3, -0.35]} shirt="#e8d4b0" apron phase={0} />
        <Shutter open={open} />
        <Crate p={[-2.2, 0.2, 1.7]} fruit="#d93b2b" />
        <Crate p={[-1.3, 0.2, 1.9]} fruit="#f2a531" />
        <Crate p={[2.0, 0.2, 1.8]} fruit="#7ab648" />
        <Person p={[-3.8, 0, 3]} shirt="#c96f9a" bag phase={1.3} rotY={0.6} />
        <Person p={[3.7, 0, 3.2]} shirt="#3f72af" bag phase={2.4} rotY={-0.7} />
        <ContactShadows position={[0, 0.01, 2]} opacity={0.5} scale={14} blur={2.5} far={4} />
      </group>
      <Floaters />
    </Canvas>
  );
}
