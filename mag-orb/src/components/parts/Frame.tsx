import { useMemo } from 'react'
import * as THREE from 'three'

export function Frame() {
  const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(0.78, 0.78, 0.78)), [])
  const corners = useMemo(() => {
    const cs: Array<[number, number, number]> = []
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        for (const z of [-1, 1])
          cs.push([x * 0.39, y * 0.39, z * 0.39])
    return cs
  }, [])
  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#d4a64a" />
      </lineSegments>
      {corners.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color="#d4a64a" metalness={0.95} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * 两侧太阳能翼：每翼 = 内片 + 中间铰链 + 外片，仿真实折叠太阳能阵
 */
export function SolarWings() {
  const HALF_W = 0.45      // 单片宽度
  const PANEL_H = 0.55     // 面板高度
  const GAP = 0.04         // 内外片之间的铰链宽度
  const PANEL_OUT = 1.18   // 整翼中心距本体
  const verticals = [-0.16, 0, 0.16]
  const horizontals = [-0.18, 0, 0.18]

  /** 单片面板（带网格切割线） */
  const Panel = ({ side: _side }: { side: number }) => (
    <group>
      {/* 板主体 */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[HALF_W, PANEL_H, 0.018]} />
        <meshStandardMaterial color="#0a1224" metalness={0.45} roughness={0.4} />
      </mesh>
      {/* 表面浅色镀膜 */}
      <mesh position={[0, 0, 0.0095]}>
        <boxGeometry args={[HALF_W, PANEL_H, 0.001]} />
        <meshBasicMaterial color="#1a2a4d" transparent opacity={0.5} />
      </mesh>
      {/* 纵向切割线 */}
      {verticals.map((dx) => (
        <mesh key={`v${dx}`} position={[dx, 0, 0.012]}>
          <boxGeometry args={[0.003, PANEL_H, 0.001]} />
          <meshStandardMaterial color="#1a2440" />
        </mesh>
      ))}
      {/* 横向切割线 */}
      {horizontals.map((dy) => (
        <mesh key={`h${dy}`} position={[0, dy, 0.012]}>
          <boxGeometry args={[HALF_W, 0.003, 0.001]} />
          <meshStandardMaterial color="#1a2440" />
        </mesh>
      ))}
      {/* 四角金属固定点 */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sy], i) => (
        <mesh
          key={i}
          position={[sx * (HALF_W / 2 - 0.02), sy * (PANEL_H / 2 - 0.02), 0.011]}
        >
          <cylinderGeometry args={[0.008, 0.008, 0.003, 8]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )

  /** 内外片之间的铰链：上下两段金属耳片 + 中间铰销 */
  const Hinge = () => (
    <group>
      {[-1, 1].map((sy) => (
        <group key={sy}>
          <mesh position={[0, sy * 0.18, 0]}>
            <boxGeometry args={[GAP * 1.2, 0.04, 0.022]} />
            <meshStandardMaterial color="#5a5e64" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, sy * 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.005, 0.005, GAP * 1.2, 10]} />
            <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {/* 中段细条把上下耳片连起来 */}
      <mesh>
        <boxGeometry args={[GAP * 0.6, 0.36, 0.014]} />
        <meshStandardMaterial color="#3a3f48" metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  )

  return (
    <group>
      {[-1, 1].map((side) => {
        // 内片中心位置（靠近本体一侧）
        const innerX = -side * (HALF_W / 2 + GAP / 2)
        // 外片中心位置（远离本体）
        const outerX = side * (HALF_W / 2 + GAP / 2)
        // 支臂长度：从框架边缘 (±0.39) 到内片靠内边缘 (PANEL_OUT - HALF_W - GAP/2)
        const armLen = PANEL_OUT - 0.39 - HALF_W - GAP / 2

        return (
          <group key={side} position={[side * PANEL_OUT, 0.18, 0]} rotation={[0, 0, side * 0.05]}>
            {/* 支臂：从框架到内片内侧 */}
            <mesh
              position={[-side * (HALF_W + GAP / 2 + armLen / 2), 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.012, 0.012, armLen, 12]} />
              <meshStandardMaterial color="#9aa0a8" metalness={0.85} roughness={0.3} />
            </mesh>
            {/* 支臂端头小连接座 */}
            <mesh position={[-side * (HALF_W + GAP / 2), 0, 0]}>
              <boxGeometry args={[0.03, 0.05, 0.03]} />
              <meshStandardMaterial color="#6a6e74" metalness={0.7} roughness={0.4} />
            </mesh>

            {/* 内片 */}
            <group position={[innerX, 0, 0]}>
              <Panel side={side} />
            </group>

            {/* 中间铰链 */}
            <group position={[0, 0, 0]}>
              <Hinge />
            </group>

            {/* 外片 */}
            <group position={[outerX, 0, 0]}>
              <Panel side={side} />
            </group>
          </group>
        )
      })}
    </group>
  )
}
