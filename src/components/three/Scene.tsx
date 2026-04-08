'use client';

import React, { useRef, Suspense, memo, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Satellite from './Satellite';
import { getSatellitePosition, getSunDirection, latLngToCartesian } from '@/utils/orbital';
import { useOrbStore } from '@/stores/useOrbStore';
import {
  earthVertexShader,
  earthFragmentShader,
  atmosphereVertexShader,
  atmosphereFragmentShader,
} from '@/shaders/earth';
import { SunRay, ReflectionBeam, ScanCone } from './LightEffects';

/* ------------------------------------------------------------------ */
/*  Earth – real NASA textures with day/night blending shader          */
/* ------------------------------------------------------------------ */
function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmoRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const atmoMatRef = useRef<THREE.ShaderMaterial | null>(null);

  const earthGeo = useMemo(() => new THREE.SphereGeometry(2, 128, 128), []);
  const atmoGeo = useMemo(() => new THREE.SphereGeometry(2.06, 64, 64), []);

  // Load textures once
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const opts = (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      return tex;
    };
    return {
      day: opts(loader.load('/textures/earth-day.jpg')),
      night: opts(loader.load('/textures/earth-night.jpg')),
      bump: loader.load('/textures/earth-topology.png'),
      specular: loader.load('/textures/earth-water.png'),
    };
  }, []);

  // Create materials once after textures are ready
  const earthMat = useMemo(
    () => {
      const m = new THREE.ShaderMaterial({
        vertexShader: earthVertexShader,
        fragmentShader: earthFragmentShader,
        uniforms: {
          dayTexture: { value: textures.day },
          nightTexture: { value: textures.night },
          bumpTexture: { value: textures.bump },
          specularTexture: { value: textures.specular },
          sunDirection: { value: new THREE.Vector3(1, 0.3, 0).normalize() },
          time: { value: 0 },
        },
      });
      matRef.current = m;
      return m;
    },
    [textures]
  );

  const atmoMat = useMemo(
    () => {
      const m = new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        uniforms: {
          sunDirection: { value: new THREE.Vector3(1, 0.3, 0).normalize() },
        },
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      atmoMatRef.current = m;
      return m;
    },
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const sunDir = getSunDirection(t * 15);

    if (matRef.current) {
      matRef.current.uniforms.sunDirection.value.copy(sunDir);
      matRef.current.uniforms.time.value = t;
    }
    if (atmoMatRef.current) {
      atmoMatRef.current.uniforms.sunDirection.value.copy(sunDir);
    }

    if (meshRef.current) meshRef.current.rotation.y = t * 0.06;
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={earthGeo} material={earthMat} />
      <mesh ref={atmoRef} geometry={atmoGeo} material={atmoMat} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Starfield – pure geometry, no store                               */
/* ------------------------------------------------------------------ */
function Stars() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = 3000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 30 + Math.random() * 20;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const c = 0.7 + Math.random() * 0.3;
      col[i * 3] = c;
      col[i * 3 + 1] = c;
      col[i * 3 + 2] = 1;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    []
  );

  return <points geometry={geo} material={mat} />;
}

/* ------------------------------------------------------------------ */
/*  Milky Way band                                                     */
/* ------------------------------------------------------------------ */
function MilkyWayBand() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = 5000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spread = (Math.random() - 0.5) * 4;
      const r = 25 + Math.random() * 15;
      pos[i * 3] = r * Math.cos(angle);
      pos[i * 3 + 1] = spread + Math.sin(angle * 2) * 2;
      pos[i * 3 + 2] = r * Math.sin(angle);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0x8899cc,
        size: 0.04,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    []
  );

  return <points geometry={geo} material={mat} rotation={[0.3, 0, 0.8]} />;
}

/* ------------------------------------------------------------------ */
/*  Orbit trail – imperative THREE.Line                                */
/* ------------------------------------------------------------------ */
function OrbitPath() {
  const groupRef = useRef<THREE.Group>(null);
  const lineRef = useRef<THREE.Line | null>(null);

  const { geo, mat } = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const period = 92 * 60;
    for (let i = 0; i <= 300; i++) {
      points.push(getSatellitePosition(i * (period / 300)));
    }
    return {
      geo: new THREE.BufferGeometry().setFromPoints(points),
      mat: new THREE.LineBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.25 }),
    };
  }, []);

  React.useEffect(() => {
    if (!groupRef.current) return;
    const line = new THREE.Line(geo, mat);
    lineRef.current = line;
    groupRef.current.add(line);
    return () => {
      groupRef.current?.remove(line);
    };
  }, [geo, mat]);

  return <group ref={groupRef} />;
}

