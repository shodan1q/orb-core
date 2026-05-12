/**
 * 磁悬卫星 · 主角形象
 * 多层 SVG 堆叠出立体感：球体径向渐变 + 太阳翼线性渐变 + 流光 + LED 灯环逐点呼吸 + 顶部状态灯
 * 默认尺寸 480 × 480，scale 由父级 className 控制
 */

type Props = {
  className?: string
  /** 灯光强度：bright = 强光，soft = 弱光（远景） */
  intensity?: 'bright' | 'soft'
  /** 是否绘制底部投影。Hero 中关掉，因为底座本身在另一层 */
  showShadow?: boolean
  /** 唯一前缀，避免多实例 SVG defs id 冲突 */
  uid?: string
}

export function SatelliteSculpture({
  className = '',
  intensity = 'bright',
  showShadow = true,
  uid = 'orb',
}: Props) {
  const ledOpacity = intensity === 'bright' ? 1 : 0.7

  return (
    <svg
      viewBox="0 0 480 520"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="磁悬卫星形象"
    >
      <defs>
        {/* 球体径向高光：右上角受光 */}
        <radialGradient
          id={`${uid}-body`}
          cx="38%"
          cy="32%"
          r="72%"
        >
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="35%" stopColor="#d4d4d8" />
          <stop offset="72%" stopColor="#5a5a62" />
          <stop offset="100%" stopColor="#1a1a1d" />
        </radialGradient>

        {/* 球体边缘镜面反射 */}
        <radialGradient
          id={`${uid}-rim`}
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="92%" stopColor="rgba(255,255,255,0)" />
          <stop offset="98%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>

        {/* 球体下半阴影压暗 */}
        <linearGradient id={`${uid}-bottom-dim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
        </linearGradient>

        {/* 太阳翼：深蓝玻璃质感 */}
        <linearGradient id={`${uid}-pv`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d2740" />
          <stop offset="50%" stopColor="#0c1426" />
          <stop offset="100%" stopColor="#1a233a" />
        </linearGradient>

        {/* 太阳翼边框金属 */}
        <linearGradient id={`${uid}-pv-frame`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9c9ca4" />
          <stop offset="100%" stopColor="#42424a" />
        </linearGradient>

        {/* 太阳翼上的流光 */}
        <linearGradient id={`${uid}-shimmer`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(120,170,255,0.45)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* LED 灯环辉光 */}
        <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,200,140,0.55)" />
          <stop offset="60%" stopColor="rgba(255,180,120,0.18)" />
          <stop offset="100%" stopColor="rgba(255,180,120,0)" />
        </radialGradient>

        {/* 顶部状态红灯 */}
        <radialGradient id={`${uid}-led-red`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd9d0" />
          <stop offset="40%" stopColor="#ff5a3c" />
          <stop offset="100%" stopColor="rgba(255,90,60,0)" />
        </radialGradient>

        {/* 阴影模糊 */}
        <filter id={`${uid}-blur-sm`}>
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`${uid}-blur-lg`}>
          <feGaussianBlur stdDeviation="14" />
        </filter>

        {/* 镜像 clip：流光只在面板内 */}
        <clipPath id={`${uid}-pv-clip-l`}>
          <rect x="20" y="194" width="120" height="72" rx="2" />
        </clipPath>
        <clipPath id={`${uid}-pv-clip-r`}>
          <rect x="340" y="194" width="120" height="72" rx="2" />
        </clipPath>
      </defs>

      {/* ========== 顶部投影球辉（漂浮在球上方的 LED 散射光） ========== */}
      <ellipse
        cx="240"
        cy="120"
        rx="120"
        ry="38"
        fill={`url(#${uid}-glow)`}
        opacity={ledOpacity * 0.8}
        filter={`url(#${uid}-blur-lg)`}
      />
      {/* 球体周围环境光（暖色） */}
      <circle
        cx="240"
        cy="232"
        r="160"
        fill={`url(#${uid}-glow)`}
        opacity={ledOpacity * 0.45}
        filter={`url(#${uid}-blur-lg)`}
      />

      {/* ========== 顶部天线 + 红灯 ========== */}
      <g>
        <line x1="240" y1="58" x2="240" y2="118" stroke="#3f3f46" strokeWidth="1.4" />
        <circle cx="240" cy="56" r="4.5" fill={`url(#${uid}-led-red)`} />
        <circle
          cx="240"
          cy="56"
          r="2.2"
          fill="#ff5a3c"
          style={{ animation: 'antenna-blink 2.4s ease-in-out infinite' }}
        />
      </g>

      {/* ========== 太阳翼 · 左 ========== */}
      <g>
        {/* 翼根 */}
        <rect x="138" y="225" width="22" height="10" fill={`url(#${uid}-pv-frame)`} rx="1" />
        {/* 主板 */}
        <g clipPath={`url(#${uid}-pv-clip-l)`}>
          <rect
            x="22"
            y="196"
            width="116"
            height="68"
            fill={`url(#${uid}-pv)`}
            stroke="#2a2f44"
            strokeWidth="0.8"
            rx="1.5"
          />
          {/* 玻璃格子 */}
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={22 + i * 19.5}
              y1="196"
              x2={22 + i * 19.5}
              y2="264"
              stroke="rgba(120,160,220,0.18)"
              strokeWidth="0.6"
            />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1="22"
              y1={196 + i * 17}
              x2="138"
              y2={196 + i * 17}
              stroke="rgba(120,160,220,0.18)"
              strokeWidth="0.6"
            />
          ))}
          {/* 流光：透明覆盖层 + 平移动画 */}
          <rect
            x="22"
            y="196"
            width="60"
            height="68"
            fill={`url(#${uid}-shimmer)`}
            style={{ animation: 'panel-shimmer 5s ease-in-out infinite' }}
            transform="translate(-30 0)"
          />
        </g>
        {/* 边框 */}
        <rect
          x="22"
          y="196"
          width="116"
          height="68"
          fill="none"
          stroke={`url(#${uid}-pv-frame)`}
          strokeWidth="1.2"
          rx="1.5"
        />
      </g>

      {/* ========== 太阳翼 · 右 ========== */}
      <g>
        <rect x="320" y="225" width="22" height="10" fill={`url(#${uid}-pv-frame)`} rx="1" />
        <g clipPath={`url(#${uid}-pv-clip-r)`}>
          <rect
            x="342"
            y="196"
            width="116"
            height="68"
            fill={`url(#${uid}-pv)`}
            stroke="#2a2f44"
            strokeWidth="0.8"
            rx="1.5"
          />
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={342 + i * 19.5}
              y1="196"
              x2={342 + i * 19.5}
              y2="264"
              stroke="rgba(120,160,220,0.18)"
              strokeWidth="0.6"
            />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1="342"
              y1={196 + i * 17}
              x2="458"
              y2={196 + i * 17}
              stroke="rgba(120,160,220,0.18)"
              strokeWidth="0.6"
            />
          ))}
          <rect
            x="342"
            y="196"
            width="60"
            height="68"
            fill={`url(#${uid}-shimmer)`}
            style={{ animation: 'panel-shimmer 5s ease-in-out 0.6s infinite' }}
            transform="translate(0 0)"
          />
        </g>
        <rect
          x="342"
          y="196"
          width="116"
          height="68"
          fill="none"
          stroke={`url(#${uid}-pv-frame)`}
          strokeWidth="1.2"
          rx="1.5"
        />
      </g>

      {/* ========== 球体 ========== */}
      <g>
        {/* 主球体 */}
        <circle cx="240" cy="230" r="92" fill={`url(#${uid}-body)`} />
        {/* 下半压暗 */}
        <circle cx="240" cy="230" r="92" fill={`url(#${uid}-bottom-dim)`} />
        {/* 高光圆环 */}
        <circle
          cx="240"
          cy="230"
          r="92"
          fill={`url(#${uid}-rim)`}
        />
        {/* 镜面高光斑（多层） */}
        <ellipse cx="208" cy="195" rx="26" ry="12" fill="rgba(255,255,255,0.4)" filter={`url(#${uid}-blur-sm)`} />
        <ellipse cx="200" cy="188" rx="11" ry="4" fill="rgba(255,255,255,0.92)" />
        <ellipse cx="196" cy="184" rx="4" ry="1.6" fill="rgba(255,255,255,1)" />
        {/* 边缘细光圈（rim light） */}
        <circle cx="240" cy="230" r="92" fill="none" stroke="rgba(255,210,170,0.18)" strokeWidth="2.4" filter={`url(#${uid}-blur-sm)`} />

        {/* 经线 */}
        <ellipse cx="240" cy="230" rx="92" ry="22" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" />
        <ellipse cx="240" cy="230" rx="92" ry="50" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="0.5" />
        <ellipse cx="240" cy="230" rx="44" ry="92" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.5" />

        {/* 腰部 LED 光环（横向贯穿） */}
        <ellipse
          cx="240"
          cy="232"
          rx="92"
          ry="6"
          fill="rgba(0,0,0,0.55)"
        />
        {/* LED 点阵：水平椭圆排布，每颗独立 led-pulse 错相 */}
        {Array.from({ length: 14 }).map((_, i) => {
          const t = i / 14
          const a = t * Math.PI * 2
          const x = 240 + Math.cos(a) * 92
          const y = 232 + Math.sin(a) * 6
          // 只渲染前半圈（visible），背面用低透明度暗示
          const visible = Math.sin(a) > -0.3
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={visible ? 1.6 : 1.0}
              fill={visible ? '#ffd396' : '#3a2f24'}
              style={{
                animation: visible
                  ? `led-pulse 1.8s ease-in-out ${(i * 0.12).toFixed(2)}s infinite`
                  : undefined,
                opacity: visible ? ledOpacity : 0.4,
              }}
            />
          )
        })}

        {/* 摄像头/光学窗口（脸部） */}
        <circle cx="270" cy="248" r="9" fill="#0a0a10" stroke="#52525b" strokeWidth="0.8" />
        <circle cx="272" cy="246" r="3" fill="rgba(120,170,255,0.55)" />
        <circle cx="273" cy="245" r="0.8" fill="#ffffff" />
      </g>

      {/* ========== 球体边缘细线（轮廓增强） ========== */}
      <circle cx="240" cy="230" r="92" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />

      {/* ========== 投影：地面接触阴影 ========== */}
      {showShadow ? (
        <g className="anim-shadow-breathe" style={{ transformOrigin: '240px 460px' }}>
          <ellipse
            cx="240"
            cy="460"
            rx="120"
            ry="14"
            fill="rgba(0,0,0,0.55)"
            filter={`url(#${uid}-blur-lg)`}
          />
          <ellipse
            cx="240"
            cy="460"
            rx="60"
            ry="6"
            fill="rgba(0,0,0,0.65)"
            filter={`url(#${uid}-blur-sm)`}
          />
        </g>
      ) : null}
    </svg>
  )
}
