'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useOrbStore } from '@/stores/useOrbStore';

interface SatelliteProps {
  position: THREE.Vector3;
  sunDirection: THREE.Vector3;
}

const DEG_TO_RAD = Math.PI / 180;

// Preload
useGLTF.preload('/models/satellite.glb');

export default function Satellite({ position }: SatelliteProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { scene } = useGLTF('/models/satellite.glb');

  // Clone the scene so we don't share materials/transform across instances
  const model = useMemo(() => {
    const cloned = scene.clone(true);
    // Deep-clone materials so each Canvas instance has its own copies
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
      }
    });
    // Normalize the model into a unit-ish box so our scale constant is meaningful
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const norm = 2 / maxDim; // fit into a ~2 unit cube
    cloned.position.sub(center.multiplyScalar(norm));
    cloned.scale.setScalar(norm);
    return cloned;
  }, [scene]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.copy(position);
    // Base orientation: nadir-facing.
    group.lookAt(0, 0, 0);
    // Layer the HarmonyOS remote-station attitude on top so the operator can
    // steer the craft by tilting their phone. Values come from the zustand
    // store updated by useRemoteLink().
    const { attitudePitch, attitudeRoll, attitudeYaw, remoteLinkState } =
      useOrbStore.getState();
    if (remoteLinkState === 'connected') {
      group.rotateX(attitudePitch * DEG_TO_RAD);
      group.rotateY(attitudeYaw * DEG_TO_RAD);
      group.rotateZ(attitudeRoll * DEG_TO_RAD);
    }
  });

  const scale = 0.06;

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      <primitive object={model} />
      <pointLight position={[0, 0, 1.2]} color={0x0088ff} intensity={0.4} distance={1.2} />
    </group>
  );
}
