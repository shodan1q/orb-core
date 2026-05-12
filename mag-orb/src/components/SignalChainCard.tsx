import { useState } from 'react'
import { CornerMarks } from './CornerMarks'

/**
 * 信号链路：以 MCU 为中心的星形连接图。
 * 节点位置基于 SVG viewBox 800×400；每条链路对应一束杜邦线。
 */

type NodeId = 'mcu' | 'battery' | 'servo' | 'dish' | 'ir' | 'oled' | 'led' | 'motor' | 'base'

type Node = {
  id: NodeId
  index: string
  name: string
  sub: string
  x: number
  y: number
  isHub?: boolean
}

const NODES: Node[] = [
  { id: 'mcu', index: '03', name: '海思 Hi3863', sub: 'MCU HUB', x: 400, y: 200, isHub: true },
  { id: 'battery', index: '02', name: '锂聚电池', sub: '3.7 V', x: 160, y: 110 },
  { id: 'base', index: '01', name: '磁悬浮底座', sub: '5 V Qi', x: 160, y: 290 },
  { id: 'servo', index: '04', name: '舵机', sub: 'SG90', x: 270, y: 70 },
  { id: 'dish', index: '05', name: '卫星锅', sub: 'DISH', x: 410, y: 60 },
  { id: 'ir', index: '06', name: '红外探头', sub: 'PIR', x: 550, y: 70 },
  { id: 'oled', index: '07', name: 'OLED 屏', sub: 'I²C', x: 670, y: 200 },
  { id: 'led', index: '08', name: 'LED 矩阵', sub: '12×12', x: 550, y: 330 },
  { id: 'motor', index: '09', name: '直流电机', sub: 'PWM', x: 270, y: 330 },
]

type LinkKind = 'pwr' | 'gnd' | 'pwm' | 'i2c' | 'gpio' | 'sr' | 'mech'

type Link = {
  from: NodeId
  to: NodeId
  kind: LinkKind
  label: string
}

const KIND: Record<LinkKind, { color: string; en: string; zh: string }> = {
  pwr: { color: '#e53935', en: 'PWR', zh: '电源' },
  gnd: { color: '#71717a', en: 'GND', zh: '地' },
  pwm: { color: '#ff9433', en: 'PWM', zh: '脉宽' },
  i2c: { color: '#ffe14f', en: 'I²C', zh: '总线' },
  gpio: { color: '#3aa6ff', en: 'GPIO', zh: '中断' },
  sr: { color: '#6fd64f', en: 'SR', zh: '移位' },
  mech: { color: '#cfd2d6', en: 'MECH', zh: '机械' },
}

const LINKS: Link[] = [
  // 电池总线
  { from: 'base', to: 'battery', kind: 'pwr', label: '感应 5V→3.7V' },
  { from: 'battery', to: 'mcu', kind: 'pwr', label: 'VCC + GND' },
  // 舵机
  { from: 'mcu', to: 'servo', kind: 'pwm', label: 'PWM 50Hz' },
  { from: 'servo', to: 'dish', kind: 'mech', label: '机械传动' },
  // IR
  { from: 'mcu', to: 'ir', kind: 'gpio', label: 'GPIO INT' },
  // OLED
  { from: 'mcu', to: 'oled', kind: 'i2c', label: 'I²C 400kHz' },
  // LED 矩阵
  { from: 'mcu', to: 'led', kind: 'sr', label: '74HC595 级联' },
  // 电机
  { from: 'mcu', to: 'motor', kind: 'pwm', label: 'PWM 调速 + 编码' },
]

