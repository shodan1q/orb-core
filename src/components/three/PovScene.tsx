'use client';

import { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { earthVertexShader, earthFragmentShader } from '@/shaders/earth';

import type { PovTarget } from '@/app/pov/page';

/* ------------------------------------------------------------------ */
/*  固定天体位置                                                         */
/* ------------------------------------------------------------------ */
const EARTH_POS = new THREE.Vector3(0, 0, 0);
const MOON_POS = new THREE.Vector3(9, 1.2, -4);
const SUN_POS = new THREE.Vector3(60, 10, 40);
// 深空只是从地球向外的一个方向
const DEEPSPACE_POS = new THREE.Vector3(-35, 5, -45);

// 卫星自身基准位置 (相对地球)
const SAT_ORBIT_RADIUS = 2.8;

/* ------------------------------------------------------------------ */
/*  Earth                                                               */
/* ------------------------------------------------------------------ */
function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);
  const earthMatRef = useRef<THREE.ShaderMaterial | null>(null);

  const geo = useMemo(() => new THREE.SphereGeometry(2, 128, 128), []);

  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const opts = (t: THREE.Texture) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    };
    return {
      day: opts(loader.load('/textures/earth-day.jpg')),
      night: opts(loader.load('/textures/earth-night.jpg')),
      bump: loader.load('/textures/earth-topology.png'),
      specular: loader.load('/textures/earth-water.png'),
    };
  }, []);

  const earthMat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      vertexShader: earthVertexShader,
      fragmentShader: earthFragmentShader,
      uniforms: {
        dayTexture: { value: textures.day },
        nightTexture: { value: textures.night },
        bumpTexture: { value: textures.bump },
        specularTexture: { value: textures.specular },
        sunDirection: { value: SUN_POS.clone().normalize() },
        time: { value: 0 },
      },
    });
    earthMatRef.current = m;
    return m;
  }, [textures]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) meshRef.current.rotation.y = t * 0.04;
    if (earthMatRef.current) {
      earthMatRef.current.uniforms.time.value = t;
    }
  });

  return (
    <group position={EARTH_POS}>
      <mesh ref={meshRef} geometry={geo} material={earthMat} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Moon                                                                */
/* ------------------------------------------------------------------ */
function Moon() {
  const meshRef = useRef<THREE.Mesh>(null);

  // 用 procedural noise texture 做月面斑驳
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    // 基底
    ctx.fillStyle = '#b8b4a8';
    ctx.fillRect(0, 0, size, size);
    // 随机陨石坑
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 2 + Math.random() * 14;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(60,55,50,${0.3 + Math.random() * 0.4})`);
      grd.addColorStop(1, 'rgba(120,115,105,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 亮斑
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 1 + Math.random() * 5;
      ctx.fillStyle = `rgba(230,225,210,${0.08 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 1,
        metalness: 0,
        emissive: new THREE.Color(0x222222),
        emissiveIntensity: 0.1,
      }),
    [texture]
  );

  useFrame(({ clock }) => {
    if (meshRef.current) meshRef.current.rotation.y = clock.getElapsedTime() * 0.015;
  });

  return (
    <mesh ref={meshRef} position={MOON_POS}>
      <sphereGeometry args={[1.1, 64, 64]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Sun                                                                 */
/* ------------------------------------------------------------------ */
function Sun() {
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // 太阳核心 (非常亮)
  const coreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(6, 4.5, 2), // HDR 值, 超过 1 来产生过曝感
      }),
    []
  );

  // 外层辉光 sprite-like sphere
  const glowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        uniforms: {
          color: { value: new THREE.Color(1.0, 0.7, 0.3) },
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.75 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
            gl_FragColor = vec4(color, intensity * 0.9);
          }
        `,
      }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) coreRef.current.rotation.y = t * 0.05;
    if (glowRef.current) {
      const s = 1 + 0.04 * Math.sin(t * 1.5);
      glowRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group position={SUN_POS}>
      <mesh ref={coreRef} material={coreMat}>
        <sphereGeometry args={[3, 48, 48]} />
      </mesh>
      <mesh ref={glowRef} material={glowMat}>
        <sphereGeometry args={[5.5, 48, 48]} />
      </mesh>
      {/* 实际光源, 照亮地球/月球 */}
      <pointLight color={0xffeecc} intensity={120} distance={200} decay={0.8} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Stars                                                               */
/* ------------------------------------------------------------------ */
function Starfield() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = 6000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 40;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const c = 0.7 + Math.random() * 0.3;
      col[i * 3] = c;
      col[i * 3 + 1] = c;
      col[i * 3 + 2] = Math.min(1, c + 0.15);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.18,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    []
  );

  return <points geometry={geo} material={mat} />;
}

/* ------------------------------------------------------------------ */
/*  Milky Way (dense band of stars + dust clouds)                      */
/* ------------------------------------------------------------------ */
function MilkyWay() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = 10000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spread = (Math.random() - 0.5) * 6;
      const r = 70 + Math.random() * 30;
      pos[i * 3] = r * Math.cos(angle);
      pos[i * 3 + 1] = spread + Math.sin(angle * 3) * 1.5;
      pos[i * 3 + 2] = r * Math.sin(angle);
      const v = 0.4 + Math.random() * 0.6;
      col[i * 3] = v * 0.6;
      col[i * 3 + 1] = v * 0.7;
      col[i * 3 + 2] = v;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.09,
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    []
  );

  return <points geometry={geo} material={mat} rotation={[0.3, 0, 0.8]} />;
}

/* ------------------------------------------------------------------ */
/*  Satellite hull foreground (partial, bottom of frame)                */
/*  让画面底部有一点卫星结构, 增强"从卫星上看"的沉浸感                      */
/* ------------------------------------------------------------------ */
function SatelliteHullFrame() {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    // 始终挂在相机下方前方
    groupRef.current.position.copy(camera.position);
    groupRef.current.quaternion.copy(camera.quaternion);
    groupRef.current.translateY(-0.35);
    groupRef.current.translateZ(-0.8);
  });

  return (
    <group ref={groupRef}>
      {/* 相机镜头前圈 */}
      <mesh>
        <torusGeometry args={[0.25, 0.02, 12, 32]} />
        <meshStandardMaterial color={0x444444} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* 镜头壳 */}
      <mesh position={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.23, 0.27, 0.15, 24, 1, true]} />
        <meshStandardMaterial
          color={0x222222}
          metalness={0.7}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 小红点 REC 指示灯 */}
      <mesh position={[0.15, -0.15, 0]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshBasicMaterial color={0xff3344} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Camera controller — smoothly follow targets                         */
/* ------------------------------------------------------------------ */
function PovCameraController({ target }: { target: PovTarget }) {
  const { camera } = useThree();

  // 每个 target 对应的 (cameraPos, lookAt)
  const targetConfig = useMemo(() => {
    // 卫星视角: 站在离目标合适距离
    // 方向从 "某个好看的角度" 看向目标
    const earthViewPos = new THREE.Vector3(
      EARTH_POS.x + SAT_ORBIT_RADIUS * 0.9,
      EARTH_POS.y + SAT_ORBIT_RADIUS * 0.35,
      EARTH_POS.z + SAT_ORBIT_RADIUS * 0.8
    );

    // 月球视角: 从地月之间, 朝月球看
    const moonDir = MOON_POS.clone().sub(EARTH_POS).normalize();
    const moonViewPos = MOON_POS.clone()
      .sub(moonDir.clone().multiplyScalar(3.5))
      .add(new THREE.Vector3(0, 0.8, 0.4));

    // 太阳视角: 不能太近, 否则过曝
    const sunDir = SUN_POS.clone().sub(EARTH_POS).normalize();
    const sunViewPos = SUN_POS.clone()
      .sub(sunDir.clone().multiplyScalar(18))
      .add(new THREE.Vector3(0, 3, 0));

    // 深空视角: 地球轨道外, 背对地球看远方
    const deepViewPos = new THREE.Vector3(-5, 3, -8);

    return {
      earth: { pos: earthViewPos, look: EARTH_POS },
      moon: { pos: moonViewPos, look: MOON_POS },
      sun: { pos: sunViewPos, look: SUN_POS },
      deepspace: { pos: deepViewPos, look: DEEPSPACE_POS },
    };
  }, []);

  const curPos = useRef(new THREE.Vector3());
  const curLook = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());

  // 初始化
  useEffect(() => {
    const cfg = targetConfig[target];
    curPos.current.copy(cfg.pos);
    curLook.current.copy(cfg.look);
    camera.position.copy(cfg.pos);
    camera.lookAt(cfg.look);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cfg = targetConfig[target];
    targetPos.current.copy(cfg.pos);
    targetLook.current.copy(cfg.look);
  }, [target, targetConfig]);

  useFrame((_, delta) => {
    // 相机位置平滑插值
    curPos.current.lerp(targetPos.current, Math.min(1, delta * 1.8));
    curLook.current.lerp(targetLook.current, Math.min(1, delta * 1.8));

    // 呼吸漂移 (让画面不是完全静止)
    const t = performance.now() * 0.0005;
    const driftX = Math.sin(t) * 0.02;
    const driftY = Math.cos(t * 0.7) * 0.015;

    camera.position.copy(curPos.current);
    camera.position.x += driftX;
    camera.position.y += driftY;
    camera.lookAt(curLook.current);
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  Scene wrapper                                                       */
/* ------------------------------------------------------------------ */
export default function PovScene({ target }: { target: PovTarget }) {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [3, 1, 3], fov: 55, near: 0.1, far: 400 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ background: '#000005' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.12} />
          <Starfield />
          <MilkyWay />
          <Sun />
          <Earth />
          <Moon />
          <SatelliteHullFrame />
          <PovCameraController target={target} />
        </Suspense>
      </Canvas>
    </div>
  );
}
