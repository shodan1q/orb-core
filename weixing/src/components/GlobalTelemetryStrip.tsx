import type { ReactNode } from 'react'
import type { SatelliteHealthSnapshot } from '../hooks/useSimulatedTelemetry'
import { CornerMarks } from './CornerMarks'

type Orbit = {
  lat: number
  lng: number
  altitudeKm: number
  speedKms: number
}

/** 与 SatelliteConsole 顶栏标签一致 */
export type ConsoleTabId = 'overview' | 'satellite' | 'attitude' | 'media' | 'eco'

type Props = {
  health: SatelliteHealthSnapshot
  orbit: Orbit
  /** 点击卡片切换到对应功能页 */
  onNavigateTab?: (id: ConsoleTabId) => void
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M7 17L17 7M17 7H9M17 7V15" />
    </svg>
  )
}

type Metric = {
  title: string
  value: string
  tag: string
  detail: string
  gauge: ReactNode
  navigateTo: ConsoleTabId
}

/** 折叠态：占位层与浮层内容一致，行高随文案换行自适应 */
function CardCollapsedFace({
  title,
  value,
  tag,
  iconMuted = true,
}: Pick<Metric, 'title' | 'value' | 'tag'> & { iconMuted?: boolean }) {
  return (
    <>
      <div className="flex items-start justify-between gap-1.5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-900">{title}</h3>
        <span
          className={`shrink-0 ${iconMuted ? 'text-zinc-400 transition group-hover:text-zinc-700' : 'text-zinc-400'}`}
          aria-hidden
        >
          <ExpandIcon />
        </span>
      </div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums leading-tight text-zinc-900 md:text-xl">{value}</div>
      <div className="mt-0.5 text-[10px] leading-snug text-zinc-500">{tag}</div>
    </>
  )
}

