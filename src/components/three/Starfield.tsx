'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Starfield() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 3000;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 30 + Math.random() * 20;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const colorType = Math.random();
      if (colorType < 0.6) {
        col[i * 3] = 0.9 + Math.random() * 0.1;
        col[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        col[i * 3 + 2] = 1.0;
      } else if (colorType < 0.85) {
        col[i * 3] = 0.6 + Math.random() * 0.2;
        col[i * 3 + 1] = 0.7 + Math.random() * 0.2;
        col[i * 3 + 2] = 1.0;
      } else {
        col[i * 3] = 1.0;
        col[i * 3 + 1] = 0.8 + Math.random() * 0.15;
        col[i * 3 + 2] = 0.6 + Math.random() * 0.2;
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.001;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function MilkyWay() {
  const ref = useRef<THREE.Points>(null);
  const count = 5000;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spread = (Math.random() - 0.5) * 4;
      const r = 25 + Math.random() * 15;

      pos[i * 3] = r * Math.cos(angle);
      pos[i * 3 + 1] = spread + Math.sin(angle * 2) * 2;
      pos[i * 3 + 2] = r * Math.sin(angle);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <points ref={ref} rotation={[0.3, 0, 0.8]} geometry={geometry}>
      <pointsMaterial
        color={0x8899cc}
        size={0.04}
        transparent
        opacity={0.2}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
