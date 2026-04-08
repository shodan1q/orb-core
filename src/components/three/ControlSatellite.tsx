'use client';

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

useGLTF.preload('/models/satellite.glb');

/* ------------------------------------------------------------------ */
/*  独立的可控卫星模型 (不参与轨道运动, 只响应外部欧拉角)                     */
/* ------------------------------------------------------------------ */
function SatelliteMesh({
  pitch,
  yaw,
  roll,
  thrust,
}: {
  pitch: number;
  yaw: number;
  roll: number;
  thrust: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const thrustMeshRef = useRef<THREE.Mesh>(null);

  const { scene } = useGLTF('/models/satellite.glb');

  const model = useMemo(() => {
    const cloned = scene.clone(true);
    // Deep-clone materials so this Canvas has its own instances
    // (shared materials across multiple WebGL contexts cause render issues)
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
      }
    });
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const norm = 3.5 / maxDim;
    cloned.position.sub(center.multiplyScalar(norm));
    cloned.scale.setScalar(norm);
    return cloned;
  }, [scene]);

  const targetQ = useMemo(() => new THREE.Quaternion(), []);
  const eulerTmp = useMemo(() => new THREE.Euler(), []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    if (groupRef.current) {
      eulerTmp.set(
        (pitch * Math.PI) / 180,
        (yaw * Math.PI) / 180,
        (roll * Math.PI) / 180,
        'XYZ'
      );
      targetQ.setFromEuler(eulerTmp);
      groupRef.current.quaternion.slerp(targetQ, Math.min(1, delta * 6));
    }

    if (thrustMeshRef.current) {
      const s = thrust / 100;
      const wobble = 1 + 0.15 * Math.sin(t * 30);
      thrustMeshRef.current.scale.set(
        0.4 + s * 0.8,
        (0.1 + s * 1.4) * wobble,
        0.4 + s * 0.8
      );
      (thrustMeshRef.current.material as THREE.MeshBasicMaterial).opacity = s * 0.9;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={model} />

      {/* 推力火焰 (沿 -Y 方向) */}
      <mesh ref={thrustMeshRef} position={[0, -1.2, 0]}>
        <coneGeometry args={[0.2, 0.6, 16, 1, true]} />
        <meshBasicMaterial
          color={0x66ccff}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 内部暖光 */}
      <pointLight position={[0, 0, 1.2]} color={0x66ccff} intensity={0.6} distance={2.5} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: XYZ 坐标指示器                                                */
/* ------------------------------------------------------------------ */
function AxesHelper() {
  return (
    <group>
      <mesh position={[1.3, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 2.6, 6]} />
        <meshBasicMaterial color={0xff5555} />
      </mesh>
      <mesh position={[2.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.06, 0.15, 6]} />
        <meshBasicMaterial color={0xff5555} />
      </mesh>

      <mesh position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 2.6, 6]} />
        <meshBasicMaterial color={0x55ff55} />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <coneGeometry args={[0.06, 0.15, 6]} />
        <meshBasicMaterial color={0x55ff55} />
      </mesh>

      <mesh position={[0, 0, 1.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 2.6, 6]} />
        <meshBasicMaterial color={0x5599ff} />
      </mesh>
      <mesh position={[0, 0, 2.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 0.15, 6]} />
        <meshBasicMaterial color={0x5599ff} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Canvas wrapper                                                */
/* ------------------------------------------------------------------ */
export default function ControlSatellite({
  pitch,
  yaw,
  roll,
  thrust,
}: {
  pitch: number;
  yaw: number;
  roll: number;
  thrust: number;
}) {
  return (
    <Canvas
      camera={{ position: [3.2, 2, 3.2], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.8} color={0xfff5e0} />
        <directionalLight position={[-3, -2, -4]} intensity={0.4} color={0x88aaff} />

        <SatelliteMesh pitch={pitch} yaw={yaw} roll={roll} thrust={thrust} />

        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={10}
          enableDamping
          dampingFactor={0.1}
        />
      </Suspense>
    </Canvas>
  );
}
