'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getOrbitPoints } from '@/utils/orbital';

export default function OrbitTrail({ timeRef }: { timeRef: React.MutableRefObject<number> }) {
  const lineObjRef = useRef<THREE.Line | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  const { geometry, material } = useMemo(() => {
    const points = getOrbitPoints(0, 300);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.3,
    });
    return { geometry: geo, material: mat };
  }, []);

  useEffect(() => {
    if (groupRef.current) {
      const line = new THREE.Line(geometry, material);
      lineObjRef.current = line;
      groupRef.current.add(line);
      return () => {
        groupRef.current?.remove(line);
      };
    }
  }, [geometry, material]);

  useFrame(() => {
    if (lineObjRef.current) {
      const points = getOrbitPoints(timeRef.current, 300);
      const positions = lineObjRef.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < points.length; i++) {
        positions.setXYZ(i, points[i].x, points[i].y, points[i].z);
      }
      positions.needsUpdate = true;
    }
  });

  return <group ref={groupRef} />;
}