/* ------------------------------------------------------------------ */
/*  Trail particles                                                    */
/* ------------------------------------------------------------------ */
function Trail({ posRef }: { posRef: React.MutableRefObject<THREE.Vector3> }) {
  const count = 200;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, []);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0x00ccff,
        size: 0.015,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    []
  );

  const idxRef = useRef(0);
  const opacities = useRef(new Float32Array(count).fill(0));

  useFrame(() => {
    const positions = geo.attributes.position as THREE.BufferAttribute;
    const i = idxRef.current % count;
    const p = posRef.current;
    positions.setXYZ(i, p.x + (Math.random() - 0.5) * 0.02, p.y + (Math.random() - 0.5) * 0.02, p.z + (Math.random() - 0.5) * 0.02);
    positions.needsUpdate = true;
    idxRef.current++;
  });

  return <points geometry={geo} material={mat} />;
}

/* ------------------------------------------------------------------ */
/*  Effects layer (store-dependent, isolated)                          */
/* ------------------------------------------------------------------ */
function Effects({
  satPosRef,
  sunDirRef,
}: {
  satPosRef: React.MutableRefObject<THREE.Vector3>;
  sunDirRef: React.MutableRefObject<THREE.Vector3>;
}) {
  const phase = useOrbStore((s) => s.phase);
  const targetLat = useOrbStore((s) => s.targetLat);
  const targetLng = useOrbStore((s) => s.targetLng);

  const targetPos =
    targetLat !== null && targetLng !== null
      ? latLngToCartesian(targetLat, targetLng, 2.02)
      : null;

  return (
    <>
      <SunRay satellitePos={satPosRef.current} sunDirection={sunDirRef.current} />
      <ReflectionBeam satellitePos={satPosRef.current} targetPos={targetPos} />
      <ScanCone satellitePos={satPosRef.current} targetPos={targetPos} active={phase === 'photo-sequence'} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Store sync (isolated – calls store.getState directly)              */
/* ------------------------------------------------------------------ */
function StoreSync({ satPosRef }: { satPosRef: React.MutableRefObject<THREE.Vector3> }) {
  const last = useRef(0);
  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    if (now - last.current < 0.5) return;
    last.current = now;
    const s = satPosRef.current;
    const lat = Math.asin(s.y / s.length()) * (180 / Math.PI);
    const lng = Math.atan2(s.z, s.x) * (180 / Math.PI);
    const alt = (s.length() - 2.0) * 6371;
    useOrbStore.getState().updateSatellitePosition(lat, lng, alt, 7.66);
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  NEW: Shooting Stars / Meteors                                      */
/* ------------------------------------------------------------------ */
interface MeteorState {
  active: boolean;
  startPos: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  progress: number;
  length: number;
  spawnDelay: number;
  elapsed: number;
}

function ShootingStars() {
  const COUNT = 5;

  // Each meteor is a line segment: head + trail points
  const TRAIL_SEGS = 12;
  const groupRef = useRef<THREE.Group>(null);

  // We build COUNT line objects imperatively so we can update positions per frame
  const linesRef = useRef<THREE.Line[]>([]);
  const meteorsRef = useRef<MeteorState[]>([]);

  // Shared additive material (white/blue-white)
  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0xddeeff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: false,
      }),
    []
  );

  // Helper: randomise a meteor state
  const randomMeteor = (elapsed: number): MeteorState => {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 28 + Math.random() * 12;
    const startPos = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    // Direction: mostly inward with a slight tangential drift
    const inward = startPos.clone().negate().normalize();
    const tangent = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    )
      .cross(inward)
      .normalize();
    const dir = inward
      .clone()
      .multiplyScalar(0.7 + Math.random() * 0.3)
      .add(tangent.multiplyScalar(0.15 + Math.random() * 0.25))
      .normalize();
    return {
      active: true,
      startPos,
      dir,
      speed: 12 + Math.random() * 18,
      progress: 0,
      length: 1.5 + Math.random() * 2.5,
      spawnDelay: Math.random() * 4,
      elapsed,
    };
  };

  React.useEffect(() => {
    if (!groupRef.current) return;

    // Build line objects
    for (let i = 0; i < COUNT; i++) {
      const positions = new Float32Array((TRAIL_SEGS + 1) * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      groupRef.current.add(line);
      linesRef.current.push(line);
      meteorsRef.current.push(randomMeteor(-(Math.random() * 6)));
    }

    return () => {
      linesRef.current.forEach((l) => groupRef.current?.remove(l));
      linesRef.current = [];
      meteorsRef.current = [];
    };
  }, [mat]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    for (let i = 0; i < COUNT; i++) {
      const m = meteorsRef.current[i];
      const line = linesRef.current[i];
      if (!line) continue;

      m.elapsed += delta;

      // Respawn after delay
      if (!m.active || m.progress > m.length + 2) {
        if (m.elapsed > m.spawnDelay + m.length / m.speed + 0.5) {
          meteorsRef.current[i] = randomMeteor(0);
          meteorsRef.current[i].elapsed = 0;
          continue;
        }
        // Hide while waiting
        const attr = line.geometry.attributes.position as THREE.BufferAttribute;
        for (let j = 0; j <= TRAIL_SEGS; j++) attr.setXYZ(j, 0, 0, 0);
        attr.needsUpdate = true;
        continue;
      }

      if (m.elapsed < m.spawnDelay) {
        // Not yet spawned
        const attr = line.geometry.attributes.position as THREE.BufferAttribute;
        for (let j = 0; j <= TRAIL_SEGS; j++) attr.setXYZ(j, 0, 0, 0);
        attr.needsUpdate = true;
        continue;
      }

      m.progress += m.speed * delta;

      const head = m.startPos.clone().addScaledVector(m.dir, m.progress);
      const attr = line.geometry.attributes.position as THREE.BufferAttribute;

      for (let j = 0; j <= TRAIL_SEGS; j++) {
        const frac = j / TRAIL_SEGS;
        const trailOffset = m.progress - frac * m.length;
        if (trailOffset < 0) {
          attr.setXYZ(j, head.x, head.y, head.z);
        } else {
          const p = m.startPos.clone().addScaledVector(m.dir, trailOffset);
          attr.setXYZ(j, p.x, p.y, p.z);
        }
      }
      attr.needsUpdate = true;

      // Fade based on progress relative to total travel
      const totalTravel = m.length + 3;
      const fade = 1 - Math.max(0, m.progress - m.length) / 3;
      (line.material as THREE.LineBasicMaterial).opacity = Math.min(0.9, fade * 0.9);
    }
  });

  return <group ref={groupRef} />;
}

