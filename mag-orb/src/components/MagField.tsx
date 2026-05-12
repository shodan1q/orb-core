/**
 * 磁场弧线动画 · 用于卫星与底座之间的悬浮气隙
 * 多组 dasharray 不同相位的弧线，循环 stroke-dashoffset 形成"上行能量"
 */

type Props = {
  className?: string
  uid?: string
}

export function MagField({ className = '', uid = 'fld' }: Props) {
  const arcs = [
    { y: 0, w: 130, op: 1.0, d: 0.0, c: '#ffd9a8' },
    { y: 6, w: 110, op: 0.9, d: 0.18, c: '#ffd0a0' },
    { y: 12, w: 90, op: 0.78, d: 0.36, c: '#ffe0c0' },
    { y: 18, w: 68, op: 0.6, d: 0.54, c: '#c0d8ff' },
    { y: 24, w: 46, op: 0.45, d: 0.72, c: '#a8c8ff' },
  ]
  return (
    <svg
      viewBox="0 0 360 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="磁悬浮力线"
    >
      <defs>
        <linearGradient id={`${uid}-line`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,200,150,1)" />
          <stop offset="50%" stopColor="rgba(220,200,255,0.9)" />
          <stop offset="100%" stopColor="rgba(120,170,255,0.9)" />
        </linearGradient>
        <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,210,170,0.55)" />
          <stop offset="100%" stopColor="rgba(255,210,170,0)" />
        </radialGradient>
        <filter id={`${uid}-soft`}>
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      {/* 中心能量晕 */}
      <ellipse cx="180" cy="56" rx="44" ry="14" fill={`url(#${uid}-core)`} />
      <ellipse cx="180" cy="60" rx="80" ry="6" fill="rgba(180,200,255,0.18)" />

      {arcs.map((a, i) => (
        <g key={i} opacity={a.op} filter={`url(#${uid}-soft)`}>
          <path
            d={`M ${180 - a.w} ${68 + a.y} Q 180 ${30 - i * 3} ${180 + a.w} ${68 + a.y}`}
            fill="none"
            stroke={`url(#${uid}-line)`}
            strokeWidth={1.4}
            strokeDasharray="5 5"
            strokeLinecap="round"
            style={{
              animation: `gap-shimmer ${1.4 + i * 0.18}s linear infinite`,
              animationDelay: `${a.d}s`,
            }}
          />
        </g>
      ))}

      {/* 中心垂直能量柱 */}
      <line
        x1="180"
        y1="20"
        x2="180"
        y2="78"
        stroke="rgba(255,210,170,0.35)"
        strokeWidth="1.2"
        strokeDasharray="2 4"
        style={{ animation: `gap-shimmer 1.2s linear infinite` }}
      />
    </svg>
  )
}
