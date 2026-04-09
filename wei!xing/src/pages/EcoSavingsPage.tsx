import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AttitudeStlCanvas } from '../components/AttitudeStlCanvas'
import { CornerMarks } from '../components/CornerMarks'
import { SolarStorageArray } from '../components/SolarStorageArray'
import type { EcoSnapshot, SatelliteHealthSnapshot } from '../hooks/useSimulatedTelemetry'

type Props = { eco: EcoSnapshot; tick: number; health: SatelliteHealthSnapshot }

const CALLOUTS: { id: string; title: string; detail: string }[] = [
  { id: '01', title: '太阳阵直流汇流', detail: 'MPPT · 辐照波动' },
  { id: '02', title: '母线载荷', detail: '载荷 / 热控 / 通信' },
  { id: '03', title: '蓄电池削峰', detail: '阴影放电 · 阳照回充' },
  { id: '04', title: '算力功耗', detail: 'Token 折算产出' },
  { id: '05', title: '等效 PUE', detail: '轨道散热回路' },
  { id: '06', title: '地面对照', detail: '参考机房 PUE' },
]

function TechCell({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#0a0a0c]/95 px-2 py-2 md:px-3 md:py-3">
      <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-500 md:text-[9px]">{label}</p>
      <div className="mt-1 border-t border-zinc-800/80 pt-1 font-mono text-base font-semibold tabular-nums text-white md:text-lg">
        {value}
      </div>
      <p className="mt-0.5 text-[8px] leading-snug text-zinc-600 md:text-[9px]">{sub}</p>
    </div>
  )
}