/* ------------------------------------------------------------------ */
/*  NEW: Satellite Glow Ring                                            */
/* ------------------------------------------------------------------ */
function SatelliteGlowRing({
  satPosRef,
}: {
  satPosRef: React.MutableRefObject<THREE.Vector3>;
}) {
  const ringGroupRef = useRef<THREE.Group>(null);

  // Outer holographic ring
  const { ringGeo, ringMat, innerRingGeo, innerRingMat } = useMemo(() => {
    const outerGeo = new THREE.TorusGeometry(0.12, 0.006, 8, 64);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00ffee,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const innerGeo = new THREE.TorusGeometry(0.08, 0.003, 8, 48);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x44ffdd,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return {
      ringGeo: outerGeo,
      ringMat: outerMat,
      innerRingGeo: innerGeo,
      innerRingMat: innerMat,
    };
  }, []);

  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pos = satPosRef.current;

    if (!ringGroupRef.current) return;

    // Follow satellite position
    ringGroupRef.current.position.copy(pos);

    // Orient ring to face outward (normal along radial direction)
    const up = new THREE.Vector3(0, 1, 0);
    const radial = pos.clone().normalize();
    const axis = new THREE.Vector3().crossVectors(up, radial).normalize();
    const angle = up.angleTo(radial);
    ringGroupRef.current.setRotationFromAxisAngle(axis, angle);

    // Slow rotation of the ring itself
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 0.4;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = -t * 0.7;
    }

    // Pulse opacity
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
    ringMat.opacity = 0.4 + pulse * 0.4;
    innerRingMat.opacity = 0.3 + pulse * 0.25;
  });

  return (
    <group ref={ringGroupRef}>
      <mesh ref={outerRingRef} geometry={ringGeo} material={ringMat} />
      <mesh ref={innerRingRef} geometry={innerRingGeo} material={innerRingMat} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  NEW: Gradient Glow Orbit Trail                                     */
/* ------------------------------------------------------------------ */
function GlowOrbitTrail({
  satPosRef,
}: {
  satPosRef: React.MutableRefObject<THREE.Vector3>;
}) {
  const TRAIL_COUNT = 120;

  const { geo, mat } = useMemo(() => {
    const positions = new Float32Array(TRAIL_COUNT * 3);
    const colors = new Float32Array(TRAIL_COUNT * 3);

    // Initialise all at origin; will be filled in useFrame
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const m = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1,
    });

    return { geo: g, mat: m };
  }, []);

  // Ring buffer of past positions
  const historyRef = useRef<THREE.Vector3[]>(
    Array.from({ length: TRAIL_COUNT }, () => new THREE.Vector3())
  );
  const headIdxRef = useRef(0);

  const trailGroupRef = useRef<THREE.Group>(null);
  const trailLineRef = useRef<THREE.Line | null>(null);

  React.useEffect(() => {
    if (!trailGroupRef.current) return;
    const lineObj = new THREE.Line(geo, mat);
    lineObj.frustumCulled = false;
    trailLineRef.current = lineObj;
    trailGroupRef.current.add(lineObj);
    return () => {
      trailGroupRef.current?.remove(lineObj);
    };
  }, [geo, mat]);

  useFrame(() => {
    const pos = satPosRef.current;
    const idx = headIdxRef.current;
    historyRef.current[idx].copy(pos);
    headIdxRef.current = (idx + 1) % TRAIL_COUNT;

    if (!trailLineRef.current) return;
    const positions = trailLineRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const colors = trailLineRef.current.geometry.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const histIdx = (headIdxRef.current - 1 - i + TRAIL_COUNT) % TRAIL_COUNT;
      const p = historyRef.current[histIdx];
      positions.setXYZ(i, p.x, p.y, p.z);

      const frac = 1 - i / (TRAIL_COUNT - 1);
      const brightness = frac * frac;
      colors.setXYZ(i, brightness * 0.0, brightness * 0.85, brightness * 1.0);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
  });

  return <group ref={trailGroupRef} />;
}

