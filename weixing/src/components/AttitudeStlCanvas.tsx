import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { ATTITUDE_ZERO_REFERENCE_DEG } from '../constants/attitudeBaseline'
import subtractSvgRaw from '../../Subtract.svg?raw'

export type AttitudeStlCanvasProps = {
  pitchDeg: number
  rollDeg: number
  yawDeg: number
  /** 总览卡片 / 全屏飞控视场 / 环保页线稿全屏 */
  variant?: 'card' | 'flightdeck' | 'eco'
  /**
   * 每次数值变化触发一次飞控卫星巡检会话（多圈循环扫掠 + 整体压暗衬托法线光）。
   */
  scanPulseKey?: number
}

/** 源文件为项目根目录 satellite+3d+model.stl，构建时以 public/satellite-model.stl 提供 */
const STL_URL = '/satellite-model.stl'

/** 单圈从左到右扫掠时长（秒） */
const SCAN_CYCLE_SEC = 7.5
/** 一次巡检总会话时长（秒内循环多圈） */
const SCAN_SESSION_SEC = 36
const SCAN_FADE_IN_SEC = 0.55
const SCAN_FADE_OUT_SEC = 0.85

function StlSatellite({ pitchDeg, rollDeg, yawDeg, scanPulseKey = 0 }: AttitudeStlCanvasProps) {
  const raw = useLoader(STLLoader, STL_URL)
  const clock = useThree((s) => s.clock)
  const scanStartRef = useRef<number | null>(null)
  const scanPulseSeenRef = useRef<number | null>(null)
  const scanSpinRef = useRef<THREE.Group>(null)

  /** 只处理几何：法线 + AABB 居中。禁止对顶点做 scale(-1,1,1)，否则会破坏 STL 三角拓扑与光照。 */
  const { geometry, scale, bboxX } = useMemo(() => {
    const g = raw.clone()
    g.computeVertexNormals()
    g.center()
    g.computeBoundingBox()
    const box = g.boundingBox
    if (!box) return { geometry: g, scale: 1, bboxX: { min: -1, max: 1 } }
    const size = new THREE.Vector3()
    box.getSize(size)
    const max = Math.max(size.x, size.y, size.z, 1e-6)
    const target = 3.65
    const s = target / max
    return { geometry: g, scale: s, bboxX: { min: box.min.x, max: box.max.x } }
  }, [raw])

  const scanMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#d2d6de',
      metalness: 0.92,
      roughness: 0.58,
      envMapIntensity: 0.4,
    })
    const xMin = bboxX.min
    const xMax = bboxX.max
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uScanMix = { value: 0 }
      shader.uniforms.uScanDim = { value: 0 }
      shader.uniforms.uScanProgress = { value: 0 }
      shader.uniforms.uScanTime = { value: 0 }
      shader.uniforms.uScanXMin = { value: xMin }
      shader.uniforms.uScanXMax = { value: xMax }
      m.userData.scanUniforms = shader.uniforms
      shader.vertexShader = `
        varying vec3 vScanLocalPos;
        varying vec3 vNormRgb;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvScanLocalPos = position;\n#ifndef FLAT_SHADED\nvNormRgb = vNormal * 0.5 + 0.5;\n#else\nvNormRgb = vec3(0.5);\n#endif',
      )
      shader.fragmentShader = `
        varying vec3 vScanLocalPos;
        varying vec3 vNormRgb;
        uniform float uScanMix;
        uniform float uScanDim;
        uniform float uScanProgress;
        uniform float uScanTime;
        uniform float uScanXMin;
        uniform float uScanXMax;
        ${shader.fragmentShader}
      `
      const inject = `
        {
          /* 巡检中整体压暗 PBR，突出扫过带的法线高光与线网 */
          outgoingLight *= mix(1.0, 0.07, uScanDim);

          float span = max(uScanXMax - uScanXMin, 1e-4);
          float edge = uScanXMin + uScanProgress * span;
          float band = max(span * 0.048, 0.026);
          float scanned = 1.0 - smoothstep(edge - band, edge + band, vScanLocalPos.x);
          float gate = scanned * uScanMix;

          vec3 p1 = vScanLocalPos * 12.0;
          vec3 c1 = fract(p1);
          float m1 = min(min(min(c1.x, 1.0 - c1.x), min(c1.y, 1.0 - c1.y)), min(c1.z, 1.0 - c1.z));
          vec3 fw1 = fwidth(p1);
          float t1 = max(max(fw1.x, fw1.y), fw1.z) * 4.2 + 0.018;
          float L1 = 1.0 - smoothstep(0.0, t1, m1);

          vec3 p2 = vScanLocalPos * 36.0;
          vec3 c2 = fract(p2);
          float m2 = min(min(min(c2.x, 1.0 - c2.x), min(c2.y, 1.0 - c2.y)), min(c2.z, 1.0 - c2.z));
          vec3 fw2 = fwidth(p2);
          float t2 = max(max(fw2.x, fw2.y), fw2.z) * 4.2 + 0.018;
          float L2 = 1.0 - smoothstep(0.0, t2, m2);

          float lineMask = clamp(L1 * 0.95 + L2 * 0.62, 0.0, 1.0);

          vec3 lineRgb = vec3(0.18, 0.68, 1.0);
          vec3 fillRgb = vec3(0.012, 0.028, 0.055);
          float sweepPulse = 0.86 + 0.14 * sin(uScanTime * 9.0 + vScanLocalPos.x * 14.0 + vScanLocalPos.y * 9.0);
          vec3 normGlow = vNormRgb * vec3(0.45, 0.88, 1.15) * (0.75 + 0.55 * lineMask);
          vec3 lineCol = mix(lineRgb * sweepPulse, normGlow, 0.52);
          vec3 wireLayer = mix(fillRgb, lineCol, lineMask);

          vec3 pbrHint = outgoingLight * 0.35;
          float lineWeight = 0.78 + 0.22 * lineMask;
          vec3 scannedLook = mix(pbrHint, wireLayer, lineWeight);
          outgoingLight = mix(outgoingLight, scannedLook, gate);
        }
      `
      if (shader.fragmentShader.includes('#include <opaque_fragment>')) {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <opaque_fragment>',
          `${inject}\n#include <opaque_fragment>`,
        )
      } else if (shader.fragmentShader.includes('#include <dithering_fragment>')) {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `${inject}\n#include <dithering_fragment>`,
        )
      }
    }
    m.needsUpdate = true
    return m
  }, [bboxX.min, bboxX.max])

  useEffect(() => () => scanMaterial.dispose(), [scanMaterial])

  useLayoutEffect(() => {
    if (scanPulseSeenRef.current === null) {
      scanPulseSeenRef.current = scanPulseKey
      return
    }
    if (scanPulseKey === scanPulseSeenRef.current) return
    scanPulseSeenRef.current = scanPulseKey
    scanStartRef.current = clock.elapsedTime
  }, [scanPulseKey, clock])

  useFrame(({ clock }) => {
    const u = scanMaterial.userData.scanUniforms as
      | {
          uScanMix: { value: number }
          uScanDim: { value: number }
          uScanProgress: { value: number }
          uScanTime: { value: number }
        }
      | undefined
    if (!u) return
    u.uScanTime.value = clock.elapsedTime

    let mixAmt = 0
    let dimAmt = 0
    let progress = 0
    let spin = 0
    if (scanStartRef.current != null) {
      const dt = clock.elapsedTime - scanStartRef.current
      if (dt >= SCAN_SESSION_SEC) {
        scanStartRef.current = null
      } else {
        const fadeIn = Math.min(1, dt / SCAN_FADE_IN_SEC)
        const fadeOut = Math.min(1, (SCAN_SESSION_SEC - dt) / SCAN_FADE_OUT_SEC)
        const envelope = Math.min(fadeIn, fadeOut)
        dimAmt = envelope * 0.98
        mixAmt = envelope * 0.99
        const cycle = (dt % SCAN_CYCLE_SEC) / SCAN_CYCLE_SEC
        progress = cycle
        spin = Math.sin(cycle * Math.PI * 2) * 0.42
      }
    }
    u.uScanMix.value = mixAmt
    u.uScanDim.value = dimAmt
    u.uScanProgress.value = progress
    if (scanSpinRef.current) scanSpinRef.current.rotation.y = spin
  })

  const pr = THREE.MathUtils.degToRad(pitchDeg)
  const rr = THREE.MathUtils.degToRad(rollDeg)
  const yr = THREE.MathUtils.degToRad(yawDeg)

  const zr = ATTITUDE_ZERO_REFERENCE_DEG
  const zpr = THREE.MathUtils.degToRad(zr.pitch)
  const zrr = THREE.MathUtils.degToRad(zr.roll)
  const zyr = THREE.MathUtils.degToRad(zr.yaw)

  /** 模型与 CAD 轴向对齐后的固定偏航：180° 对正 + 左转 120° + 再转 180° */
  const modelYawFix = THREE.MathUtils.degToRad(180 + 120 + 180)

  return (
    <group rotation={[pr, rr, yr]}>
      {/*
        内层：零姿态基准（原「刚好」朝向）；外层 group 为相对该基准的增量，UI 全零即卫星零位。
      */}
      <group rotation={[zpr, zrr, zyr]}>
        {/*
          Z-up STL → Y-up：+90° 绕 X；
          再绕 Y：固定偏航（含再转 180°）。
        */}
        <group rotation={[Math.PI / 2, 0, 0]}>
          <group rotation={[0, modelYawFix, 0]}>
            <group ref={scanSpinRef}>
              <mesh geometry={geometry} scale={scale} material={scanMaterial} />
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

const ECO_MAX_POINTS = 34000
const ECO_HOLD_MS = 720
const ECO_MOVE_PX = 16
const ECO_LOGO_VB = { w: 124, h: 103 }

const ECO_LOGO_PATH_D: string | null = (() => {
  const m = subtractSvgRaw.match(/\sd="([^"]+)"/)
  return m?.[1] ?? null
})()

