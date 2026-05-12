import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PartMeshProps } from '../../data/parts'

export function MagLevBase({ selected, hovered, onPointerOver, onPointerOut, onClick }: PartMeshProps) {
  const ringRef = useRef<THREE.MeshStandardMaterial>(null)
  const ringColor = '#3aa6ff'
  const hi = selected || hovered

  useFrame((state) => {
    if (!ringRef.current) return
    const t = state.clock.getElapsedTime()
    ringRef.current.emissiveIntensity = 1.2 + Math.sin(t * 1.4) * 0.4
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
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.78, 0.88, 0.34, 64]} />
        <meshStandardMaterial color="#0e0e10" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.02, 64]} />
        <meshStandardMaterial color="#050507" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <ringGeometry args={[0.06, 0.09, 32]} />
        <meshStandardMaterial color="#2a2a2f" />
      </mesh>
      <mesh position={[0, -0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.78, 0.82, 96]} />
        <meshStandardMaterial
          ref={ringRef}
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={1.4}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {hi && (
        <mesh>
          <cylinderGeometry args={[0.9, 1.0, 0.36, 64]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  )
}