/* ------------------------------------------------------------------ */
/*  NEW: Energy Particle Field (solar wind toward satellite)           */
/* ------------------------------------------------------------------ */
function EnergyParticleField({
  satPosRef,
  sunDirRef,
}: {
  satPosRef: React.MutableRefObject<THREE.Vector3>;
  sunDirRef: React.MutableRefObject<THREE.Vector3>;
}) {
  const PARTICLE_COUNT = 80;

  const { geo, mat } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const m = new THREE.PointsMaterial({
      color: 0xffcc44,
      size: 0.025,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    return { geo: g, mat: m };
  }, []);

  // Each particle: progress [0,1], offset from the beam axis
  const particleDataRef = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      progress: Math.random(),
      offsetX: (Math.random() - 0.5) * 0.25,
      offsetY: (Math.random() - 0.5) * 0.25,
      speed: 0.3 + Math.random() * 0.5,
    }))
  );

  useFrame(({ clock }, delta) => {
    const satPos = satPosRef.current;
    const sunDir = sunDirRef.current;

    // Sun source: far in the sun direction
    const sunSource = sunDir.clone().multiplyScalar(8);

    // Direction from sun toward satellite
    const beam = satPos.clone().sub(sunSource).normalize();
    const beamLength = satPos.distanceTo(sunSource);

    // Build a local frame for the beam (to apply radial offsets)
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(beam, worldUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, beam).normalize();

    const positions = geo.attributes.position as THREE.BufferAttribute;
    const data = particleDataRef.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      data[i].progress += data[i].speed * delta;
      if (data[i].progress > 1) {
        data[i].progress = 0;
        data[i].offsetX = (Math.random() - 0.5) * 0.25;
        data[i].offsetY = (Math.random() - 0.5) * 0.25;
        data[i].speed = 0.3 + Math.random() * 0.5;
      }

      const t = data[i].progress;
      // Convergence: particles start spread, converge toward satellite
      const spread = 1 - t * 0.85;
      const along = sunSource.clone().addScaledVector(beam, t * beamLength);
      const px = along.x + right.x * data[i].offsetX * spread + up.x * data[i].offsetY * spread;
      const py = along.y + right.y * data[i].offsetX * spread + up.y * data[i].offsetY * spread;
      const pz = along.z + right.z * data[i].offsetX * spread + up.z * data[i].offsetY * spread;

      positions.setXYZ(i, px, py, pz);
    }

    positions.needsUpdate = true;

    // Fade out near the satellite so they don't clutter it
  });

  return <points geometry={geo} material={mat} />;
}