function subsamplePositionsGeometry(geo: THREE.BufferGeometry, maxVertices: number): THREE.BufferGeometry {
  const attr = geo.getAttribute('position') as THREE.BufferAttribute | undefined
  if (!attr) return geo
  const n = attr.count
  if (n <= maxVertices) return geo
  const step = Math.ceil(n / maxVertices)
  const count = Math.floor((n + step - 1) / step)
  const arr = new Float32Array(count * 3)
  let j = 0
  for (let i = 0; i < n && j < count * 3; i += step) {
    arr[j++] = attr.getX(i)
    arr[j++] = attr.getY(i)
    arr[j++] = attr.getZ(i)
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(arr.subarray(0, j), 3))
  return out
}

function filledDiskLogoFallback(out: Float32Array, vertexCount: number, worldScale: number, aspect: number) {
  for (let i = 0; i < vertexCount; i++) {
    const u = (i + 0.5) / Math.max(1, vertexCount)
    const a = u * Math.PI * 2
    const r = Math.sqrt(u) * worldScale
    out[i * 3] = Math.cos(a) * r * aspect
    out[i * 3 + 1] = Math.sin(a) * r
    out[i * 3 + 2] = 0
  }
}

/** Logo 在场景中的目标尺度（很小、实心点云块） */
const ECO_LOGO_WORLD_SCALE = 0.086

