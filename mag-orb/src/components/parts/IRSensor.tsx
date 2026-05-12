import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PartMeshProps } from '../../data/parts'

export function IRSensor({ selected, hovered, onPointerOver, onPointerOut, onClick }: PartMeshProps) {
  const ledColor = '#ff3a3a'
  const hi = selected || hovered
  const ledRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame((state) => {
    if (!ledRef.current) return
    const t = state.clock.getElapsedTime()
    ledRef.current.emissiveIntensity = 1.5 + Math.sin(t * 3) * 0.7
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
    >
      {/* 底座小垫块（连接到 dish 焦点） */}
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 0.04, 16]} />
        <meshStandardMaterial color="#3a3f48" metalness={0.6} roughness={0.45} />
      </mesh>
      {/* 短支杆 */}
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.08, 8]} />
        <meshStandardMaterial color="#8a8e94" metalness={0.9} />
      </mesh>
      {/* PIR 圆顶 */}
      <mesh position={[0, 0.015, 0]}>
        <sphereGeometry args={[0.038, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color="#15151a" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* 红色 LED 顶灯 */}
      <mesh position={[0, 0.065, 0]}>
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshStandardMaterial
          ref={ledRef}
          color={ledColor}
          emissive={ledColor}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, 0.065, 0]} color={ledColor} intensity={hi ? 1.5 : 0.6} distance={1.2} />
      {hi && (
        <mesh>
          <sphereGeometry args={[0.06, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.65} />
        </mesh>
      )}
    </group>
  )
}
