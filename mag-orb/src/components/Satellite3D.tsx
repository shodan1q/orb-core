import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { PARTS, type PartId, type PartSpec, type PartMesh } from '../data/parts'
import { MagLevBase } from './parts/MagLevBase'
import { Battery } from './parts/Battery'
import { Servo } from './parts/Servo'
import { HiSiliconChip } from './parts/HiSiliconChip'
import { Dish } from './parts/Dish'
import { IRSensor } from './parts/IRSensor'
import { OLEDDisplay } from './parts/OLEDDisplay'
import { Frame, SolarWings } from './parts/Frame'
import { Motor } from './parts/Motor'
import { LEDMatrix } from './parts/LEDMatrix'
import { Wires } from './Wires'

const MESHES: Record<PartId, PartMesh> = {
  base: MagLevBase,
  battery: Battery,
  servo: Servo,
  mcu: HiSiliconChip,
  dish: Dish,
  ir: IRSensor,
  oled: OLEDDisplay,
  led: LEDMatrix,
  motor: Motor,
}

interface PartSlotProps {
  spec: PartSpec
  explode: number
  selected: boolean
  hovered: boolean
  onPointerOver: () => void
  onPointerOut: () => void
  onClick: () => void
}

function PartSlot({ spec, explode, selected, hovered, onPointerOver, onPointerOut, onClick }: PartSlotProps) {
  const groupRef = useRef<THREE.Group>(null)
  const target = useRef(new THREE.Vector3())
  const Mesh = MESHES[spec.id]

  useFrame((_, dt) => {
    if (!groupRef.current) return
    const [ox, oy, oz] = spec.origin
    const [dx, dy, dz] = spec.explodeOffset
    target.current.set(ox + dx * explode, oy + dy * explode, oz + dz * explode)
    groupRef.current.position.lerp(target.current, Math.min(1, dt * 6))
  })

  return (
    <group ref={groupRef}>
      <Mesh
        selected={selected}
        hovered={hovered}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      />
      {(selected || hovered) && (
        <Html position={[0, 0.2, 0]} center distanceFactor={6} zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
          <div
            className="whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md"
            style={{
              borderColor: `${spec.accent}66`,
              color: spec.accent,
              background: 'rgba(13,13,16,0.85)',
            }}
          >
            <span className="opacity-60">{spec.index} · </span>
            {spec.name}
          </div>
        </Html>
      )}
    </group>
  )
}

export type AnimationFlags = {
  powered: boolean
  bodyRotate: boolean
  dishScan: boolean
  /** 1.0 = 默认速度 */
  dishScanSpeed: number
}

interface Props {
  explode: number
  selected: PartId | null
  hovered: PartId | null
  onSelect: (id: PartId | null) => void
  onHover: (id: PartId | null) => void
  flags: AnimationFlags
}

export function Satellite3D({ explode, selected, hovered, onSelect, onHover, flags }: Props) {
  const bodyRef = useRef<THREE.Group>(null)
  const dishYawRef = useRef<THREE.Group>(null)
  // 累计 phase，断电时冻结而不是跳回 0
  const bodyPhase = useRef(0)
  const dishPhase = useRef(0)

  useFrame((state, dt) => {
    const t = state.clock.getElapsedTime()
    if (flags.powered && flags.bodyRotate) bodyPhase.current += dt * 0.12
    if (flags.powered && flags.dishScan) dishPhase.current += dt * 0.7 * flags.dishScanSpeed

    if (bodyRef.current) {
      bodyRef.current.position.y = flags.powered ? Math.sin(t * 0.8) * 0.02 : 0
      bodyRef.current.rotation.y = bodyPhase.current
    }
    if (dishYawRef.current) {
      dishYawRef.current.rotation.y = Math.sin(dishPhase.current) * 0.55
    }
  })

  // 分组：底座单独，剩余 6 个按 id 拆为 yaw-swing（dish + ir）与 fixed（其他）
  const dishSpec = PARTS.find((p) => p.id === 'dish')!
  const irSpec = PARTS.find((p) => p.id === 'ir')!
  const fixedSpecs = PARTS.slice(1).filter((p) => p.id !== 'dish' && p.id !== 'ir')

  return (
    <group onPointerMissed={() => onSelect(null)}>
      <PartSlot
        spec={PARTS[0]}
        explode={explode}
        selected={selected === 'base'}
        hovered={hovered === 'base'}
        onPointerOver={() => onHover('base')}
        onPointerOut={() => onHover(null)}
        onClick={() => onSelect('base')}
      />

      <group ref={bodyRef}>
        <group position={[0, 0.4, 0]}>
          <Frame />
        </group>
        <group position={[0, 0.4, 0]}>
          <SolarWings />
        </group>

        {/* 框架内电线：全部以海思 MCU 为中心放射到外围零件；爆炸时淡出 */}
        <Wires explode={explode} />

        {/* 舵机→卫星锅 机械耦合杆：垂直金属轴，dish 在它上面 yaw 摆动 */}
        {explode < 0.05 && (
          <mesh position={[0, 0.85, -0.05]}>
            <cylinderGeometry args={[0.014, 0.014, 0.34, 16]} />
            <meshStandardMaterial color="#9aa0a8" metalness={0.9} roughness={0.25} />
          </mesh>
        )}

        {/* 固定的零件（电池/海思/舵机/OLED） */}
        {fixedSpecs.map((spec) => (
          <PartSlot
            key={spec.id}
            spec={spec}
            explode={explode}
            selected={selected === spec.id}
            hovered={hovered === spec.id}
            onPointerOver={() => onHover(spec.id)}
            onPointerOut={() => onHover(null)}
            onClick={() => onSelect(spec.id)}
          />
        ))}

        {/* 摆动群组：dish + ir 围绕世界 Y 轴 yaw 扫描；耦合杆已移到 body 群组（静止），dish 在它上面转 */}
        <group ref={dishYawRef}>
          <PartSlot
            spec={dishSpec}
            explode={explode}
            selected={selected === 'dish'}
            hovered={hovered === 'dish'}
            onPointerOver={() => onHover('dish')}
            onPointerOut={() => onHover(null)}
            onClick={() => onSelect('dish')}
          />
          <PartSlot
            spec={irSpec}
            explode={explode}
            selected={selected === 'ir'}
            hovered={hovered === 'ir'}
            onPointerOver={() => onHover('ir')}
            onPointerOut={() => onHover(null)}
            onClick={() => onSelect('ir')}
          />
        </group>
      </group>

      <gridHelper args={[10, 20, '#1c1c20', '#121216']} position={[0, -1.3, 0]} />
    </group>
  )
}