/** 环保页卫星默认平移（与代码内 group position 一致，供页面临时调试面板初始值） */
export const ECO_SAT_POSITION_DEFAULT = { x: 1.38, y: -0.7, z: -0.22 } as const
/** 首帧 OrbitControls.target 近似值；运行中每帧与 spinRef（点云球心）世界坐标同步 */
export const ECO_ORBIT_TARGET_DEFAULT = { x: 0.42, y: 1.58, z: 0 } as const

/**
 * 整段环保卫星场景沿世界 Y 抬高（点云 / 坐标轴 / logo 吸附父级一起动）。
 * 注意：OrbitControls 每帧把 target 对准 spin 世界坐标，相机会跟着平移，单靠此项几乎不改变「屏幕上的位置」。
 * 画面上要明显上移需配合 {@link ECO_VIEW_VERTICAL_SHIFT_PX}。
 */
export const ECO_SCENE_LIFT_Y = 2.95

/**
 * setViewOffset 的垂直附加偏移（像素），把光学中心相对 HUD 中空区上移，否则抬场景会被轨道跟随抵消。
 */
export const ECO_VIEW_VERTICAL_SHIFT_PX = 208

const ecoOrbitTargetVec = new THREE.Vector3(
  ECO_ORBIT_TARGET_DEFAULT.x,
  ECO_ORBIT_TARGET_DEFAULT.y,
  ECO_ORBIT_TARGET_DEFAULT.z,
)