/* ------------------------------------------------------------------ */
/*  NEW: Subtle Nebula Clouds                                           */
/* ------------------------------------------------------------------ */
function NebulaClouds() {
  // Each cloud is a billboard sprite quad with a radial gradient texture
  const CLOUD_DEFS = useMemo(
    () => [
      // { pos, color hex, scale, rotation }
      { pos: new THREE.Vector3(22, 8, -18),  color: 0x6622aa, scale: 14, rot: 0.3 },
      { pos: new THREE.Vector3(-20, -6, 20), color: 0x224488, scale: 12, rot: 1.1 },
      { pos: new THREE.Vector3(10, 18, 15),  color: 0xaa2266, scale: 10, rot: 2.0 },
      { pos: new THREE.Vector3(-15, 12, -20),color: 0x113366, scale: 16, rot: 0.7 },
      { pos: new THREE.Vector3(5, -20, -22), color: 0x331155, scale: 11, rot: 1.8 },
    ],
    []
  );

  // Build a soft radial gradient texture once
  const cloudTexture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  const meshes = useMemo(
    () =>
      CLOUD_DEFS.map((def) => ({
        geo: new THREE.PlaneGeometry(def.scale, def.scale),
        mat: new THREE.MeshBasicMaterial({
          map: cloudTexture,
          color: def.color,
          transparent: true,
          opacity: 0.05,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
        pos: def.pos,
        rot: def.rot,
      })),
    [CLOUD_DEFS, cloudTexture]
  );

  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      // Very slow drift
      groupRef.current.rotation.y = t * 0.003;
      groupRef.current.rotation.x = Math.sin(t * 0.002) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {meshes.map((m, i) => (
        <mesh
          key={i}
          geometry={m.geo}
          material={m.mat}
          position={m.pos}
          rotation={[m.rot * 0.5, m.rot, m.rot * 0.3]}
        />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Main scene orchestrator                                            */
/* ------------------------------------------------------------------ */
function Scene() {
  const satPosRef = useRef(new THREE.Vector3(2.5, 0, 0));
  const sunDirRef = useRef(new THREE.Vector3(1, 0.3, 0));

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 15;
    satPosRef.current.copy(getSatellitePosition(t));
    sunDirRef.current.copy(getSunDirection(t));
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 3, 5]} intensity={2.8} color={0xfff5e0} />

      <NebulaClouds />
      <Stars />
      <MilkyWayBand />
      <ShootingStars />
      <Earth />
      <OrbitPath />
      <GlowOrbitTrail satPosRef={satPosRef} />
      <Satellite position={satPosRef.current} sunDirection={sunDirRef.current} />
      <SatelliteGlowRing satPosRef={satPosRef} />
      <Trail posRef={satPosRef} />
      <EnergyParticleField satPosRef={satPosRef} sunDirRef={sunDirRef} />
      <Effects satPosRef={satPosRef} sunDirRef={sunDirRef} />
      <StoreSync satPosRef={satPosRef} />

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={12}
        autoRotate
        autoRotateSpeed={0.2}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Canvas wrapper                                                     */
/* ------------------------------------------------------------------ */
export default function OrbScene() {
  return (
    <div className="absolute inset-0" style={{ isolation: 'isolate' }}>
      <Canvas
        camera={{ position: [0, 2, 6], fov: 45, near: 0.1, far: 100 }}
        flat
        frameloop="always"
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ background: '#000005' }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {/* CSS vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,5,0.45) 100%)',
        }}
      />
    </div>
  );
}
