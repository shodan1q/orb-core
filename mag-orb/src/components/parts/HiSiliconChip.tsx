import type { PartMeshProps } from '../../data/parts'

export function HiSiliconChip({ selected, hovered, onPointerOver, onPointerOut, onClick }: PartMeshProps) {
  const ledColor = '#ff9433'
  const hi = selected || hovered

  const pinCount = 6
  const pins = []
  for (let i = 0; i < pinCount; i++) {
    const t = (i + 0.5) / pinCount - 0.5
    pins.push(
      <mesh key={`n${i}`} position={[t * 0.18, 0.05, -0.115]}>
        <boxGeometry args={[0.018, 0.005, 0.04]} />
        <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.2} />
      </mesh>,
      <mesh key={`s${i}`} position={[t * 0.18, 0.05, 0.115]}>
        <boxGeometry args={[0.018, 0.005, 0.04]} />
        <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.2} />
      </mesh>,
      <mesh key={`e${i}`} position={[0.115, 0.05, t * 0.18]}>
        <boxGeometry args={[0.04, 0.005, 0.018]} />
        <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.2} />
      </mesh>,
      <mesh key={`w${i}`} position={[-0.115, 0.05, t * 0.18]}>
        <boxGeometry args={[0.04, 0.005, 0.018]} />
        <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.2} />
      </mesh>,
    )
  }

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
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.45, 0.04, 0.32]} />
        <meshStandardMaterial color="#0c3818" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.085, 0]}>
        <boxGeometry args={[0.2, 0.04, 0.2]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.106, 0]}>
        <boxGeometry args={[0.14, 0.001, 0.14]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.16, 0.05, -0.13]}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color={ledColor} emissive={ledColor} emissiveIntensity={hi ? 2.5 : 1} toneMapped={false} />
      </mesh>
      {pins}
      {hi && (
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.49, 0.13, 0.36]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  )
}
