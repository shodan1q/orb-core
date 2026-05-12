import * as THREE from 'three'
import type { PartMeshProps } from '../../data/parts'

export function Dish({ selected, hovered, onPointerOver, onPointerOut, onClick }: PartMeshProps) {
  const hi = selected || hovered

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
      // 翻转 180° 使凹面朝上；轻微后倾让锅口稍稍前倾
      rotation={[Math.PI + Math.PI * 0.06, 0, 0]}
    >
      {/* 抛物面外壳（背面，金属银） */}
      <mesh castShadow>
        <sphereGeometry args={[0.4, 56, 32, 0, Math.PI * 2, 0, Math.PI * 0.38]} />
        <meshStandardMaterial color="#c8ccd2" metalness={0.9} roughness={0.22} side={THREE.DoubleSide} />
      </mesh>
      {/* 内凹反射面（更亮镜面） */}
      <mesh position={[0, -0.002, 0]}>
        <sphereGeometry args={[0.385, 56, 32, 0, Math.PI * 2, 0, Math.PI * 0.38]} />
        <meshStandardMaterial color="#e8ebef" metalness={0.95} roughness={0.08} side={THREE.BackSide} />
      </mesh>
      {/* 馈源支臂（短杆，从凹面中心指向焦点） */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.32, 8]} />
        <meshStandardMaterial color="#8a8e94" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* 馈源馈头（焦点小金属块） */}
      <mesh position={[0, -0.34, 0]}>
        <sphereGeometry args={[0.022, 16, 16]} />
        <meshStandardMaterial color="#3a3f48" metalness={0.7} roughness={0.4} />
      </mesh>
      {hi && (
        <mesh>
          <sphereGeometry args={[0.44, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}
