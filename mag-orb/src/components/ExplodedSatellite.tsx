/**
 * 可交互拆解视图 v2 — 阶梯延迟动画
 *
 * 设计要点：
 * 1. 每个部件按 stage（0..9）分配 transition-delay，从顶部向下涟漪式拆开
 * 2. 上下半球壳在拆开时分别带 ±6° 旋转，强调"打开"
 * 3. 内部组件加微缩 / 微放大（0.96 → 1）"落位"动效
 * 4. 拆开时画出装配点 origin marker，hover 时高亮该装配位
 * 5. 单部件 hover：drop-shadow 暖光 + scale(1.03)；其他部件淡到 0.45
 */

export type PartId =
  | 'antenna'
  | 'shell-top'
  | 'led-ring'
  | 'mcu'
  | 'imu-motor'
  | 'flywheel'
  | 'battery'
  | 'qi-rx'
  | 'shell-bot'
  | 'mag-pin'

type Part = {
  id: PartId
  /** 装配位 y（在 viewBox 中） */
  yAssembled: number
  /** 拆开后 y */
  yExploded: number
  /** 拆开时的旋转角度（默认 0） */
  rotateExploded?: number
  /** 阶梯顺序（决定 transition-delay）。0 = 最早 */
  stage: number
}

const PARTS: Part[] = [
  { id: 'antenna', yAssembled: 320, yExploded: 60, stage: 0 },
  { id: 'shell-top', yAssembled: 350, yExploded: 165, rotateExploded: -6, stage: 1 },
  { id: 'led-ring', yAssembled: 358, yExploded: 250, stage: 2 },
  { id: 'mcu', yAssembled: 354, yExploded: 320, stage: 3 },
  { id: 'imu-motor', yAssembled: 360, yExploded: 410, stage: 4 },
  { id: 'flywheel', yAssembled: 366, yExploded: 480, stage: 5 },
  { id: 'battery', yAssembled: 370, yExploded: 540, stage: 6 },
  { id: 'qi-rx', yAssembled: 380, yExploded: 620, stage: 7 },
  { id: 'shell-bot', yAssembled: 374, yExploded: 720, rotateExploded: 6, stage: 8 },
  { id: 'mag-pin', yAssembled: 410, yExploded: 820, stage: 9 },
]

