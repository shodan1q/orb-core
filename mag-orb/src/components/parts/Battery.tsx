import type { PartMeshProps } from '../../data/parts'

export function Battery({ selected, hovered, onPointerOver, onPointerOut, onClick }: PartMeshProps) {
  const labelColor = '#7cff5f'
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
    >
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.32, 32]} />
        <meshStandardMaterial color="#1d3d2a" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.091, 0.091, 0.18, 32, 1, true]} />
        <meshStandardMaterial color={labelColor} emissive={labelColor} emissiveIntensity={hi ? 0.4 : 0.15} />
      </mesh>
      <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.04, 16]} />
        <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
      </mesh>
      {hi && (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.11, 0.11, 0.34, 32]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}