const ECO_LOGO_FIXED_MOUNT = 0.9
const ECO_LOGO_FIXED_UNMOUNT = 0.78
/** 聚成 logo 并固定吸附后，枢轴相对长按命中点沿世界 Y 上移（轨道 target 随 spin 同步） */
const ECO_LOGO_FIXED_WORLD_OFFSET_Y = 3.55

/**
 * 将 SVG 填充栅格化，在黑色填充区域内均匀取点 → 实心面状 logo。
 * 高分辨率栅格 + 小 worldScale，成形后小而密。
 */
function buildFilledLogoPositions3D(pathD: string | null, vertexCount: number): Float32Array {
  const out = new Float32Array(vertexCount * 3)
  const { w: vbW, h: vbH } = ECO_LOGO_VB
  const aspect = vbW / vbH
  const worldScale = ECO_LOGO_WORLD_SCALE

  if (!pathD || typeof document === 'undefined') {
    filledDiskLogoFallback(out, vertexCount, worldScale, aspect)
    return out
  }

  const cw = 520
  const ch = Math.max(2, Math.round((cw * vbH) / vbW))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    filledDiskLogoFallback(out, vertexCount, worldScale, aspect)
    return out
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cw, ch)
  ctx.fillStyle = '#000000'
  ctx.setTransform(cw / vbW, 0, 0, ch / vbH, 0, 0)
  try {
    ctx.fill(new Path2D(pathD))
  } catch {
    filledDiskLogoFallback(out, vertexCount, worldScale, aspect)
    return out
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  const img = ctx.getImageData(0, 0, cw, ch)
  const inside: number[] = []
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      const i = (cy * cw + cx) * 4
      if (img.data[i] < 235) {
        inside.push(cx, cy)
      }
    }
  }

  const M = inside.length / 2
  if (M < 4) {
    filledDiskLogoFallback(out, vertexCount, worldScale, aspect)
    return out
  }

  for (let k = 0; k < vertexCount; k++) {
    const j = Math.min(M - 1, Math.floor(((k + 0.5) / vertexCount) * M))
    const cx = inside[j * 2]
    const cy = inside[j * 2 + 1]
    const svgX = (cx + 0.5) * (vbW / cw)
    const svgY = (cy + 0.5) * (vbH / ch)
    const nx = (svgX / vbW - 0.5) * 2
    const ny = -(svgY / vbH - 0.5) * 2
    out[k * 3] = nx * worldScale * aspect
    out[k * 3 + 1] = ny * worldScale
    out[k * 3 + 2] = 0
  }
  return out
}

type StlEcoPointCloudProps = AttitudeStlCanvasProps & {
  onLogoMode?: (locked: boolean) => void
  /** 场景根下挂载点：logo 成形后移入此组，世界坐标为按下处命中点并面向相机 */
  fixedLogoMountRef: RefObject<THREE.Group | null>
  orbitControlsRef: RefObject<OrbitControlsImpl | null>
}

