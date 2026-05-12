/**
 * 磁悬浮底座 · 圆碟形
 * 渐变金属盘 + 顶面 WS2812 灯环（24 颗）+ 中心 Qi 区
 */

type Props = {
  className?: string
  uid?: string
  /** 是否点亮灯环 */
  lit?: boolean
}

export function LevitationBase({ className = '', uid = 'base', lit = true }: Props) {
  return (
    <svg
      viewBox="0 0 480 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="磁悬浮底座"
    >
      <defs>
        <linearGradient id={`${uid}-side`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1c20" />
          <stop offset="50%" stopColor="#0c0c0e" />
          <stop offset="100%" stopColor="#040406" />
        </linearGradient>

        <radialGradient id={`${uid}-top`} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#2c2c32" />
          <stop offset="60%" stopColor="#16161a" />
          <stop offset="100%" stopColor="#0a0a0c" />
        </radialGradient>

        {/* Qi 中心区辉光 */}
        <radialGradient id={`${uid}-qi-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(120,170,255,0.55)" />
          <stop offset="60%" stopColor="rgba(120,170,255,0.12)" />
          <stop offset="100%" stopColor="rgba(120,170,255,0)" />
        </radialGradient>

        {/* 顶面金属反光 */}
        <linearGradient id={`${uid}-top-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        <filter id={`${uid}-blur-md`}>
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* 上方 LED 反射（卫星投到顶面的微光） */}
      <ellipse
        cx="240"
        cy="46"
        rx="160"
        ry="12"
        fill="rgba(255,200,150,0.22)"
        filter={`url(#${uid}-blur-md)`}
        opacity={lit ? 1 : 0}
      />

      {/* 圆碟侧面 */}
      <path
        d="M 60 70 L 60 120 A 180 22 0 0 0 420 120 L 420 70 Z"
        fill={`url(#${uid}-side)`}
      />
      <ellipse cx="240" cy="120" rx="180" ry="22" fill="#040406" />

      {/* 顶面盘 */}
      <ellipse cx="240" cy="70" rx="180" ry="22" fill={`url(#${uid}-top)`} />
      <ellipse cx="240" cy="70" rx="180" ry="22" fill={`url(#${uid}-top-shine)`} />

      {/* Qi 中心圈（同心圆暗示线圈） */}
      <ellipse cx="240" cy="70" rx="60" ry="7" fill={`url(#${uid}-qi-glow)`} opacity={lit ? 1 : 0.3} />
      <ellipse cx="240" cy="70" rx="46" ry="5.4" fill="none" stroke="rgba(120,170,255,0.35)" strokeWidth="0.5" />
      <ellipse cx="240" cy="70" rx="32" ry="3.6" fill="none" stroke="rgba(120,170,255,0.3)" strokeWidth="0.5" />
      <ellipse cx="240" cy="70" rx="18" ry="2.2" fill="none" stroke="rgba(120,170,255,0.28)" strokeWidth="0.5" />

      {/* 浅锥对接凹槽阴影 */}
      <ellipse cx="240" cy="68" rx="38" ry="4.4" fill="rgba(0,0,0,0.6)" />
      <ellipse cx="240" cy="68" rx="22" ry="2.2" fill="rgba(0,0,0,0.7)" />

      {/* 顶面 LED 光环 24 颗，沿椭圆 */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2
        const x = 240 + Math.cos(a) * 158
        const y = 70 + Math.sin(a) * 19
        const visible = Math.sin(a) >= -0.05
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={visible ? 1.6 : 1.0}
            fill={visible ? '#a8c8ff' : '#1d2a45'}
            style={{
              animation: visible && lit
                ? `led-pulse 2.4s ease-in-out ${((i * 0.1) % 2.4).toFixed(2)}s infinite`
                : undefined,
              opacity: visible ? (lit ? 0.95 : 0.4) : 0.5,
            }}
          />
        )
      })}

      {/* 顶面边缘高光线 */}
      <ellipse cx="240" cy="70" rx="180" ry="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
      <path
        d="M 60 70 A 180 22 0 0 1 420 70"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.6"
      />

      {/* 底部接缝 */}
      <ellipse cx="240" cy="120" rx="180" ry="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.6" />

      {/* 地面投影 */}
      <ellipse
        cx="240"
        cy="148"
        rx="200"
        ry="14"
        fill="rgba(0,0,0,0.6)"
        filter={`url(#${uid}-blur-md)`}
      />
    </svg>
  )
}
