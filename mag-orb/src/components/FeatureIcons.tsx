/**
 * 6 个能力小图标，每个都有独立微动效，用于 FeatureGrid
 * 黑底白线（dark variant）/ 白底黑线（light variant）
 */

type IconProps = { className?: string }

export function IconLevitate({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" aria-hidden>
      <ellipse cx="32" cy="22" rx="14" ry="11" strokeWidth="1.5" className="anim-float-soft" />
      {/* 底盘 */}
      <ellipse cx="32" cy="50" rx="22" ry="4" strokeWidth="1.5" />
      <ellipse cx="32" cy="50" rx="14" ry="2.5" strokeWidth="1" opacity="0.5" />
      {/* 磁场弧 */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M ${22 - i * 3} 42 Q 32 ${36 - i * 4} ${42 + i * 3} 42`}
          strokeWidth="0.9"
          strokeDasharray="2 2"
          opacity={0.7 - i * 0.18}
          style={{ animation: `gap-shimmer ${1.4 + i * 0.2}s linear infinite` }}
        />
      ))}
    </svg>
  )
}

export function IconQi({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" aria-hidden>
      <circle cx="32" cy="32" r="3.5" fill="currentColor" stroke="none" />
      {[1, 2, 3].map((i) => (
        <circle
          key={i}
          cx="32"
          cy="32"
          r={i * 8}
          strokeWidth="1.4"
          opacity={0}
          style={{
            animation: `signal-ripple 2.4s ease-out ${(i * 0.6).toFixed(2)}s infinite`,
            transformOrigin: '32px 32px',
          }}
        />
      ))}
      {/* 静态外圈，方便定位识别 */}
      <circle cx="32" cy="32" r="22" strokeWidth="1" opacity="0.25" strokeDasharray="3 3" />
    </svg>
  )
}

export function IconFlywheel({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" aria-hidden>
      <g className="anim-flywheel-spin" style={{ transformOrigin: '32px 32px' }}>
        <circle cx="32" cy="32" r="20" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="3" fill="currentColor" stroke="none" />
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <line
            key={deg}
            x1="32"
            y1="32"
            x2={32 + Math.cos((deg * Math.PI) / 180) * 18}
            y2={32 + Math.sin((deg * Math.PI) / 180) * 18}
            strokeWidth="1.2"
          />
        ))}
        {/* 配重小块 */}
        <circle cx="50" cy="32" r="2" fill="currentColor" stroke="none" />
        <circle cx="14" cy="32" r="2" fill="currentColor" stroke="none" />
      </g>
      <circle cx="32" cy="32" r="24" strokeWidth="0.7" opacity="0.3" strokeDasharray="2 3" />
    </svg>
  )
}

export function IconNearLink({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" aria-hidden>
      <circle cx="32" cy="44" r="3" fill="currentColor" stroke="none" />
      {[14, 22, 30].map((r, i) => (
        <path
          key={r}
          d={`M ${32 - r} 44 A ${r} ${r} 0 0 1 ${32 + r} 44`}
          strokeWidth="1.4"
          opacity={0.6 - i * 0.15}
          style={{
            animation: `signal-ripple 2s ease-out ${(i * 0.4).toFixed(2)}s infinite`,
            transformOrigin: '32px 44px',
          }}
        />
      ))}
      {/* 静态线作为锚点 */}
      <path d="M 18 44 A 14 14 0 0 1 46 44" strokeWidth="0.8" opacity="0.3" />
    </svg>
  )
}

export function IconLEDRing({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" aria-hidden>
      <circle cx="32" cy="32" r="22" strokeWidth="1" opacity="0.3" strokeDasharray="2 3" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        const x = 32 + Math.cos(a) * 22
        const y = 32 + Math.sin(a) * 22
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="1.8"
            fill="currentColor"
            stroke="none"
            style={{
              animation: `led-pulse 1.6s ease-in-out ${(i * 0.13).toFixed(2)}s infinite`,
            }}
          />
        )
      })}
      <circle cx="32" cy="32" r="10" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export function IconNFC({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" aria-hidden>
      {/* 手指 */}
      <path d="M 40 14 v 24 a 4 4 0 0 1 -4 4 h -16 a 6 6 0 0 1 -6 -6 v -2 l 6 -6 v -10 a 4 4 0 0 1 8 0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* 信号弧（点击发出） */}
      {[6, 12, 18].map((r, i) => (
        <path
          key={r}
          d={`M ${48 + r * 0.4} ${22 - r * 0.2} a ${r} ${r} 0 0 1 0 ${r * 0.9}`}
          strokeWidth="1.2"
          opacity={0}
          style={{
            animation: `signal-ripple 2s ease-out ${(i * 0.4).toFixed(2)}s infinite`,
            transformOrigin: '48px 32px',
          }}
        />
      ))}
      <circle cx="48" cy="32" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}