export function SignalChainCard() {
  const [hover, setHover] = useState<NodeId | null>(null)

  const isLinkActive = (l: Link) => hover === l.from || hover === l.to
  const isNodeActive = (id: NodeId) =>
    hover === id ||
    LINKS.some((l) => hover && (l.from === hover && l.to === id) || (l.to === hover && l.from === id))

  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#0d0d10]">
      <CornerMarks />
      <header className="relative z-10 flex items-start justify-between border-b border-zinc-800/60 px-5 pb-3 pt-4 md:px-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Signal Chain
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-200">
            信号链路图 · 以 MCU 为中心的星形拓扑
          </p>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-wider text-zinc-500 sm:inline-flex">
          08 LINKS · CLOSED LOOP
        </span>
      </header>

      <div className="relative z-10 m-3 overflow-hidden rounded-2xl border border-zinc-800/60 bg-black p-5 md:m-4 md:p-6">
        <svg viewBox="0 0 800 400" className="w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker
              id="sigArrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#52525b" />
            </marker>
          </defs>

          {/* 背景网格 */}
          <g stroke="#18181b" strokeWidth="0.5">
            {Array.from({ length: 17 }, (_, i) => (
              <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={400} />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 50} x2={800} y2={i * 50} />
            ))}
          </g>

          {/* 连线 */}
          {LINKS.map((link, i) => {
            const a = NODES.find((n) => n.id === link.from)!
            const b = NODES.find((n) => n.id === link.to)!
            const isHi = isLinkActive(link)
            const color = isHi ? KIND[link.kind].color : '#3f3f46'
            // 弯线：中点向 MCU 中心方向偏一点
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            return (
              <g key={i}>
                <path
                  d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                  stroke={color}
                  strokeWidth={isHi ? 2 : 1}
                  fill="none"
                  strokeDasharray={isHi ? 'none' : '6 4'}
                  markerEnd="url(#sigArrow)"
                />
                <text
                  x={mx}
                  y={my - 8}
                  textAnchor="middle"
                  fontFamily="ui-monospace, Menlo, monospace"
                  fontSize="10"
                  letterSpacing="0.5"
                  fill={isHi ? color : '#52525b'}
                >
                  {link.label}
                </text>
              </g>
            )
          })}

          {/* 节点 */}
          {NODES.map((n) => {
            const active = isNodeActive(n.id)
            const r = n.isHub ? 56 : 44
            const fill = '#0a0a0c'
            const stroke = active ? '#fafafa' : '#3f3f46'
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={-r}
                  y={-28}
                  width={r * 2}
                  height={56}
                  rx={n.isHub ? 14 : 10}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={active ? 1.6 : 1}
                />
                <text
                  x={0}
                  y={-10}
                  textAnchor="middle"
                  fontFamily="ui-monospace, Menlo, monospace"
                  fontSize="9"
                  letterSpacing="1"
                  fill={active ? '#fafafa' : '#71717a'}
                >
                  {n.index} · {n.sub}
                </text>
                <text
                  x={0}
                  y={11}
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize={n.isHub ? 14 : 12}
                  fontWeight="600"
                  fill={active ? '#ffffff' : '#a1a1aa'}
                >
                  {n.name}
                </text>
                {n.isHub && (
                  <circle cx={-r + 12} cy={-18} r={3} fill="#3aff5f">
                    <animate
                      attributeName="opacity"
                      values="1;0.3;1"
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* 信号类型图例 */}
      <div className="relative z-10 grid grid-cols-2 gap-px border-t border-zinc-800/60 bg-zinc-800/40 sm:grid-cols-4 lg:grid-cols-7">
        {(Object.entries(KIND) as [LinkKind, (typeof KIND)[LinkKind]][]).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 bg-[#0d0d10] px-3 py-3">
            <span
              className="h-1.5 w-6 shrink-0 rounded-full"
              style={{ background: v.color }}
            />
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                {v.en}
              </p>
              <p className="text-[11px] text-zinc-500">{v.zh}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="relative z-10 px-5 py-3 text-center text-[10px] text-zinc-600 md:px-6">
        悬停任一节点 · 高亮其所属链路 · 颜色对应信号类型
      </p>
    </section>
  )
}