export function EcoSavingsPage({ eco, tick, health }: Props) {
  const pitchDemo = Math.sin(tick * 0.018) * 5
  const rollDemo = Math.cos(tick * 0.022) * 4
  const yawDemo = (tick * 0.35) % 360

  const solarUtilPct = Math.min(100, (eco.busLoadW / Math.max(eco.solarW, 1e-6)) * 100)

  const compareRow = [
    {
      name: '能效 (1/PUE)',
      本星: Number((1 / eco.satEffectivePue).toFixed(3)),
      地球参考: Number((1 / eco.earthRefPue).toFixed(3)),
    },
    {
      name: '算力碳强度',
      本星: Number((eco.busLoadW / 1000 / Math.max(eco.computeTokenKPerH, 0.1)).toFixed(2)),
      地球参考: Number(
        ((eco.busLoadW * 1.35) / 1000 / Math.max(eco.computeTokenKPerH, 0.1)).toFixed(2),
      ),
    },
  ]

  const trend = Array.from({ length: 12 }, (_, i) => {
    const t = tick - (11 - i)
    const kwh = 120 + i * 8.2 + Math.sin(t * 0.08) * 3
    const tok = 2.8 + i * 0.18 + Math.cos(t * 0.06) * 0.12
    return {
      窗口: `W${i + 1}`,
      累计节电_kWh: Number(kwh.toFixed(2)),
      累计省Token_M: Number(tok.toFixed(2)),
    }
  })

  const fmtCny = (n: number) =>
    new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      maximumFractionDigits: 0,
    }).format(n)

  const pctBetter = ((eco.vsEarthRatio - 1) * 100).toFixed(1)
  const sheetNo = String((tick % 90) + 1).padStart(2, '0')

  const tooltipStyle = {
    background: '#0c0c0e',
    border: '1px solid #3f3f46',
    borderRadius: 6,
    fontSize: 11,
    color: '#e4e4e7',
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-black">
      {/* 底层：STL 线稿 + CSS 滤镜（saturate-0 等在 Canvas 外包一层） */}
      <div className="absolute inset-0 z-0">
        <AttitudeStlCanvas variant="eco" pitchDeg={pitchDemo} rollDeg={rollDemo} yawDeg={yawDemo} />
      </div>

      {/* 叠层 HUD：仅面板接收指针，中空区可旋转模型 */}
      <div className="relative z-10 flex h-full min-h-0 flex-col gap-1.5 p-2 pointer-events-none md:gap-2 md:p-3">
        <header className="pointer-events-auto shrink-0 border-b border-zinc-700/40 bg-black/60 px-3 py-2 backdrop-blur-md md:px-4 md:py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 text-[9px] uppercase tracking-[0.2em] text-zinc-500">
                <span>卫星环保简报</span>
                <span className="font-mono tabular-nums text-zinc-400">{sheetNo}</span>
              </div>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-white md:text-xl">
                地空能源数据
                <span className="ml-2 text-sm font-normal text-zinc-500">Ground / Space Energy</span>
              </h2>
            </div>
            <div className="hidden shrink-0 text-right text-[9px] text-zinc-600 sm:block">
              <p>PUE 参考 {eco.earthRefPue.toFixed(2)}</p>
              <p className="font-mono text-zinc-400">本星 {eco.satEffectivePue.toFixed(2)}</p>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 justify-between gap-2 md:gap-3">
          <aside className="pointer-events-auto flex w-[min(16.5rem,44vw)] max-w-[270px] shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#0a0a0c]/88 backdrop-blur-md">
            <div className="shrink-0 border-b border-zinc-800/70 px-2.5 py-2 md:px-3">
              <div className="flex items-end justify-between gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                  太阳翼 · 储能
                </span>
                <div className="text-right">
                  <p className="text-[8px] text-zinc-600">载荷/发电</p>
                  <p className="font-mono text-xs font-semibold tabular-nums text-white">
                    {solarUtilPct.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="mt-1 text-[8px] text-zinc-600">
                发用电平衡指示 {health.epsBalancePct.toFixed(0)}%（遥测）
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-2.5 py-2 md:px-3">
              <SolarStorageArray health={health} tick={tick} compact />
            </div>
          </aside>

          <aside className="pointer-events-auto flex w-[min(15rem,42vw)] max-w-[260px] shrink-0 flex-col gap-1.5 overflow-hidden">
            <div className="rounded-2xl border border-zinc-800/80 bg-[#0a0a0c]/85 p-2 backdrop-blur-md md:p-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">图例</p>
              <ul className="mt-1.5 max-h-[min(28dvh,220px)] space-y-1.5 overflow-hidden">
                {CALLOUTS.map((c) => (
                  <li key={c.id} className="flex gap-2 text-[9px] leading-tight">
                    <span className="font-mono font-bold text-zinc-300">{c.id}</span>
                    <span>
                      <span className="text-zinc-400">{c.title}</span>
                      <span className="block text-[8px] text-zinc-600">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <footer className="pointer-events-auto shrink-0 space-y-1.5 border-t border-zinc-800/50 bg-black/55 py-2 backdrop-blur-md md:space-y-2 md:py-2.5">
          <p className="px-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-zinc-500 md:px-3 md:text-[9px]">
            Technical overview
          </p>
          <div className="grid grid-cols-2 gap-px bg-zinc-800/50 sm:grid-cols-3 lg:grid-cols-6">
            <TechCell
              label="累计绿色发电"
              value={`${eco.cumulativeKWh.toFixed(1)} kWh`}
              sub={`${(eco.cumulativeKWh / 1000).toFixed(3)} MWh`}
            />
            <TechCell
              label="累计省 Token"
              value={`${eco.totalTokensSavedM.toFixed(2)} M`}
              sub={`≈ ${(eco.totalTokensSavedM * 1000).toFixed(0)} k`}
            />
            <TechCell
              label="折算 CO₂ 减排"
              value={`${eco.co2SavedKg.toFixed(1)} kg`}
              sub={`${(eco.co2SavedKg / 1000).toFixed(3)} t`}
            />
            <TechCell label="经济价值演示" value={fmtCny(eco.economyCny)} sub="电价 + Token" />
            <TechCell
              label="本星等效 PUE"
              value={eco.satEffectivePue.toFixed(2)}
              sub={`地面 ${eco.earthRefPue.toFixed(2)}`}
            />
            <TechCell label="综合能效倍率" value={`${eco.vsEarthRatio.toFixed(2)}×`} sub={`优 ${pctBetter}%`} />
          </div>

          <div className="grid grid-cols-1 gap-2 px-0 md:grid-cols-2 md:gap-2 md:px-1">
            <section className="relative rounded-2xl border border-zinc-800/80 bg-[#0a0a0c]/90 p-2 md:p-2.5">
              <CornerMarks />
              <h3 className="relative z-10 text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-500 md:text-[9px]">
                与地面对照
              </h3>
              <div className="relative z-10 mt-1 h-24 md:h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareRow} layout="vertical" margin={{ left: 2, right: 4, top: 2, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 9 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={88}
                      stroke="#52525b"
                      tick={{ fill: '#a1a1aa', fontSize: 9 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 9, color: '#a1a1aa' }} />
                    <Bar dataKey="本星" fill="#e4e4e7" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="地球参考" fill="#52525b" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="relative rounded-2xl border border-zinc-800/80 bg-[#0a0a0c]/90 p-2 md:p-2.5">
              <CornerMarks />
              <h3 className="relative z-10 text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-500 md:text-[9px]">
                趋势
              </h3>
              <div className="relative z-10 mt-1 h-24 md:h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ left: -20, right: 4, top: 2, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="窗口" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 9 }} />
                    <YAxis stroke="#52525b" tick={{ fill: '#71717a', fontSize: 9 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 9, color: '#a1a1aa' }} />
                    <Line type="monotone" dataKey="累计节电_kWh" stroke="#fafafa" dot={false} strokeWidth={1.2} />
                    <Line type="monotone" dataKey="累计省Token_M" stroke="#71717a" dot={false} strokeWidth={1.2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <p className="px-2 text-center text-[8px] text-zinc-600 md:px-3">演示数据 · 可对接真实电价与绿证</p>
        </footer>
      </div>
    </div>
  )
}
