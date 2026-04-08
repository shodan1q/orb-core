'use client';

/* ==========================================================================
 * IntroSequence.tsx — 开场动画
 *
 *   ACT 1  Satellite Closeup   0   - 2.0s    卫星特写 + 星空 + 地球弧
 *   ACT 2  Orbital Pullback    2.0 - 4.4s    后撤露出地球曲面
 *   Fade out                   4.4 - 5.2s
 * ======================================================================== */

import { useRef, useMemo, MutableRefObject, Suspense } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';

/* ---------------- Timing ---------------- */
const DUR = {
  satEnd: 2.0,
  orbitEnd: 4.4,
  fadeEnd: 5.2,
};

useGLTF.preload('/models/satellite.glb');

/* ---------------- Helpers ---------------- */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = THREE.MathUtils.lerp;

function fadeRange(t: number, start: number, end: number, f = 0.45) {
  if (t < start - f || t > end + f) return 0;
  if (t < start) return smoothstep(start - f, start, t);
  if (t > end) return 1 - smoothstep(end, end + f, t);
  if (t < start + f) return smoothstep(start, start + f, t);
  if (t > end - f) return 1 - smoothstep(end - f, end, t);
  return 1;
}

interface TP {
  timeRef: MutableRefObject<number>;
}

/* =========================================================================
 *  ACT 1 + 2 — Single Earth + Satellite
 *    用同一颗地球贯穿 Act 1 (卫星特写) 和 Act 2 (轨道俯视), 避免重影
 *    Earth 中心放在 (0, -EARTH_R, 0), 表面掠过 y≈0 的空间
 * ========================================================================= */
const EARTH_R = 110;
const EARTH_CENTER = new THREE.Vector3(0, -EARTH_R, 0);

function EarthStage({ timeRef }: TP) {
  const groupRef = useRef<THREE.Group>(null);
  const satRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Points>(null);
  const starMatRef = useRef<THREE.PointsMaterial>(null);
  const earthMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const { scene } = useGLTF('/models/satellite.glb');
  const satModel = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
      }
    });
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const norm = 3.5 / maxDim;
    c.position.sub(center.multiplyScalar(norm));
    c.scale.setScalar(norm);
    return c;
  }, [scene]);

  const starGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const N = 2000;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // Stars above the horizon only (positive-y hemisphere around camera area)
      const phi = Math.acos(Math.random() * 0.8 + 0.1); // skew toward upper hemisphere
      const theta = 2 * Math.PI * Math.random();
      const r = 320 + Math.random() * 180;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 40;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const earthTex = useLoader(TextureLoader, '/textures/earth-day.jpg');

  useFrame(() => {
    const t = timeRef.current;
    // Earth + stars visible from start through end of orbit
    const f = fadeRange(t, 0, DUR.orbitEnd, 0.4);
    if (groupRef.current) groupRef.current.visible = f > 0.01;
    if (earthMatRef.current) earthMatRef.current.opacity = f;
    if (starMatRef.current) starMatRef.current.opacity = 0.9 * f;

    // Satellite only in act 1, then drifts off-screen right and fades
    const satF = fadeRange(t, 0, DUR.satEnd, 0.45);
    if (satRef.current) {
      satRef.current.position.x = 2.2 + smoothstep(0, DUR.orbitEnd, t) * 6;
      satRef.current.position.y = 2.0 + smoothstep(DUR.satEnd, DUR.orbitEnd, t) * 3;
      satRef.current.rotation.y = -0.15 + t * 0.05;
      satRef.current.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const apply = (mat: THREE.Material) => {
          mat.transparent = true;
          (mat as THREE.MeshStandardMaterial).opacity = satF;
        };
        const m = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(m)) m.forEach(apply);
        else apply(m);
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Star field (upper hemisphere) */}
      <points ref={starsRef} geometry={starGeo}>
        <pointsMaterial
          ref={starMatRef}
          size={0.9}
          color={0xffffff}
          transparent
          opacity={0}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* Earth — single large sphere, surface near y=0 */}
      <mesh position={EARTH_CENTER}>
        <sphereGeometry args={[EARTH_R, 128, 128]} />
        <meshStandardMaterial
          ref={earthMatRef}
          map={earthTex}
          emissive={0x0a1830}
          emissiveIntensity={0.18}
          roughness={0.78}
          metalness={0}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Satellite — small craft floating above the surface */}
      <group ref={satRef} position={[2.2, 2, 0]}>
        <primitive object={satModel} />
      </group>

      {/* Sun-like key light coming from above-left */}
      <directionalLight
        position={[-120, 180, 120]}
        intensity={2.8}
        color={0xfff2dd}
      />
      {/* Fill light */}
      <directionalLight
        position={[60, -40, -40]}
        intensity={0.35}
        color={0x4466aa}
      />
    </group>
  );
}



/* =========================================================================
 *  Camera Rig
 * ========================================================================= */
function CameraRig({ timeRef, onDone }: TP & { onDone: () => void }) {
  const { camera } = useThree();
  const doneRef = useRef(false);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const cam = camera as THREE.PerspectiveCamera;

    if (t < DUR.satEnd) {
      /* Act 1: tight on satellite, Earth surface just visible in lower frame */
      const k = smoothstep(0, DUR.satEnd, t);
      cam.position.set(-3.8 + k * 0.3, 3.4 - k * 0.1, 7.2 - k * 0.4);
      cam.lookAt(3.0, 2.6, 0);
      cam.fov = 42;
    } else if (t < DUR.orbitEnd) {
      /* Act 2: tilt down + rise. Satellite drifts right off-screen.
         Camera rises above Earth surface and looks along the curvature —
         horizon + atmosphere rim fills the top of the frame. */
      const k = smoothstep(DUR.satEnd, DUR.orbitEnd, t);
      const posStart = new THREE.Vector3(-3.5, 3.3, 6.8);
      const posEnd = new THREE.Vector3(0, 26, 28);
      cam.position.lerpVectors(posStart, posEnd, k);
      const lookStart = new THREE.Vector3(3.0, 2.6, 0);
      const lookEnd = new THREE.Vector3(0, -6, -60);
      const look = new THREE.Vector3().lerpVectors(lookStart, lookEnd, k);
      cam.lookAt(look);
      cam.fov = lerp(42, 58, k);
    } else {
      /* Hold final orbit pose, slight drift, then fade */
      const k = smoothstep(DUR.orbitEnd, DUR.fadeEnd, t);
      cam.position.set(k * 1.2, 26 + k * 2, 28 + k * 3);
      cam.lookAt(0, -6, -60);
      cam.fov = lerp(58, 60, k);
    }
    cam.updateProjectionMatrix();

    if (t >= DUR.fadeEnd && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  });

  return null;
}

/* =========================================================================
 *  Main export
 * ========================================================================= */
export default function IntroSequence({ onDone }: { onDone: () => void }) {
  const timeRef = useRef(0);

  return (
    <Canvas
      camera={{ position: [-3.8, 3.4, 7.2], fov: 42, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: '#000005' }}
    >
      <Suspense fallback={null}>
        <EarthStage timeRef={timeRef} />
        <CameraRig timeRef={timeRef} onDone={onDone} />
      </Suspense>
    </Canvas>
  );
}
