'use client';

import { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

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
  const panelLeftRef = useRef<THREE.Group>(null);
  const panelRightRef = useRef<THREE.Group>(null);
  const statusLightMat = useRef<THREE.MeshBasicMaterial | null>(null);
  const thrustMeshRef = useRef<THREE.Mesh>(null);
  const antennaLightMat = useRef<THREE.MeshBasicMaterial | null>(null);

  const panelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x1a237e,
        metalness: 0.8,
        roughness: 0.3,
        emissive: new THREE.Color(0x1155cc),
        emissiveIntensity: 0.4,
      }),
    []
  );

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        metalness: 0.9,
        roughness: 0.2,
      }),
    []
  );

  const goldFoilMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xe6b33a,
        metalness: 0.7,
        roughness: 0.35,
        emissive: new THREE.Color(0x4a2a00),
        emissiveIntensity: 0.25,
      }),
    []
  );

  const mirrorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1.0,
        roughness: 0.05,
      }),
    []
  );

  const gridLineMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: 0x55aaff, transparent: true, opacity: 0.7 }),
    []
  );

  const panelEdgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, 0.001, 0.7)),
    []
  );

  // 目标欧拉角通过 useFrame 做阻尼插值, 动起来更顺滑
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
      // 阻尼插值
      groupRef.current.quaternion.slerp(targetQ, Math.min(1, delta * 6));
    }

    // 状态指示灯呼吸
    if (statusLightMat.current) {
      statusLightMat.current.opacity = 0.5 + 0.5 * Math.sin(t * 2);
      statusLightMat.current.color.setHSL(0.55, 1, 0.6);
    }

    // 天线闪烁
    if (antennaLightMat.current) {
      antennaLightMat.current.opacity = Math.sin(t * 8) > 0.9 ? 1 : 0.15;
    }

    // 太阳能板轻微摆动
    if (panelLeftRef.current) {
      panelLeftRef.current.rotation.x = Math.sin(t * 0.8) * 0.04;
    }
    if (panelRightRef.current) {
      panelRightRef.current.rotation.x = Math.sin(t * 0.8 + 0.5) * 0.04;
    }

    // 推力火焰伸缩
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
      {/* Main body - hexagonal prism */}
      <mesh material={goldFoilMaterial}>
        <cylinderGeometry args={[0.4, 0.4, 0.8, 6]} />
      </mesh>

      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[0.42, 0.03, 8, 6]} />
        <meshStandardMaterial color={0xaaaaaa} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, -0.1, 0]} material={bodyMaterial}>
        <torusGeometry args={[0.42, 0.03, 8, 6]} />
      </mesh>

      {/* Solar Panel Left */}
      <group ref={panelLeftRef} position={[-0.5, 0, 0]}>
        <mesh position={[-0.3, 0, 0]} material={bodyMaterial}>
          <boxGeometry args={[0.6, 0.04, 0.04]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={`l${i}`} position={[-0.8 - i * 0.55, 0, 0]} material={panelMaterial}>
            <boxGeometry args={[0.5, 0.02, 0.7]} />
          </mesh>
        ))}
        {[0, 1, 2].map((i) => (
          <lineSegments
            key={`lg${i}`}
            position={[-0.8 - i * 0.55, 0.015, 0]}
            geometry={panelEdgesGeo}
            material={gridLineMaterial}
          />
        ))}
      </group>

      {/* Solar Panel Right */}
      <group ref={panelRightRef} position={[0.5, 0, 0]}>
        <mesh position={[0.3, 0, 0]} material={bodyMaterial}>
          <boxGeometry args={[0.6, 0.04, 0.04]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={`r${i}`} position={[0.8 + i * 0.55, 0, 0]} material={panelMaterial}>
            <boxGeometry args={[0.5, 0.02, 0.7]} />
          </mesh>
        ))}
        {[0, 1, 2].map((i) => (
          <lineSegments
            key={`rg${i}`}
            position={[0.8 + i * 0.55, 0.015, 0]}
            geometry={panelEdgesGeo}
            material={gridLineMaterial}
          />
        ))}
      </group>

      {/* Camera lens (bottom) */}
      <group position={[0, -0.45, 0]}>
        <mesh material={bodyMaterial}>
          <cylinderGeometry args={[0.15, 0.18, 0.15, 16]} />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <circleGeometry args={[0.13, 16]} />
          <meshBasicMaterial color={0x22aaff} transparent opacity={0.8} />
        </mesh>
      </group>

      {/* Reflector mirror (top) */}
      <group position={[0, 0.5, 0]}>
        <mesh material={mirrorMaterial} rotation={[0.3, 0, 0]}>
          <circleGeometry args={[0.35, 32]} />
        </mesh>
        <mesh rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.35, 0.02, 8, 32]} />
          <meshStandardMaterial color={0x888888} metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Antenna */}
      <group position={[0.2, 0.3, 0.2]}>
        <mesh material={bodyMaterial}>
          <cylinderGeometry args={[0.008, 0.008, 0.5, 4]} />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial
            color={0xff3333}
            transparent
            opacity={0.5}
            ref={(m) => {
              if (m) antennaLightMat.current = m as THREE.MeshBasicMaterial;
            }}
          />
        </mesh>
      </group>

      {/* Status light */}
      <mesh position={[0, 0, 0.42]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial
          color={0x00aaff}
          transparent
          opacity={1}
          ref={(m) => {
            if (m) statusLightMat.current = m as THREE.MeshBasicMaterial;
          }}
        />
      </mesh>

      {/* 推力火焰 (沿 -Y 方向) */}
      <mesh ref={thrustMeshRef} position={[0, -0.75, 0]}>
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
      <pointLight position={[0, 0, 0.5]} color={0x66ccff} intensity={0.6} distance={2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: XYZ 坐标指示器                                                */
/* ------------------------------------------------------------------ */
function AxesHelper() {
  return (
    <group>
      <mesh position={[0.8, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1.6, 6]} />
        <meshBasicMaterial color={0xff5555} />
      </mesh>
      <mesh position={[1.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.1, 6]} />
        <meshBasicMaterial color={0xff5555} />
      </mesh>

      <mesh position={[0, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 1.6, 6]} />
        <meshBasicMaterial color={0x55ff55} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <coneGeometry args={[0.04, 0.1, 6]} />
        <meshBasicMaterial color={0x55ff55} />
      </mesh>

      <mesh position={[0, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1.6, 6]} />
        <meshBasicMaterial color={0x5599ff} />
      </mesh>
      <mesh position={[0, 0, 1.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.1, 6]} />
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
      camera={{ position: [3, 2, 3.5], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.8} color={0xfff5e0} />
        <directionalLight position={[-3, -2, -4]} intensity={0.4} color={0x88aaff} />

        <AxesHelper />
        <SatelliteMesh pitch={pitch} yaw={yaw} roll={roll} thrust={thrust} />

        <OrbitControls
          enablePan={false}
          minDistance={2.5}
          maxDistance={8}
          enableDamping
          dampingFactor={0.1}
        />
      </Suspense>
    </Canvas>
  );
}
