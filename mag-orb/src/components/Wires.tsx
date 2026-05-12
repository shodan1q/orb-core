import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * 杜邦线：全部以海思 MCU PCB 为中心放射到外围零件
 * MCU PCB 中心 ≈ (0.18, 0.36, -0.08)，PCB 尺寸 0.45×0.32，顶面 y=0.39
 * 颜色约定：
 *   红 #e53935  电源 VCC
 *   黑 #1c1c1c  地 GND
 *   橙 #ff9433  PWM / 信号
 *   黄 #ffe14f  数据 SDA
 *   绿 #6fd64f  时钟 SCL
 *   蓝 #3aa6ff  GPIO 中断
 *   白 #e4e4e7  辅助
 */

type Cable = {
  from: [number, number, number]
  to: [number, number, number]
  via?: [number, number, number][]
  color: string
  radius?: number
}

const RED = '#e53935'
const BLACK = '#1c1c1c'
const ORANGE = '#ff9433'
const YELLOW = '#ffe14f'
const GREEN = '#6fd64f'
const BLUE = '#3aa6ff'
const WHITE = '#e4e4e7'

const CABLES: Cable[] = [
  // ─── 海思 → 电池：VCC + GND ───
  {
    from: [0.0, 0.4, -0.05],
    via: [[-0.08, 0.34, -0.02]],
    to: [-0.2, 0.3, 0.0],
    color: RED,
  },
  {
    from: [0.0, 0.4, 0.02],
    via: [[-0.08, 0.34, 0.05]],
    to: [-0.2, 0.3, 0.04],
    color: BLACK,
  },

  // ─── 海思 → 舵机：PWM + VCC + GND，三线一束 ───
  {
    from: [-0.02, 0.4, -0.18],
    via: [[-0.04, 0.5, -0.18]],
    to: [-0.05, 0.56, -0.18],
    color: ORANGE,
  },
  {
    from: [0.02, 0.4, -0.18],
    via: [[-0.01, 0.5, -0.18]],
    to: [-0.03, 0.56, -0.18],
    color: RED,
  },
  {
    from: [0.06, 0.4, -0.18],
    via: [[0.02, 0.5, -0.18]],
    to: [-0.01, 0.56, -0.18],
    color: BLACK,
  },

  // ─── 海思 → OLED：SDA + SCL + VCC + GND，四线一束 ───
  {
    from: [0.04, 0.4, 0.08],
    via: [[0.02, 0.36, 0.18]],
    to: [-0.02, 0.32, 0.32],
    color: YELLOW,
  },
  {
    from: [0.09, 0.4, 0.08],
    via: [[0.06, 0.36, 0.2]],
    to: [0.02, 0.32, 0.32],
    color: GREEN,
  },
  {
    from: [0.14, 0.4, 0.08],
    via: [[0.1, 0.36, 0.2]],
    to: [0.06, 0.32, 0.32],
    color: RED,
  },
  {
    from: [0.19, 0.4, 0.08],
    via: [[0.14, 0.36, 0.2]],
    to: [0.1, 0.32, 0.32],
    color: BLACK,
  },

  // ─── 海思 → 红外探头：信号 + 辅助，沿耦合杆向上 ───
  {
    from: [0.12, 0.4, -0.1],
    via: [
      [0.06, 0.55, -0.08],
      [0.02, 0.7, -0.05],
    ],
    to: [-0.02, 0.78, -0.05],
    color: BLUE,
  },
  {
    from: [0.15, 0.4, -0.06],
    via: [
      [0.08, 0.55, -0.06],
      [0.03, 0.7, -0.04],
    ],
    to: [-0.01, 0.78, -0.04],
    color: WHITE,
  },

  // ─── 海思 → 右太阳能板（+X）：PWR + GND，沿支臂走线 ───
  {
    from: [0.4, 0.4, -0.05],
    via: [
      [0.45, 0.5, 0.0],
      [0.6, 0.58, 0.0],
    ],
    to: [0.78, 0.58, 0.0],
    color: RED,
  },
  {
    from: [0.4, 0.4, -0.02],
    via: [
      [0.45, 0.5, 0.04],
      [0.6, 0.58, 0.04],
    ],
    to: [0.78, 0.58, 0.04],
    color: BLACK,
  },

  // ─── 海思 → 左太阳能板（-X）：PWR + GND，绕过 PCB 左边 ───
  {
    from: [-0.04, 0.4, -0.18],
    via: [
      [-0.2, 0.5, -0.15],
      [-0.45, 0.55, -0.05],
      [-0.6, 0.58, 0.0],
    ],
    to: [-0.78, 0.58, 0.0],
    color: RED,
  },
  {
    from: [-0.04, 0.4, -0.14],
    via: [
      [-0.2, 0.5, -0.12],
      [-0.45, 0.55, -0.02],
      [-0.6, 0.58, 0.04],
    ],
    to: [-0.78, 0.58, 0.04],
    color: BLACK,
  },

  // ─── 海思 → 小马达 (0.1, 0.2, 0.05)：VCC + GND + 编码反馈 ───
  {
    from: [0.18, 0.4, 0.04],
    via: [[0.14, 0.3, 0.06]],
    to: [0.08, 0.21, 0.0],
    color: RED,
  },
  {
    from: [0.22, 0.4, 0.04],
    via: [[0.16, 0.3, 0.05]],
    to: [0.12, 0.21, -0.01],
    color: BLACK,
  },
  {
    from: [0.25, 0.4, 0.0],
    via: [[0.2, 0.28, 0.0]],
    to: [0.1, 0.22, 0.03],
    color: GREEN,
  },

  // ─── 海思 → LED 矩阵 (0, 0.4, -0.45)：VCC + GND + DATA + CLK，绕过 PCB 边缘往后 ───
  {
    from: [0.3, 0.4, -0.12],
    via: [
      [0.2, 0.45, -0.3],
      [0.05, 0.42, -0.42],
    ],
    to: [-0.08, 0.4, -0.42],
    color: RED,
  },
  {
    from: [0.3, 0.4, -0.16],
    via: [
      [0.2, 0.45, -0.32],
      [0.05, 0.42, -0.44],
    ],
    to: [-0.05, 0.4, -0.44],
    color: BLACK,
  },
  {
    from: [0.32, 0.4, -0.1],
    via: [
      [0.24, 0.45, -0.28],
      [0.08, 0.42, -0.4],
    ],
    to: [-0.02, 0.4, -0.42],
    color: YELLOW,
  },
  {
    from: [0.32, 0.4, -0.06],
    via: [
      [0.26, 0.45, -0.26],
      [0.1, 0.42, -0.38],
    ],
    to: [0.02, 0.4, -0.42],
    color: WHITE,
  },
]

function Tube({ points, color, opacity, radius = 0.0055 }: { points: THREE.Vector3[]; color: string; opacity: number; radius?: number }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
    return new THREE.TubeGeometry(curve, Math.max(16, points.length * 10), radius, 8, false)
  }, [points, radius])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        roughness={0.4}
        metalness={0.1}
        transparent
        opacity={opacity}
      />
    </mesh>
  )
}

export function Wires({ explode }: { explode: number }) {
  const opacity = Math.max(0, 1 - explode * 4)
  if (opacity <= 0.02) return null

  return (
    <group>
      {CABLES.map((c, i) => {
        const pts = [
          new THREE.Vector3(...c.from),
          ...(c.via?.map((v) => new THREE.Vector3(...v)) ?? []),
          new THREE.Vector3(...c.to),
        ]
        return <Tube key={i} points={pts} color={c.color} opacity={opacity} radius={c.radius ?? 0.0055} />
      })}
    </group>
  )
}
