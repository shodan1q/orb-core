'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SatelliteProps {
  position: THREE.Vector3;
  sunDirection: THREE.Vector3;
}

export default function Satellite({ position, sunDirection }: SatelliteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const panelLeftRef = useRef<THREE.Group>(null);
  const panelRightRef = useRef<THREE.Group>(null);
  const statusLightRef = useRef<THREE.Mesh>(null);
  const antennaLightRef = useRef<THREE.Mesh>(null);

  const statusLightMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x00aaff),
        transparent: true,
        opacity: 1,
      }),
    []
  );

  const panelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x1a237e,
        metalness: 0.8,
        roughness: 0.3,
        emissive: new THREE.Color(0x0044aa),
        emissiveIntensity: 0.2,
      }),
    []
  );

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.9,
        roughness: 0.2,
      }),
    []
  );

  const mirrorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1.0,
        roughness: 0.05,
        envMapIntensity: 2.0,
      }),
    []
  );

  const goldFoilMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xdaa520,
        metalness: 0.7,
        roughness: 0.4,
        emissive: new THREE.Color(0x332200),
        emissiveIntensity: 0.1,
      }),
    []
  );

  const gridLineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({ color: 0x3355aa, transparent: true, opacity: 0.5 }),
    []
  );

  // Pre-create the edges geometry used for solar panel grid lines
  const panelEdgesGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, 0.001, 0.7)),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.lookAt(0, 0, 0);
    }

    // Status light breathing
    statusLightMat.opacity = 0.5 + 0.5 * Math.sin(t * 2);
    const hue = 0.55 + 0.05 * Math.sin(t * 0.5);
    statusLightMat.color.setHSL(hue, 1, 0.5);

    // Antenna blink
    if (antennaLightRef.current) {
      const blink = Math.sin(t * 8) > 0.9 ? 1 : 0.1;
      (antennaLightRef.current.material as THREE.MeshBasicMaterial).opacity = blink;
    }

    // Solar panel subtle tracking
    if (panelLeftRef.current) {
      panelLeftRef.current.rotation.x = Math.sin(t * 0.3) * 0.05;
    }
    if (panelRightRef.current) {
      panelRightRef.current.rotation.x = Math.sin(t * 0.3 + 0.5) * 0.05;
    }
  });

  const scale = 0.06;

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {/* Main body - hexagonal prism */}
      <mesh material={goldFoilMaterial}>
        <cylinderGeometry args={[0.4, 0.4, 0.8, 6]} />
      </mesh>

      {/* Body detail rings */}
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[0.42, 0.03, 8, 6]} />
        <meshStandardMaterial color={0x888888} metalness={0.9} roughness={0.1} />
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
          <meshBasicMaterial color={0x0066ff} transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, -0.075, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.14, 0.015, 8, 16]} />
          <meshStandardMaterial color={0x333333} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Reflector mirror (top) */}
      <group position={[0, 0.5, 0]}>
        <mesh material={mirrorMaterial} rotation={[0.3, 0, 0]}>
          <circleGeometry args={[0.35, 32]} />
        </mesh>
        <mesh rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.35, 0.02, 8, 32]} />
          <meshStandardMaterial color={0x666666} metalness={0.8} roughness={0.2} />
        </mesh>
        {[0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2;
          return (
            <mesh
              key={`strut${i}`}
              position={[Math.cos(angle) * 0.2, -0.15, Math.sin(angle) * 0.2]}
              rotation={[0.3, angle, 0]}
              material={bodyMaterial}
            >
              <cylinderGeometry args={[0.01, 0.01, 0.35, 4]} />
            </mesh>
          );
        })}
      </group>

      {/* Antenna */}
      <group position={[0.2, 0.3, 0.2]}>
        <mesh material={bodyMaterial}>
          <cylinderGeometry args={[0.008, 0.008, 0.5, 4]} />
        </mesh>
        <mesh ref={antennaLightRef} position={[0, 0.28, 0]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color={0xff3333} transparent opacity={0.5} />
        </mesh>
      </group>

      {/* Status light */}
      <mesh ref={statusLightRef} position={[0, 0, 0.42]} material={statusLightMat}>
        <sphereGeometry args={[0.04, 8, 8]} />
      </mesh>

      <pointLight position={[0, 0, 0.5]} color={0x0088ff} intensity={0.3} distance={0.5} />
    </group>
  );
}