type Props = {
  className?: string
  uid?: string
  explode: number /** 0..1 */
  hovered: PartId | null
  onHover: (id: PartId | null) => void
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function ExplodedSatellite({
  className = '',
  uid = 'exp',
  explode,
  hovered,
  onHover,
}: Props) {
  const STAGE_DELAY = 65
  const DURATION = 1100

  /** 部件公共 props：staggered transition + hover scale */
  const partGroupProps = (p: Part) => {
    const y = lerp(p.yAssembled, p.yExploded, explode)
    const dy = y - p.yAssembled
    const rot = (p.rotateExploded ?? 0) * explode
    const isHover = hovered === p.id
    const isFaded = hovered !== null && !isHover
    /** 落位时的弹跳：在 0~1 临界处给一点点回弹（Subtle） */
    const easedScale = 0.96 + 0.04 * (explode <= 0 ? 1 : explode >= 1 ? 1 : 0.7 + 0.3 * Math.sin(explode * Math.PI))

    return {
      onMouseEnter: () => onHover(p.id),
      onMouseLeave: () => onHover(null),
      onClick: () => onHover(isHover ? null : p.id),
      style: {
        cursor: 'pointer',
        transition: `transform ${DURATION}ms cubic-bezier(0.22, 1, 0.36, 1) ${
          p.stage * STAGE_DELAY
        }ms, filter 240ms ease-out, opacity 240ms ease-out`,
        transform: `translate(0, ${dy}px) rotate(${rot}deg) scale(${
          isHover ? easedScale * 1.03 : easedScale
        })`,
        transformOrigin: '300px 360px',
        transformBox: 'fill-box',
        filter: isHover ? 'drop-shadow(0 0 14px rgba(255,210,160,0.65))' : 'none',
        opacity: isFaded ? 0.4 : 1,
      } as React.CSSProperties,
    }
  }

  return (
    <svg
      viewBox="0 0 600 900"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="磁悬卫星拆解视图"
    >
      <defs>
        <radialGradient id={`${uid}-body`} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="35%" stopColor="#d4d4d8" />
          <stop offset="72%" stopColor="#5a5a62" />
          <stop offset="100%" stopColor="#1a1a1d" />
        </radialGradient>
        <radialGradient id={`${uid}-rim`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="92%" stopColor="rgba(255,255,255,0)" />
          <stop offset="98%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <linearGradient id={`${uid}-pcb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a3a2a" />
          <stop offset="100%" stopColor="#0c1c14" />
        </linearGradient>
        <linearGradient id={`${uid}-batt`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5a5a64" />
          <stop offset="50%" stopColor="#7a7a86" />
          <stop offset="100%" stopColor="#3a3a44" />
        </linearGradient>
        <radialGradient id={`${uid}-coil`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3a3a44" />
          <stop offset="60%" stopColor="#1a1a20" />
          <stop offset="100%" stopColor="#0a0a0c" />
        </radialGradient>
        <linearGradient id={`${uid}-copper`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8a878" />
          <stop offset="50%" stopColor="#a07444" />
          <stop offset="100%" stopColor="#5e3e1c" />
        </linearGradient>
        <radialGradient id={`${uid}-led-red`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd9d0" />
          <stop offset="40%" stopColor="#ff5a3c" />
          <stop offset="100%" stopColor="rgba(255,90,60,0)" />
        </radialGradient>
        <filter id={`${uid}-soft`}>
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* 中轴线 */}
      <line
        x1="300"
        y1="40"
        x2="300"
        y2="860"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="0.6"
        strokeDasharray="3 5"
      />

      {/* ====== 装配位标记（origin marker）：拆开时显示 ====== */}
      {explode > 0.15 ? (
        <g
          opacity={Math.min(1, (explode - 0.15) * 1.3)}
          style={{ transition: 'opacity 600ms ease-out' }}
        >
          {PARTS.map((p) => (
            <g key={`origin-${p.id}`}>
              <circle
                cx="300"
                cy={p.yAssembled}
                r="2"
                fill="none"
                stroke={hovered === p.id ? '#ffd296' : 'rgba(161,161,170,0.4)'}
                strokeWidth="0.8"
              />
              <circle
                cx="300"
                cy={p.yAssembled}
                r="0.8"
                fill={hovered === p.id ? '#ffd296' : 'rgba(161,161,170,0.5)'}
              />
            </g>
          ))}
        </g>
      ) : null}

      {/* ====== 引线和编号标 ====== */}
      {explode > 0.05 ? (
        <g
          opacity={Math.min(1, (explode - 0.05) * 1.2)}
          style={{ transition: 'opacity 500ms ease-out' }}
        >
          {PARTS.map((p, i) => {
            const isHover = hovered === p.id
            const y = lerp(p.yAssembled, p.yExploded, explode)
            return (
              <g
                key={`label-${p.id}`}
                style={{
                  transition: `transform ${DURATION}ms cubic-bezier(0.22, 1, 0.36, 1) ${
                    p.stage * STAGE_DELAY
                  }ms`,
                  transform: `translate(0, ${y - p.yAssembled}px)`,
                }}
              >
                <line
                  x1="430"
                  y1={p.yAssembled}
                  x2="510"
                  y2={p.yAssembled}
                  stroke={isHover ? '#ffd296' : 'rgba(161,161,170,0.35)'}
                  strokeWidth={isHover ? 1.2 : 0.6}
                  strokeDasharray="2 3"
                  style={{ transition: 'stroke 200ms, stroke-width 200ms' }}
                />
                <circle
                  cx="430"
                  cy={p.yAssembled}
                  r={isHover ? 2.4 : 1.5}
                  fill={isHover ? '#ffd296' : '#a1a1aa'}
                  style={{ transition: 'r 200ms, fill 200ms' }}
                />
                <text
                  x="520"
                  y={p.yAssembled + 3}
                  fontSize="9"
                  fontFamily="Inter"
                  fill={isHover ? '#ffd296' : 'rgba(161,161,170,0.7)'}
                  style={{ transition: 'fill 200ms' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </text>
              </g>
            )
          })}
        </g>
      ) : null}

      {/* ========== 1. 顶部天线 ========== */}
      <g {...partGroupProps(PARTS[0])}>
        <line x1="300" y1="316" x2="300" y2="348" stroke="#a1a1aa" strokeWidth="1.2" />
        <circle cx="300" cy="316" r="5" fill={`url(#${uid}-led-red)`} />
        <circle
          cx="300"
          cy="316"
          r="2.4"
          fill="#ff5a3c"
          style={{ animation: 'antenna-blink 2.4s ease-in-out infinite' }}
        />
      </g>

      {/* ========== 2. 上半球外壳 ========== */}
      <g {...partGroupProps(PARTS[1])}>
        <path
          d="M 208 350 A 92 70 0 0 1 392 350 Z"
          fill={`url(#${uid}-body)`}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="0.8"
        />
        <path d="M 208 350 A 92 70 0 0 1 392 350" fill={`url(#${uid}-rim)`} />
        <path
          d="M 240 350 Q 300 285 360 350"
          fill="none"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.6"
        />
        <ellipse
          cx="270"
          cy="318"
          rx="20"
          ry="6"
          fill="rgba(255,255,255,0.45)"
          filter={`url(#${uid}-soft)`}
        />
        <ellipse cx="262" cy="312" rx="8" ry="2.5" fill="rgba(255,255,255,0.85)" />
      </g>

      {/* ========== 3. LED 扫描光环 ========== */}
      <g {...partGroupProps(PARTS[2])}>
        <ellipse cx="300" cy="358" rx="92" ry="6" fill="#0a0a0c" />
        <ellipse
          cx="300"
          cy="358"
          rx="92"
          ry="6"
          fill="none"
          stroke="rgba(60,60,68,0.6)"
          strokeWidth="0.6"
        />
        {Array.from({ length: 14 }).map((_, i) => {
          const t = i / 14
          const a = t * Math.PI * 2
          const x = 300 + Math.cos(a) * 92
          const y = 358 + Math.sin(a) * 6
          const visible = Math.sin(a) > -0.3
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={visible ? 1.8 : 1.0}
              fill={visible ? '#ffd396' : '#3a2f24'}
              style={{
                animation: visible
                  ? `led-pulse 1.8s ease-in-out ${(i * 0.12).toFixed(2)}s infinite`
                  : undefined,
              }}
            />
          )
        })}
      </g>

      {/* ========== 4. 主控 PCB ========== */}
      <g {...partGroupProps(PARTS[3])}>
        <rect x="220" y="346" width="160" height="22" rx="2" fill={`url(#${uid}-pcb)`} stroke="#0a1a12" strokeWidth="0.6" />
        <line x1="220" y1="354" x2="380" y2="354" stroke="rgba(180,220,200,0.2)" strokeWidth="0.4" />
        <line x1="220" y1="362" x2="380" y2="362" stroke="rgba(180,220,200,0.18)" strokeWidth="0.4" />
        <rect x="232" y="350" width="36" height="14" fill="#27272f" stroke="#52525b" strokeWidth="0.5" />
        <text x="250" y="361" fontSize="6.5" textAnchor="middle" fill="#a1a1aa" fontFamily="Inter">
          Hi3863
        </text>
        <circle cx="282" cy="357" r="3.5" fill="#3f3f46" stroke="#71717a" strokeWidth="0.4" />
        <circle cx="298" cy="357" r="3.5" fill="#3f3f46" stroke="#71717a" strokeWidth="0.4" />
        {[316, 326, 336, 346, 356].map((x) => (
          <circle key={x} cx={x} cy="357" r="0.8" fill="#a87030" />
        ))}
        <rect x="362" y="350" width="14" height="14" fill="#27272f" stroke="#52525b" strokeWidth="0.5" />
      </g>

      {/* ========== 5. IMU + 飞轮电机 ========== */}
      <g {...partGroupProps(PARTS[4])}>
        <rect x="218" y="354" width="22" height="14" fill="#1f1f24" stroke="#52525b" strokeWidth="0.6" />
        <text x="229" y="364" fontSize="6" textAnchor="middle" fill="#a1a1aa" fontFamily="Inter">
          IMU
        </text>
        <ellipse cx="300" cy="352" rx="18" ry="4" fill="#a1a1aa" />
        <rect x="282" y="352" width="36" height="22" fill="#3f3f46" stroke="#1f1f24" strokeWidth="0.6" />
        <ellipse cx="300" cy="374" rx="18" ry="4" fill="#27272f" stroke="#1f1f24" strokeWidth="0.5" />
        <line x1="300" y1="348" x2="300" y2="378" stroke="#71717a" strokeWidth="1.4" />
        <rect x="354" y="356" width="22" height="12" fill="#1f1f24" stroke="#52525b" strokeWidth="0.6" />
        <text x="365" y="365" fontSize="5.5" textAnchor="middle" fill="#a1a1aa" fontFamily="Inter">
          DRV
        </text>
      </g>

      {/* ========== 6. 反作用飞轮 ========== */}
      <g {...partGroupProps(PARTS[5])}>
        <ellipse cx="300" cy="362" rx="68" ry="8" fill={`url(#${uid}-copper)`} />
        <ellipse
          cx="300"
          cy="370"
          rx="68"
          ry="8"
          fill={`url(#${uid}-copper)`}
          opacity="0.7"
        />
        <line x1="232" y1="362" x2="232" y2="370" stroke="#5e3e1c" strokeWidth="0.8" />
        <line x1="368" y1="362" x2="368" y2="370" stroke="#5e3e1c" strokeWidth="0.8" />
        <ellipse cx="300" cy="362" rx="6" ry="1.4" fill="#0a0a0c" />
        {[-50, -32, -14, 4, 22, 40, 58].map((dx) => (
          <line
            key={dx}
            x1={300 + dx}
            y1="362"
            x2={300 + dx}
            y2="370"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="0.5"
          />
        ))}
      </g>

      {/* ========== 7. LiPo 电池 ========== */}
      <g {...partGroupProps(PARTS[6])}>
        <rect x="244" y="356" width="112" height="28" rx="3" fill={`url(#${uid}-batt)`} stroke="#27272f" strokeWidth="0.8" />
        <rect x="248" y="360" width="104" height="20" fill="#27272f" stroke="#52525b" strokeWidth="0.4" />
        <rect x="356" y="362" width="6" height="4" fill="#d4a060" />
        <rect x="356" y="372" width="6" height="4" fill="#a1a1aa" />
        <text
          x="300"
          y="374"
          fontSize="7"
          textAnchor="middle"
          fill="#a1a1aa"
          fontFamily="Inter"
          letterSpacing="0.5"
        >
          LiPo · 600 mAh
        </text>
      </g>

      {/* ========== 8. Qi RX 接收线圈 ========== */}
      <g {...partGroupProps(PARTS[7])}>
        <ellipse cx="300" cy="370" rx="74" ry="9" fill={`url(#${uid}-coil)`} />
        {[64, 52, 40, 28, 16].map((r, i) => (
          <ellipse
            key={r}
            cx="300"
            cy="370"
            rx={r}
            ry={r * 0.12}
            fill="none"
            stroke={i % 2 === 0 ? '#a87030' : '#7c5320'}
            strokeWidth="0.7"
          />
        ))}
        <ellipse cx="300" cy="370" rx="6" ry="1" fill="rgba(255,200,140,0.3)" />
      </g>

      {/* ========== 9. 下半球外壳 ========== */}
      <g {...partGroupProps(PARTS[8])}>
        <path
          d="M 208 374 A 92 70 0 0 0 392 374 Z"
          fill={`url(#${uid}-body)`}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="0.8"
        />
        <path d="M 208 374 A 92 70 0 0 0 392 374" fill={`url(#${uid}-rim)`} />
        <path
          d="M 240 374 Q 300 440 360 374"
          fill="none"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.6"
        />
        <ellipse cx="300" cy="380" rx="80" ry="50" fill="rgba(0,0,0,0.55)" opacity={0.4} />
      </g>

      {/* ========== 10. 永磁定位钉 ========== */}
      <g {...partGroupProps(PARTS[9])}>
        {[-32, 0, 32].map((dx) => (
          <g key={dx}>
            <rect x={300 + dx - 6} y="402" width="12" height="10" rx="1" fill="#1f1f24" stroke="#52525b" strokeWidth="0.5" />
            <rect x={300 + dx - 6} y="402" width="12" height="3" fill="#27272f" />
            <text
              x={300 + dx}
              y="424"
              fontSize="6"
              textAnchor="middle"
              fill="#52525b"
              fontFamily="Inter"
            >
              N52
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}

export const PART_INFO: Record<
  PartId,
  { num: string; name: string; spec: string; weight: string; role: string }
> = {
  antenna: {
    num: '01',
    name: '顶部天线 + 状态灯',
    spec: '2.4 GHz PCB 天线 · 红色 LED 信标',
    weight: '< 0.5 g',
    role: '信号收发与可视心跳。每两秒一次的脉冲告诉你它在线。',
  },
  'shell-top': {
    num: '02',
    name: '上半球外壳',
    spec: 'PLA 3D 打印 · 装配公差 ±0.2 mm · 喷砂哑光',
    weight: '15 g',
    role: '保护内部分系统并把太阳翼支臂结构性引出。',
  },
  'led-ring': {
    num: '03',
    name: 'LED 扫描光环',
    spec: '12 颗 WS2812B-1515 微型封装 · 24 位真彩',
    weight: '2 g',
    role: '腰部全角度光环。从待机的呼吸到任务的扫描，灯光会替它说话。',
  },
  mcu: {
    num: '04',
    name: 'Hi3863 主控板',
    spec: '海思 Hi3863 · 星闪 NearLink + Wi-Fi 6 + BLE 5.4',
    weight: '3 g',
    role: '鸿蒙 OpenHarmony 原生，30 ms 端到端把状态推到 App / 桌面。',
  },
  'imu-motor': {
    num: '05',
    name: '6 轴 IMU + 飞轮电机',
    spec: 'MPU6050 · 空心杯 1020 35 000 rpm · DRV8833',
    weight: '6 g',
    role: 'IMU 测姿态，电机出力矩。1 kHz 闭环让它"知道朝哪并能转过去"。',
  },
  flywheel: {
    num: '06',
    name: '反作用飞轮',
    spec: '铜配重盘 ⌀25 mm × 4 mm · J ≈ 8×10⁻⁶ kg·m²',
    weight: '18 g',
    role: '高转速反向旋转产生力矩反作用。2 秒内完成 90° 转向。',
  },
  battery: {
    num: '07',
    name: 'LiPo 软包电池',
    spec: '502535 · 600 mAh · 3.7 V · 含保护板',
    weight: '12 g',
    role: '空中独立工作三小时，下班自动满血。',
  },
  'qi-rx': {
    num: '08',
    name: 'Qi 5 W 接收线圈',
    spec: '同心铜线圈 + 整流稳压 · 输出 5 V',
    weight: '8 g',
    role: '不接触、不复位姿态地接收能量。',
  },
  'shell-bot': {
    num: '09',
    name: '下半球外壳',
    spec: 'PLA 3D 打印 · 配重铁砂可微调 ±5 g',
    weight: '15 g',
    role: '负责装配后的重心配平，确保悬浮姿态稳定。',
  },
  'mag-pin': {
    num: '10',
    name: '永磁定位钉 ×3',
    spec: 'N52 钕磁铁 ⌀5 × 3 mm · 三角等分',
    weight: '1 g',
    role: '与底座对接磁铁配对，松手即归位。',
  },
}

export const PART_ORDER: PartId[] = [
  'antenna',
  'shell-top',
  'led-ring',
  'mcu',
  'imu-motor',
  'flywheel',
  'battery',
  'qi-rx',
  'shell-bot',
  'mag-pin',
]
