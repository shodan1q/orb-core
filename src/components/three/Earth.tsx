'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  earthVertexShader,
  earthFragmentShader,
  atmosphereVertexShader,
  atmosphereFragmentShader,
} from '@/shaders/earth';
import { getSunDirection } from '@/utils/orbital';

export default function Earth({ timeRef }: { timeRef: React.MutableRefObject<number> }) {
  const earthRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  const earthMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: earthVertexShader,
        fragmentShader: earthFragmentShader,
        uniforms: {
          sunDirection: { value: new THREE.Vector3(1, 0.3, 0).normalize() },
          time: { value: 0 },
        },
      }),
    []
  );

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        uniforms: {
          sunDirection: { value: new THREE.Vector3(1, 0.3, 0).normalize() },
        },
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  useFrame(() => {
    const t = timeRef.current;
    const sunDir = getSunDirection(t);

    earthMaterial.uniforms.sunDirection.value.copy(sunDir);
    earthMaterial.uniforms.time.value = t;
    atmosphereMaterial.uniforms.sunDirection.value.copy(sunDir);

    if (earthRef.current) {
      earthRef.current.rotation.y = t * 0.005;
    }
  });

  return (
    <group>
      <mesh ref={earthRef} material={earthMaterial}>
        <sphereGeometry args={[2, 128, 128]} />
      </mesh>

      <mesh ref={atmosphereRef} scale={[1.025, 1.025, 1.025]} material={atmosphereMaterial}>
        <sphereGeometry args={[2, 64, 64]} />
      </mesh>
    </group>
  );
}
