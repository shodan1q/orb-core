'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Satellite trail particles
export function TrailParticles({ positionRef }: { positionRef: React.MutableRefObject<THREE.Vector3> }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 200;

  const { positions, opacities, geometry } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const opa = new Float32Array(count);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('opacity', new THREE.BufferAttribute(opa, 1));
    return { positions: pos, opacities: opa, geometry: geo };
  }, []);

  const indexRef = useRef(0);

  useFrame(() => {
    const i = indexRef.current % count;
    const pos = positionRef.current;

    // Add new particle at satellite position with slight randomness
    positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.02;
    positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.02;
    positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.02;
    opacities[i] = 1.0;

    // Fade all particles
    for (let j = 0; j < count; j++) {
      opacities[j] *= 0.985;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.opacity.needsUpdate = true;
    indexRef.current++;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={0x00ccff}
        size={0.015}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// Energy flow particles (between solar panel and body)
export function EnergyParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 100;

  const { positions, geometry } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { positions: pos, geometry: geo };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      positions[i * 3] = Math.sin(t * 2 + i * 0.5) * 0.15;
      positions[i * 3 + 1] = ((t * 0.5 + i * 0.1) % 1 - 0.5) * 0.2;
      positions[i * 3 + 2] = Math.cos(t * 2 + i * 0.5) * 0.15;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={0xffdd00}
        size={0.008}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