function StripArcGauge({ pct, caption }: { pct: number; caption: string }) {
  const v = Math.max(0, Math.min(100, pct))
  const arcLen = 88
  const dash = (v / 100) * arcLen
  return (
    <div className="flex flex-col items-center py-1">
      <div className="relative h-[52px] w-[112px]">
        <svg className="h-full w-full" viewBox="0 0 112 56" fill="none" aria-hidden>
          <path
            d="M 12 48 A 44 44 0 0 1 100 48"
            stroke="#e4e4e7"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 12 48 A 44 44 0 0 1 100 48"
            stroke="#171717"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${arcLen}`}
          />
        </svg>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] font-semibold tabular-nums text-zinc-900">
          {v.toFixed(0)}%
        </div>
      </div>
      <p className="mt-0.5 text-center text-[9px] text-zinc-500">{caption}</p>
    </div>
  )
}

function StripHBar({ pct, label }: { pct: number; label: string }) {
  const p = Math.max(0, Math.min(100, pct))
  return (
    <div className="py-1">
      <div className="mb-1 flex justify-between text-[9px] text-zinc-500">
        <span>{label}</span>
        <span className="font-mono tabular-nums text-zinc-800">{p.toFixed(0)}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
        <div className="h-full rounded-full bg-zinc-900 transition-all duration-300" style={{ width: `${p}%` }} />
      </div>
    </div>
  )
}

function StripSparkBars({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values, 1e-6)
  return (
    <div className="py-1">
      <p className="mb-1 text-[9px] text-zinc-500">{label}</p>
      <div className="flex h-12 items-end justify-between gap-px px-0.5">
        {values.map((h, i) => (
          <div
            key={i}
            className="min-w-0 flex-1 rounded-t-[1px] bg-zinc-800"
            style={{ height: `${Math.max(12, (h / max) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * 占位层撑开栅格行高（随标题/数值/标签换行自适应）；交互层 absolute 叠上，
 * 悬停 z 极高，盖过首页三张主卡片（顶栏 z 更高）。
 */
function GlobalMetricCard({
  title,
  value,
  tag,
  detail,
  gauge,
  navigateTo,
  onNavigateTab,
}: Metric & { onNavigateTab?: (id: ConsoleTabId) => void }) {
  const go = () => onNavigateTab?.(navigateTo)

  return (
    <div className="group relative w-full overflow-visible">
      <div className="invisible pointer-events-none select-none px-3 py-3 md:px-3.5 md:py-3.5" aria-hidden>
        <CardCollapsedFace title={title} value={value} tag={tag} iconMuted={false} />
      </div>
      <div
        role={onNavigateTab ? 'button' : undefined}
        tabIndex={onNavigateTab ? 0 : undefined}
        aria-label={onNavigateTab ? `进入${title}相关页面` : undefined}
        className={`absolute bottom-0 left-0 right-0 z-[1] flex w-full origin-bottom flex-col gap-1.5 bg-white p-3 text-zinc-900 shadow-none ring-1 ring-zinc-200/80 transition-[transform,box-shadow,min-height,max-height] duration-300 ease-out will-change-transform group-hover:z-[9999] group-hover:max-h-[min(78dvh,560px)] group-hover:min-h-0 group-hover:-translate-y-8 group-hover:overflow-y-auto group-hover:shadow-[0_-16px_56px_rgba(0,0,0,0.2),0_32px_64px_rgba(0,0,0,0.22)] group-hover:ring-2 group-hover:ring-zinc-300 md:gap-2 md:p-3.5 md:group-hover:-translate-y-11 ${
          onNavigateTab ? 'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2' : ''
        }`}
        onClick={onNavigateTab ? go : undefined}
        onKeyDown={
          onNavigateTab
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  go()
                }
              }
            : undefined
        }
      >
        <CornerMarks className="!text-zinc-300" />
        <div className="relative z-10">
          <CardCollapsedFace title={title} value={value} tag={tag} />
        </div>
        <div className="relative z-10 max-h-0 overflow-hidden opacity-0 transition-[max-height,opacity,margin] duration-300 ease-out group-hover:mt-2 group-hover:max-h-[min(52dvh,420px)] group-hover:opacity-100">
          <div className="border-t border-zinc-200 pt-2">{gauge}</div>
          <p className="mt-2 whitespace-pre-line text-[10px] leading-relaxed text-zinc-600">{detail}</p>
        </div>
      </div>
    </div>
  )
}

function fmtLat(deg: number) {
  const h = deg >= 0 ? 'N' : 'S'
  return `${h} ${Math.abs(deg).toFixed(4)}°`
}

function fmtLng(deg: number) {
  const h = deg >= 0 ? 'E' : 'W'
  return `${h} ${Math.abs(deg).toFixed(4)}°`
}

export function GlobalTelemetryStrip({ health, orbit, onNavigateTab }: Props) {
  const tMax = Math.max(...health.temps.map((t) => t.c))
  const tMin = Math.min(...health.temps.map((t) => t.c))
  const tempLines = health.temps.map((t) => `${t.label.padEnd(8, '…')} ${t.c.toFixed(1)} °C`).join('\n')

  const altGaugePct = Math.max(0, Math.min(100, ((orbit.altitudeKm - 380) / 280) * 100))
  const speedGaugePct = Math.max(0, Math.min(100, ((orbit.speedKms - 7.15) / 0.75) * 100))
  const tmLoadPct = Math.max(0, Math.min(100, (health.comm.tmBps / 45_000) * 100))
  const tleFreshPct = Math.max(0, Math.min(100, 100 - (health.nav.tleAgeH / 20) * 100))
  const crcPct = Math.max(0, Math.min(100, health.comm.tmCrcOk))
  const tmSpark = Array.from({ length: 12 }, (_, i) => 0.4 + 0.6 * Math.sin(i * 0.7 + health.comm.tmBps * 0.00002))

  const items: Metric[] = [
    {
      title: '轨道高度',
      value: `${orbit.altitudeKm.toFixed(2)} km`,
      tag: `${fmtLat(orbit.lat)} · ${fmtLng(orbit.lng)}`,
      detail:
        `WGS-84 椭球几何高度，与轨道页轨迹同源刷新。\n瞬时位置：纬度 ${orbit.lat.toFixed(5)}°，经度 ${orbit.lng.toFixed(5)}°\n标称圆轨道约 520 km 级（示意），用于判断星历与地图是否一致。`,
      gauge: <StripArcGauge pct={altGaugePct} caption="相对示意量程 380–660 km" />,
      navigateTo: 'overview',
    },
    {
      title: '地速',
      value: `${orbit.speedKms.toFixed(3)} km/s`,
      tag: `${(orbit.speedKms * 3600).toFixed(0)} km/h 等效`,
      detail:
        `星历微分得到的标量速率（非雷达测速）。\n≈ ${(orbit.speedKms * 1000).toFixed(1)} m/s\n与推进/制动预案比对用；LEO 典型量级 7.6–7.8 km/s。`,
      gauge: <StripArcGauge pct={speedGaugePct} caption="LEO 标量速率带（示意）" />,
      navigateTo: 'attitude',
    },
    {
      title: '蓄电池 SOC',
      value: `${health.eps.soc.toFixed(1)} %`,
      tag: `母线 ${health.eps.battV.toFixed(2)} V · 充放 ${health.eps.battI >= 0 ? '+' : ''}${health.eps.battI.toFixed(2)} A`,
      detail:
        `太阳翼输出 ${health.eps.solarI.toFixed(2)} A × ${health.eps.solarV.toFixed(1)} V ≈ ${(health.eps.solarI * health.eps.solarV).toFixed(0)} W\n太阳翼温度 ${health.eps.solarT.toFixed(1)} °C · 电池温度 ${health.eps.battT.toFixed(1)} °C\n发用电平衡指示 ${health.epsBalancePct.toFixed(0)} %（示意）。`,
      gauge: (
        <>
          <StripArcGauge pct={health.eps.soc} caption="荷电状态 SOC" />
          <StripHBar pct={health.epsBalancePct} label="发用电平衡（示意）" />
        </>
      ),
      navigateTo: 'eco',
    },
    {
      title: 'TM 下行',
      value: `${(health.comm.tmBps / 1000).toFixed(1)} kbps`,
      tag: `CRC ${health.comm.tmCrcOk.toFixed(3)} % · TC 队列 ${health.comm.tcPending}`,
      detail:
        `工程遥测帧下行码率（模拟）。\n测距残差 σ ≈ ${health.comm.rangeSigmaM.toFixed(2)} m\n多普勒 ${health.comm.dopplerHz.toFixed(1)} Hz（定轨原始量之一）。`,
      gauge: (
        <>
          <StripHBar pct={tmLoadPct} label="下行码率负荷（相对 45 kbps）" />
          <StripHBar pct={crcPct} label="TM 帧 CRC 通过率" />
          <StripSparkBars values={tmSpark} label="近期码率波动（示意）" />
        </>
      ),
      navigateTo: 'media',
    },
    {
      title: '热控裕度',
      value: `${health.thermalMarginPct.toFixed(0)} %`,
      tag: `ΔT ${(tMax - tMin).toFixed(1)} K · 最高 ${tMax.toFixed(1)} °C`,
      detail:
        `多点温度快照：\n${tempLines}\n相对热控目标裕度为合成指标；载荷舱与翼根温差用于判断散热路径是否正常。`,
      gauge: (
        <>
          <StripArcGauge pct={health.thermalMarginPct} caption="合成热控裕度" />
          <StripSparkBars
            values={health.temps.map((t) => t.c)}
            label="各点温度相对分布（示意）"
          />
        </>
      ),
      navigateTo: 'satellite',
    },
    {
      title: 'TLE / 星历',
      value: `${health.nav.tleAgeH.toFixed(2)} h`,
      tag: `|v| ${health.nav.osvV.toFixed(2)} m/s`,
      detail:
        `星历 UTC：${health.nav.ephUtc}\nOSV 位置模 |r| ≈ ${(health.nav.osvR / 1e6).toFixed(4)}×10⁶ m\n速度模 |v| = ${health.nav.osvV.toFixed(2)} m/s\nTLE 龄期用于判断预报刷新是否 overdue。`,
      gauge: (
        <>
          <StripArcGauge pct={tleFreshPct} caption="星历新鲜度（龄期越短越高）" />
          <StripHBar pct={Math.min(100, (health.nav.osvV / 8000) * 100)} label="|v| 相对示意量程" />
        </>
      ),
      navigateTo: 'satellite',
    },
  ]

  return (
    <section
      className="relative z-[500] isolate -mt-3 overflow-visible bg-[#0a0a0c] md:-mt-5"
      style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}
    >
      <div className="pointer-events-none h-2 select-none md:h-3" aria-hidden />

      <div className="overflow-visible">
        <div className="border-t border-zinc-400/25 bg-[#f0f0f0] px-4 pt-2.5 pb-2 md:px-6 md:pt-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
              全局状态摘要
            </h2>
            <p className="text-[10px] text-zinc-500">悬停展开 · 点击卡片进入对应栏目 · 完整分系统见「卫星数据」</p>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-zinc-200/90 overflow-visible bg-white sm:grid-cols-3 lg:grid-cols-6 lg:items-stretch">
          {items.map((it) => (
            <div key={it.title} className="relative flex min-w-0 flex-col justify-end overflow-visible bg-white px-0.5 pb-0.5 pt-1 sm:px-1">
              <GlobalMetricCard {...it} onNavigateTab={onNavigateTab} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
