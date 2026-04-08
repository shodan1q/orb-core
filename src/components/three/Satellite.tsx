'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface SatelliteProps {
  position: THREE.Vector3;
  sunDirection: THREE.Vector3;
}

// Preload
useGLTF.preload('/models/satellite.glb');

export default function Satellite({ position }: SatelliteProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { scene } = useGLTF('/models/satellite.glb');

  // Clone the scene so we don't share materials/transform across instances
  const model = useMemo(() => {
    const cloned = scene.clone(true);
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
    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.lookAt(0, 0, 0);
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