/** 环保页：点云右上；长按收聚为点击处小实体 logo（平面贴屏、微光）；再点恢复卫星 */
function StlEcoPointCloud({
  pitchDeg,
  rollDeg,
  yawDeg,
  onLogoMode,
  fixedLogoMountRef,
  orbitControlsRef,
}: StlEcoPointCloudProps) {
  const { camera } = useThree()
  const raw = useLoader(STLLoader, STL_URL)
  const satelliteMountRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const translateRef = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const morphRef = useRef(0)
  const logoWantRef = useRef(false)
  const fixedAttachRef = useRef(false)
  /** 长按触发 logo 后同一次 pointerup 仅结束按压，不立刻还原 */
  const skipNextPointerUpRef = useRef(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const scratchInv = useMemo(() => new THREE.Matrix4(), [])
  const scratchLocalTarget = useMemo(() => new THREE.Vector3(), [])
  /** 长按起始时射线与命中球的交点（世界坐标），聚拢与固定 logo 的中心 */
  const logoAnchorWorldRef = useRef(ecoOrbitTargetVec.clone())

  const { scale, pointsGeometry, basePositions, logoPositions, vertexCount } = useMemo(() => {
    const g = raw.clone()
    g.computeVertexNormals()
    g.center()
    g.computeBoundingBox()
    const box = g.boundingBox
    if (!box) {
      const empty = new THREE.BufferGeometry()
      return {
        scale: 1,
        pointsGeometry: empty,
        basePositions: new Float32Array(0),
        logoPositions: new Float32Array(0),
        vertexCount: 0,
      }
    }
    const size = new THREE.Vector3()
    box.getSize(size)
    const max = Math.max(size.x, size.y, size.z, 1e-6)
    const target = 3.65
    const s = target / max
    let pg = (g.index != null ? g.toNonIndexed() : g) as THREE.BufferGeometry
    pg = subsamplePositionsGeometry(pg, ECO_MAX_POINTS)
    const pos = pg.getAttribute('position') as THREE.BufferAttribute
    const vc = pos.count
    const base = new Float32Array(vc * 3)
    for (let i = 0; i < vc; i++) {
      base[i * 3] = pos.getX(i)
      base[i * 3 + 1] = pos.getY(i)
      base[i * 3 + 2] = pos.getZ(i)
    }
    const logo = buildFilledLogoPositions3D(ECO_LOGO_PATH_D, vc)
    return {
      scale: s,
      pointsGeometry: pg,
      basePositions: base,
      logoPositions: logo,
      vertexCount: vc,
    }
  }, [raw])

  const sat = ECO_SAT_POSITION_DEFAULT
  const satVecScratch = useMemo(() => new THREE.Vector3(), [])
  const tmpPos = useMemo(() => new THREE.Vector3(), [])
  const orbitPivotScratch = useMemo(() => new THREE.Vector3(), [])

  const clearHold = useCallback(() => {
    if (holdTimerRef.current != null) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }, [])

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      try {
        ;(e.target as Element).setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      const x = e.nativeEvent.clientX
      const y = e.nativeEvent.clientY
      downRef.current = { x, y, t: performance.now() }

      if (logoWantRef.current) return

      logoAnchorWorldRef.current.copy(e.point)

      clearHold()
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null
        if (!downRef.current) return
        logoWantRef.current = true
        skipNextPointerUpRef.current = true
      }, ECO_HOLD_MS)
    },
    [clearHold],
  )

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!downRef.current || logoWantRef.current) return
      const dx = e.nativeEvent.clientX - downRef.current.x
      const dy = e.nativeEvent.clientY - downRef.current.y
      if (dx * dx + dy * dy > ECO_MOVE_PX * ECO_MOVE_PX) clearHold()
    },
    [clearHold],
  )

  const onPointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      try {
        ;(e.target as Element).releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }

      clearHold()

      if (logoWantRef.current) {
        if (skipNextPointerUpRef.current) {
          skipNextPointerUpRef.current = false
        } else {
          logoWantRef.current = false
        }
      }

      downRef.current = null
    },
    [clearHold],
  )

  const onPointerCancel = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      try {
        ;(e.target as Element).releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      clearHold()
      downRef.current = null
      if (logoWantRef.current) skipNextPointerUpRef.current = false
    },
    [clearHold],
  )

  useFrame((_, dt) => {
    const targetMorph = logoWantRef.current ? 1 : 0
    morphRef.current = THREE.MathUtils.lerp(morphRef.current, targetMorph, Math.min(1, dt * 3.2))
    onLogoMode?.(morphRef.current > 0.82)

    const m = morphRef.current
    if (m >= ECO_LOGO_FIXED_MOUNT) fixedAttachRef.current = true
    else if (m <= ECO_LOGO_FIXED_UNMOUNT) fixedAttachRef.current = false

    const fixedRoot = fixedLogoMountRef.current
    const satMount = satelliteMountRef.current
    const tRef = translateRef.current

    if (fixedAttachRef.current && fixedRoot && tRef) {
      if (tRef.parent !== fixedRoot) fixedRoot.add(tRef)
      fixedRoot.position.copy(logoAnchorWorldRef.current)
      fixedRoot.position.y += ECO_LOGO_FIXED_WORLD_OFFSET_Y
      fixedRoot.quaternion.copy(camera.quaternion)
      tRef.position.set(0, 0, 0)
    } else if (!fixedAttachRef.current && satMount && tRef) {
      if (tRef.parent !== satMount) satMount.add(tRef)
      satMount.updateWorldMatrix(true, true)
      scratchInv.copy(satMount.matrixWorld).invert()
      scratchLocalTarget.copy(logoAnchorWorldRef.current).applyMatrix4(scratchInv)
      satVecScratch.set(sat.x, sat.y, sat.z)
      tmpPos.lerpVectors(satVecScratch, scratchLocalTarget, m)
      tRef.position.copy(tmpPos)
    }

    if (spinRef.current) {
      if (m < 0.82) {
        spinRef.current.rotation.x += dt * 0.28 * (1 - m)
      } else {
        spinRef.current.rotation.x = THREE.MathUtils.lerp(spinRef.current.rotation.x, 0, Math.min(1, dt * 10))
      }
      if (m > 0.985) spinRef.current.rotation.x = 0
    }

    const pts = pointsRef.current
    if (pts?.geometry && vertexCount > 0) {
      const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      for (let i = 0; i < vertexCount; i++) {
        const o = i * 3
        arr[o] = basePositions[o] + (logoPositions[o] - basePositions[o]) * m
        arr[o + 1] = basePositions[o + 1] + (logoPositions[o + 1] - basePositions[o + 1]) * m
        arr[o + 2] = basePositions[o + 2] + (logoPositions[o + 2] - basePositions[o + 2]) * m
      }
      attr.needsUpdate = true
    }

    const oc = orbitControlsRef.current
    if (oc && spinRef.current) {
      spinRef.current.getWorldPosition(orbitPivotScratch)
      oc.target.copy(orbitPivotScratch)
      oc.update()
    }
  })

  const pr = THREE.MathUtils.degToRad(pitchDeg)
  const rr = THREE.MathUtils.degToRad(rollDeg)
  const yr = THREE.MathUtils.degToRad(yawDeg)

  const zr = ATTITUDE_ZERO_REFERENCE_DEG
  const zpr = THREE.MathUtils.degToRad(zr.pitch)
  const zrr = THREE.MathUtils.degToRad(zr.roll)
  const zyr = THREE.MathUtils.degToRad(zr.yaw)
  const modelYawFix = THREE.MathUtils.degToRad(180 + 120 + 180)

  return (
    <group rotation={[pr, rr, yr]}>
      <group rotation={[zpr, zrr, zyr]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <group ref={satelliteMountRef} rotation={[0, modelYawFix, 0]}>
            <group ref={translateRef} position={[sat.x, sat.y, sat.z]}>
              <group ref={spinRef}>
                <points ref={pointsRef} geometry={pointsGeometry} scale={scale}>
                  <pointsMaterial
                    color="#dce2f2"
                    size={0.009}
                    sizeAttenuation
                    transparent
                    opacity={0.94}
                    depthWrite={false}
                  />
                </points>
                <points geometry={pointsGeometry} scale={scale}>
                  <pointsMaterial
                    color="#9ab8ff"
                    size={0.032}
                    sizeAttenuation
                    transparent
                    opacity={0.2}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                  />
                </points>
                {/*
                  Points 射线不稳定；透明可见 mesh 仍可被 Raycaster 命中（visible=false 会被跳过）。
                */}
                <mesh
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                >
                  <sphereGeometry args={[2.4, 16, 16]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

/**
 * 将透视投影中心对准 HUD 中空区（左/右栏 + 顶栏 + 底栏与 Eco 页布局一致），
 * 避免模型仍按整屏视口居中而显得偏。
 */
function EcoViewFraming() {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (!cam.isPerspectiveCamera) return
    const w = size.width
    const h = size.height
    if (w < 1 || h < 1) return

    const padL = Math.min(288, w * 0.38)
    const padR = Math.min(276, w * 0.36)
    const padT = Math.min(104, h * 0.13)
    const padB = Math.min(Math.max(260, h * 0.34), h * 0.48)

    const fullW = w + padL + padR
    const fullH = h + padT + padB
    const vShift = Math.min(
      ECO_VIEW_VERTICAL_SHIFT_PX,
      Math.max(0, Math.floor(padB - 8)),
    )
    cam.setViewOffset(fullW, fullH, padL, padT + vShift, w, h)
    cam.updateProjectionMatrix()

    return () => {
      cam.clearViewOffset()
      cam.updateProjectionMatrix()
    }
  }, [camera, size.width, size.height])

  return null
}

/** 环保页：点云模型 + 弱光（点不受光照，仅用环境衬托） */
function SceneEco(props: AttitudeStlCanvasProps) {
  const [logoLock, setLogoLock] = useState(false)
  const fixedLogoMountRef = useRef<THREE.Group>(null)
  const orbitControlsRef = useRef<OrbitControlsImpl>(null)

  return (
    <>
      <EcoViewFraming />
      <ambientLight intensity={0.4} />
      <directionalLight position={[6, 10, 8]} intensity={0.12} color="#ffffff" />
      <group position={[0, ECO_SCENE_LIFT_Y, 0]}>
        <group ref={fixedLogoMountRef} />
        <StlEcoPointCloud
          {...props}
          fixedLogoMountRef={fixedLogoMountRef}
          orbitControlsRef={orbitControlsRef}
          onLogoMode={setLogoLock}
        />
      </group>
      <OrbitControls
        ref={orbitControlsRef}
        makeDefault
        enablePan={false}
        enableRotate={!logoLock}
        minDistance={1.45}
        maxDistance={14}
        enableDamping
        dampingFactor={0.08}
        target={[
          ecoOrbitTargetVec.x,
          ecoOrbitTargetVec.y + ECO_SCENE_LIFT_Y,
          ecoOrbitTargetVec.z,
        ]}
      />
    </>
  )
}

function Scene(props: AttitudeStlCanvasProps) {
  return (
    <>
      {/*
        环境 HDR：给金属 PBR 反射用，比纯平行光更容易出「光泽」；
        background={false} 保留画布深色底。
      */}
      <Environment
        preset="studio"
        background={false}
        environmentIntensity={0.48}
      />
      <ambientLight intensity={0.32} />
      <hemisphereLight
        color="#dce4f0"
        groundColor="#2e3138"
        intensity={0.48}
      />
      <directionalLight position={[5, 8, 6]} intensity={1.05} />
      <directionalLight position={[-4, -3, -5]} intensity={0.42} color="#e8ecff" />
      <directionalLight position={[0, 2, 8]} intensity={0.35} color="#ffffff" />
      <StlSatellite {...props} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={1.35}
        maxDistance={12}
        enableDamping
        dampingFactor={0.08}
        target={[0, 0, 0]}
      />
    </>
  )
}

export function AttitudeStlCanvas({
  variant = 'card',
  pitchDeg,
  rollDeg,
  yawDeg,
  scanPulseKey = 0,
}: AttitudeStlCanvasProps) {
  const deck = variant === 'flightdeck'
  const eco = variant === 'eco'
  const angles = { pitchDeg, rollDeg, yawDeg, scanPulseKey }

  return (
    <div
      className={
        eco
          ? 'relative h-full min-h-0 w-full bg-black'
          : deck
            ? 'relative h-full min-h-[280px] w-full bg-[#0a0a0b]'
            : 'relative h-56 w-full min-h-[224px] overflow-hidden rounded-xl border border-zinc-800/60 bg-[#0a0a0b] md:h-64'
      }
    >
      <div className="h-full w-full">
        <Canvas
          camera={
            eco
              ? {
                  position: [3.5, 2.55, 3.5],
                  fov: 40,
                  near: 0.1,
                  far: 200,
                }
              : deck
                ? { position: [2.5, 1.9, 2.5], fov: 40, near: 0.1, far: 200 }
                : { position: [2.2, 1.65, 2.2], fov: 38, near: 0.1, far: 200 }
          }
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
          className="h-full w-full"
        >
          <color attach="background" args={[eco ? '#000000' : '#0a0a0b']} />
          <Suspense
            fallback={
              <mesh>
                <boxGeometry args={[0.15, 0.15, 0.15]} />
                <meshBasicMaterial color="#3f3f46" wireframe />
              </mesh>
            }
          >
            {eco ? <SceneEco {...angles} /> : <Scene {...angles} />}
          </Suspense>
        </Canvas>
      </div>
      {!deck && !eco ? (
        <p className="pointer-events-none absolute bottom-1.5 left-2 text-[9px] text-zinc-500">
          拖拽旋转视角 · 滑块驱动姿态
        </p>
      ) : null}
    </div>
  )
}
