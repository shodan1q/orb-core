'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useOrbStore } from '@/stores/useOrbStore';

// Sun ray beam (sun -> satellite)
export function SunRay({
  satellitePos,
  sunDirection,
}: {
  satellitePos: THREE.Vector3;
  sunDirection: THREE.Vector3;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const reflectionActive = useOrbStore((s) => s.reflectionActive);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xffdd44),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;

    if (reflectionActive) {
      material.opacity = Math.min(material.opacity + 0.02, 0.3);
    } else {
      material.opacity = Math.max(material.opacity - 0.02, 0);
    }

    if (material.opacity <= 0) return;

    // Position beam between sun direction and satellite
    const sunPos = sunDirection.clone().multiplyScalar(8);
    const mid = sunPos.clone().add(satellitePos).multiplyScalar(0.5);
    const dist = sunPos.distanceTo(satellitePos);

    ref.current.position.copy(mid);
    ref.current.lookAt(satellitePos);
    ref.current.scale.set(0.02 + Math.sin(clock.getElapsedTime() * 3) * 0.005, 0.02, dist);
  });

  return (
    <mesh ref={ref} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

// Reflection beam (satellite -> ground target)
export function ReflectionBeam({
  satellitePos,
  targetPos,
}: {
  satellitePos: THREE.Vector3;
  targetPos: THREE.Vector3 | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const spotRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const reflectionActive = useOrbStore((s) => s.reflectionActive);

  const beamMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(0xddeeff) },
          progress: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color;
          uniform float progress;
          varying vec2 vUv;
          void main() {
            if (vUv.y > progress) discard;
            float centerDist = abs(vUv.x - 0.5) * 2.0;
            float beam = exp(-centerDist * centerDist * 8.0);
            float flow = sin(vUv.y * 30.0 - time * 4.0) * 0.2 + 0.8;
            float fadeEnd = smoothstep(progress, progress - 0.1, vUv.y);
            gl_FragColor = vec4(color * beam * flow, beam * 0.6 * fadeEnd);
          }
        `,
      }),
    []
  );

  const spotMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          intensity: { value: 0 },
          time: { value: 0 },
          color: { value: new THREE.Color(1.0, 0.95, 0.85) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float intensity;
          uniform float time;
          uniform vec3 color;
          varying vec2 vUv;
          void main() {
            float dist = length(vUv - 0.5) * 2.0;
            float brightness = (1.0 - smoothstep(0.0, 1.0, dist)) * intensity;
            brightness *= 0.9 + 0.1 * sin(time * 3.0 + dist * 10.0);
            gl_FragColor = vec4(color * brightness, brightness * 0.8);
          }
        `,
      }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (reflectionActive && targetPos) {
      progressRef.current = Math.min(progressRef.current + 0.008, 1);
    } else {
      progressRef.current = Math.max(progressRef.current - 0.015, 0);
    }

    beamMaterial.uniforms.time.value = t;
    beamMaterial.uniforms.progress.value = progressRef.current;

    spotMaterial.uniforms.time.value = t;
    spotMaterial.uniforms.intensity.value = Math.max(0, (progressRef.current - 0.7) / 0.3);

    if (beamRef.current && targetPos) {
      const mid = satellitePos.clone().add(targetPos).multiplyScalar(0.5);
      const dist = satellitePos.distanceTo(targetPos);
      beamRef.current.position.copy(mid);
      beamRef.current.lookAt(targetPos);
      beamRef.current.rotateX(Math.PI / 2);
      beamRef.current.scale.set(0.08, dist, 1);
    }

    if (spotRef.current && targetPos) {
      spotRef.current.position.copy(targetPos.clone().multiplyScalar(1.005));
      spotRef.current.lookAt(0, 0, 0);
    }
  });

  if (!targetPos) return null;

  return (
    <group ref={groupRef}>
      {/* Reflection beam */}
      <mesh ref={beamRef} material={beamMaterial}>
        <planeGeometry args={[1, 1, 1, 32]} />
      </mesh>

      {/* Ground spot */}
      <mesh ref={spotRef} material={spotMaterial}>
        <circleGeometry args={[0.15, 32]} />
      </mesh>

      {/* Ground spot point light */}
      {progressRef.current > 0.7 && (
        <pointLight
          position={targetPos.clone().multiplyScalar(1.01).toArray()}
          color={0xffeedd}
          intensity={progressRef.current * 0.5}
          distance={1}
        />
      )}
    </group>
  );
}

// Scan cone for photo mode
export function ScanCone({
  satellitePos,
  targetPos,
  active,
}: {
  satellitePos: THREE.Vector3;
  targetPos: THREE.Vector3 | null;
  active: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(0x00d4ff) },
          opacity: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color;
          uniform float opacity;
          varying vec2 vUv;
          void main() {
            float alpha = vUv.y * 0.25;
            float scanLine = step(0.97, fract(vUv.y * 20.0 - time * 2.0));
            alpha += scanLine * 0.4;
            alpha *= opacity;
            gl_FragColor = vec4(color, alpha);
          }
        `,
      }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    material.uniforms.time.value = t;

    if (active && targetPos) {
      progressRef.current = Math.min(progressRef.current + 0.015, 1);
    } else {
      progressRef.current = Math.max(progressRef.current - 0.025, 0);
    }

    material.uniforms.opacity.value = progressRef.current;

    if (ref.current && targetPos) {
      const dist = satellitePos.distanceTo(targetPos);
      ref.current.position.copy(satellitePos);
      ref.current.lookAt(targetPos);
      ref.current.rotateX(Math.PI / 2);
      ref.current.scale.set(
        0.15 * progressRef.current,
        dist * progressRef.current,
        0.15 * progressRef.current
      );
    }
  });

  if (!targetPos) return null;

  return (
    <mesh ref={ref} material={material}>
      <coneGeometry args={[1, 1, 32, 1, true]} />
    </mesh>
  );
}
