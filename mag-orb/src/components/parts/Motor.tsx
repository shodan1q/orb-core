import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PartMeshProps } from '../../data/parts'

/**
 * 小型 DC 电机：圆筒主体 + 输出轴 + 安装支耳 + 标签环 + 转盘自旋
 * 现在是 BOM 09 号正式零件，可选可拆。
 */
export function Motor({ selected, hovered, onPointerOver, onPointerOut, onClick }: PartMeshProps) {
  const hi = selected || hovered
  const diskRef = useRef<THREE.Mesh>(null)

  useFrame((_, dt) => {
    if (diskRef.current) diskRef.current.rotation.z += dt * 6
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
      rotation={[0, -0.2, 0]}
    >
      {/* 电机主体（横放圆筒，轴沿 Z） */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.14, 24]} />
        <meshStandardMaterial color="#3a3f48" metalness={0.75} roughness={0.4} />
      </mesh>
      {/* 标签环（橙色，带轻微辉光） */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.056, 0.056, 0.05, 24, 1, true]} />
        <meshStandardMaterial color="#ff9433" emissive="#ff9433" emissiveIntensity={0.35} />
      </mesh>
      {/* 前端面（深色） */}
      <mesh position={[0, 0, 0.071]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.054, 0.054, 0.002, 24]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* 输出轴（金属银，外伸） */}
      <mesh position={[0, 0, 0.105]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 0.08, 16]} />
        <meshStandardMaterial color="#cfd2d6" metalness={0.95} roughness={0.15} />
      </mesh>
      {/* 轴端齿盘（白色，自旋） */}
      <mesh ref={diskRef} position={[0, 0, 0.148]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.006, 16]} />
        <meshStandardMaterial color="#e4e4e7" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* 齿盘上的辐条标记（让自旋可见） */}
      <mesh position={[0.015, 0.0, 0.151]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.012, 0.005, 0.005]} />
        <meshStandardMaterial color="#ff4d33" />
      </mesh>
      {/* 后端 / 接线柱端面 */}
      <mesh position={[0, 0, -0.071]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.054, 0.054, 0.002, 24]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* 两根接线柱 */}
      <mesh position={[-0.02, 0.01, -0.078]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.014, 10]} />
        <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.2} />
      </mesh>
      <mesh position={[0.02, 0.01, -0.078]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.014, 10]} />
        <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.2} />
      </mesh>
      {/* 安装支耳 */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[0.14, 0.008, 0.12]} />
        <meshStandardMaterial color="#6a6e74" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* 高亮 wireframe */}
      {hi && (
        <mesh>
          <boxGeometry args={[0.16, 0.14, 0.32]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  )
}
