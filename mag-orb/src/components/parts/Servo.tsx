import type { PartMeshProps } from '../../data/parts'

export function Servo({ selected, hovered, onPointerOver, onPointerOut, onClick }: PartMeshProps) {
  const signalColor = '#ff5f57'
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
      <mesh>
        <boxGeometry args={[0.22, 0.18, 0.32]} />
        <meshStandardMaterial color="#1a3168" roughness={0.55} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.12, 0.08]}>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 24]} />
        <meshStandardMaterial color="#dddddd" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.19, 0.08]}>
        <cylinderGeometry args={[0.08, 0.08, 0.02, 24]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.115, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.018, 16]} />
        <meshStandardMaterial color={signalColor} emissive={signalColor} emissiveIntensity={hi ? 1.8 : 0.6} toneMapped={false} />
      </mesh>
      {hi && (
        <mesh>
          <boxGeometry args={[0.26, 0.22, 0.36]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  )
}
