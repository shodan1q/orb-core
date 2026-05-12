/**
 * 静态 + 缓慢闪烁的星空背景，用作 Hero / dark 区段的细节衬底
 * 用 SVG 而非 Canvas，避免 hydration 问题
 */

type Props = {
  className?: string
  count?: number
  uid?: string
}

/** 伪随机：保持星点位置在每次渲染都一致 */
function pseudo(i: number, salt: number) {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return v - Math.floor(v)
}

export function StarField({ className = '', count = 80, uid = 'sky' }: Props) {
  const stars = Array.from({ length: count }).map((_, i) => ({
    cx: pseudo(i, 1) * 1600,
    cy: pseudo(i, 2) * 900,
    r: pseudo(i, 3) * 1.1 + 0.2,
    op: 0.25 + pseudo(i, 4) * 0.6,
    delay: pseudo(i, 5) * 4,
  }))

  return (
    <svg
      className={className}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill={`url(#${uid}-glow)`}
          opacity={s.op}
          style={{
            animation: `led-pulse ${3 + (i % 5)}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </svg>
  )
}
