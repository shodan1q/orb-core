import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PartMeshProps } from '../../data/parts'

/**
 * 12×12 绿色 LED 水流矩阵屏：每颗 LED 的 emissiveIntensity 跟随
 * sin(t - x*k1 - y*k2) 振荡，整体呈对角线方向"水流"扫光效果。
 * 安装在本体背面，朝向 -Z。
 */
export function LEDMatrix({ selected, hovered, onPointerOver, onPointerOut, onClick }: PartMeshProps) {
  const hi = selected || hovered
  const SIZE = 12
  const SPACING = 0.028
  const TOTAL = SIZE * SPACING

  const LEDS = useMemo(() => {
    const arr: { x: number; y: number }[] = []
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        arr.push({
          x: (i - SIZE / 2 + 0.5) * SPACING,
          y: (j - SIZE / 2 + 0.5) * SPACING,
        })
      }
    }
    return arr
  }, [])

  // 每颗 LED 的材质引用，便于 useFrame 直接写 emissiveIntensity
  const matsRef = useRef<(THREE.MeshStandardMaterial | null)[]>([])

  // 通过 window-level 信号读 powered 状态（避免 prop 穿透 PartMesh 接口）
  // 默认通电；MagOrbConsole 会通过 useLayoutEffect 写入 window.__magOrbPowered
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const powered = (window as unknown as { __magOrbPowered?: boolean }).__magOrbPowered !== false
    LEDS.forEach((led, i) => {
      const mat = matsRef.current[i]
      if (!mat) return
      if (!powered) {
        mat.emissiveIntensity = 0
        return
      }
      const phase = t * 2.2 - (led.x + led.y) * 18
      const wave = Math.sin(phase) * 0.5 + 0.5
      mat.emissiveIntensity = 0.25 + wave * 2.6
    })
  })

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation()
        onPointerOver()
      }}
      onPointerOut={onPointerOut}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      // 朝向 -Z（背面外侧）：默认 plane 朝 +Z，rotate Y 180° 翻转
      rotation={[0, Math.PI, 0]}
    >
      {/* PCB 背板（黑色 FR4） */}
      <mesh position={[0, 0, -0.012]}>
        <boxGeometry args={[TOTAL + 0.05, TOTAL + 0.05, 0.02]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.5} metalness={0.25} />
      </mesh>
      {/* 边缘金属框 */}
      <mesh position={[0, 0, -0.001]}>
        <boxGeometry args={[TOTAL + 0.05, TOTAL + 0.05, 0.002]} />
        <meshStandardMaterial color="#1f1f24" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* 144 颗 LED */}
      {LEDS.map((led, i) => (
        <mesh key={i} position={[led.x, led.y, 0.008]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshStandardMaterial
            ref={(r) => {
              matsRef.current[i] = r as THREE.MeshStandardMaterial | null
            }}
            color="#3aff5f"
            emissive="#3aff5f"
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* 四角固定螺丝（小金属点） */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sy], i) => (
        <mesh
          key={`s${i}`}
          position={[
            sx * (TOTAL / 2 + 0.012),
            sy * (TOTAL / 2 + 0.012),
            0.003,
          ]}
        >
          <cylinderGeometry args={[0.006, 0.006, 0.004, 10]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
      {hi && (
        <mesh>
          <boxGeometry args={[TOTAL + 0.08, TOTAL + 0.08, 0.05]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  )
}
