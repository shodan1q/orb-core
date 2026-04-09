import type { SatelliteHealthSnapshot } from '../hooks/useSimulatedTelemetry'
import { CornerMarks } from './CornerMarks'

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M7 17L17 7M17 7H9M17 7V15" />
    </svg>
  )
}

function SunoCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`relative min-h-0 bg-white p-2.5 md:p-3 ${className}`}>
      <CornerMarks className="!text-zinc-300" />
      <div className="relative z-10 flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-900 md:text-[11px]">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 text-[9px] leading-relaxed text-zinc-500 md:text-[10px]">
              {subtitle}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="shrink-0 text-zinc-400 transition hover:text-zinc-800"
          aria-label="展开详情"
        >
          <ExpandIcon />
        </button>
      </div>
      <div className="relative z-10 mt-2">{children}</div>
    </div>
  )
}

/** 半圆仪表：细刻度感 + 粗弧 + 指针（示意） */
function SemiGauge({
  valuePct,
  label,
  sub,
}: {
  valuePct: number
  label: string
  sub?: string
}) {
  const v = Math.max(0, Math.min(100, valuePct))
  const needleDeg = -180 + (v / 100) * 180
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[72px] w-[140px] md:h-[84px] md:w-[160px]">
        <svg className="h-full w-full" viewBox="0 0 160 88" fill="none" aria-hidden>
          <path
            d="M 16 72 A 64 64 0 0 1 144 72"
            stroke="#e4e4e7"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const ang = Math.PI * (1 - t)
            const x1 = 80 + 56 * Math.cos(ang)
            const y1 = 72 - 56 * Math.sin(ang)
            const x2 = 80 + 62 * Math.cos(ang)
            const y2 = 72 - 62 * Math.sin(ang)
            return (
              <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d4d4d8" strokeWidth="1" />
            )
          })}
          <path
            d="M 16 72 A 64 64 0 0 1 144 72"
            stroke="#171717"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(v / 100) * 201} 201`}
          />
        </svg>
        <div
          className="absolute bottom-[10px] left-1/2 h-[46px] w-[1.5px] origin-bottom bg-zinc-900"
          style={{ transform: `translateX(-50%) rotate(${needleDeg}deg)` }}
        />
        <div className="absolute bottom-[6px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-zinc-900 bg-white" />
      </div>
      <div className="-mt-1 text-center">
        <div className="text-[15px] font-semibold tabular-nums text-zinc-900 md:text-lg">
          {v.toFixed(0)}%
        </div>
        <div className="text-[9px] text-zinc-500">{label}</div>
        {sub ? <div className="text-[9px] text-zinc-400">{sub}</div> : null}
      </div>
    </div>
  )
}

function PillBar({ pct, label }: { pct: number; label: string }) {
  const p = Math.max(0, Math.min(100, pct))
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[9px] text-zinc-500">
        <span>{label}</span>
        <span className="font-mono tabular-nums text-zinc-800">{p.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
        <div className="h-full rounded-full bg-zinc-900" style={{ width: `${p}%` }} />
      </div>
    </div>
  )
}

function ThinBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex h-14 items-end justify-between gap-px px-0.5 md:h-16">
      {values.map((h, i) => (
        <div
          key={i}
          className="min-w-0 flex-1 bg-zinc-900"
          style={{ height: `${Math.max(8, (h / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

type Props = { health: SatelliteHealthSnapshot }

export function TelemetryHealthGrid({ health }: Props) {
  const rpmBars = health.wheels.map((w) =>
    Math.min(100, (Math.abs(w.rpm) / 7200) * 100),
  )
  const adcsSpark = Array.from({ length: 18 }, (_, i) => 0.35 + 0.65 * Math.sin(i * 0.5 + health.wheels[0].rpm * 0.001))

  return (
    <section className="border-t border-zinc-200 bg-[#f0f0f0]">
      <div className="mx-auto max-w-[1600px] px-1 pb-2 pt-1 md:px-1.5">
        <p className="px-1.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500 md:text-[10px]">
          卫星健康遥测 · 热控 / EPS / ADCS / 测控 / 轨道 / 载荷
        </p>

        <div className="grid grid-cols-12 gap-px border border-zinc-300 bg-zinc-300">
          <SunoCard
            title="温度遥测"
            subtitle="星上多点温度 · 监控热控与散热裕度"
            className="col-span-12 sm:col-span-6 lg:col-span-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
              <SemiGauge
                valuePct={health.thermalMarginPct}
                label="热控裕度（示意）"
                sub={`最高 ${Math.max(...health.temps.map((t) => t.c)).toFixed(1)} °C`}
              />
              <ul className="min-w-0 flex-1 space-y-1 border-t border-zinc-100 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                {health.temps.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-baseline justify-between gap-2 text-[10px] leading-tight"
                  >
                    <span className="truncate text-zinc-500">{t.label}</span>
                    <span className="shrink-0 font-mono tabular-nums text-zinc-900">
                      {t.c.toFixed(1)} °C
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </SunoCard>

          <SunoCard
            title="电源系统 EPS"
            subtitle="太阳翼 · 蓄电池组 · 母线（示意值）"
            className="col-span-12 sm:col-span-6 lg:col-span-3"
          >
            <PillBar pct={health.eps.soc} label="蓄电池 SOC" />
            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] md:grid-cols-2">
              <div className="text-zinc-500">
                太阳翼电流
                <div className="font-mono text-[11px] text-zinc-900">
                  {health.eps.solarI.toFixed(2)} A
                </div>
              </div>
              <div className="text-zinc-500">
                太阳翼电压
                <div className="font-mono text-[11px] text-zinc-900">
                  {health.eps.solarV.toFixed(1)} V
                </div>
              </div>
              <div className="text-zinc-500">
                太阳翼温度
                <div className="font-mono text-[11px] text-zinc-900">
                  {health.eps.solarT.toFixed(1)} °C
                </div>
              </div>
              <div className="text-zinc-500">
                电池电压 / 电流
                <div className="font-mono text-[11px] text-zinc-900">
                  {health.eps.battV.toFixed(2)} V · {health.eps.battI.toFixed(2)} A
                </div>
              </div>
              <div className="col-span-2 text-zinc-500">
                电池温度
                <div className="font-mono text-[11px] text-zinc-900">
                  {health.eps.battT.toFixed(1)} °C
                </div>
              </div>
            </div>
            <div className="mt-2 border-t border-zinc-100 pt-2">
              <SemiGauge
                valuePct={health.epsBalancePct}
                label="发用电平衡（示意）"
                sub="阵列输出 vs 载荷+充电"
              />
            </div>
          </SunoCard>

          <SunoCard
            title="姿态 ADCS"
            subtitle="陀螺 · 星敏 · 太敏 · 飞轮 · 推力器"
            className="col-span-12 sm:col-span-6 lg:col-span-3"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-[9px] font-medium text-zinc-500">飞轮转速趋势</p>
                <ThinBars values={rpmBars} />
                <ul className="mt-1 space-y-0.5 font-mono text-[9px] tabular-nums text-zinc-800">
                  {health.wheels.map((w) => (
                    <li key={w.id} className="flex justify-between gap-1">
                      <span className="text-zinc-500">{w.id}</span>
                      <span>{w.rpm} rpm</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-[9px] font-medium text-zinc-500">敏感器 / 推力器</p>
                <div className="space-y-1 text-[9px] leading-snug text-zinc-600">
                  <div>
                    陀螺偏置 (°/h){' '}
                    <span className="font-mono text-zinc-900">
                      {health.gyroBias.map((g) => g.toFixed(3)).join(' · ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`rounded border px-1.5 py-px font-mono text-[8px] ${
                        health.starValid
                          ? 'border-zinc-300 bg-zinc-50 text-zinc-800'
                          : 'border-zinc-200 text-zinc-400'
                      }`}
                    >
                      星敏 {health.starValid ? 'OK' : '—'}
                    </span>
                    <span
                      className={`rounded border px-1.5 py-px font-mono text-[8px] ${
                        health.sunValid
                          ? 'border-zinc-300 bg-zinc-50 text-zinc-800'
                          : 'border-zinc-200 text-zinc-400'
                      }`}
                    >
                      太敏 {health.sunValid ? 'OK' : '—'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {health.thrusters.map((j) => (
                      <span
                        key={j.id}
                        className={`rounded-sm border px-1 py-px font-mono text-[8px] ${
                          j.on
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 bg-white text-zinc-500'
                        }`}
                      >
                        {j.id}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-1.5 text-[8px] leading-relaxed text-zinc-400">
                  地面通过本页快速扫视「体检」：异常趋势与单机状态。
                </p>
              </div>
            </div>
            <div className="mt-2">
              <p className="mb-0.5 text-[9px] text-zinc-500">控制残差（示意波形）</p>
              <ThinBars values={adcsSpark} />
            </div>
          </SunoCard>

          <SunoCard
            title="通信与测控"
            subtitle="TM 下行 · TC 上行 · 测距 / 多普勒"
            className="col-span-12 sm:col-span-6 lg:col-span-3"
          >
            <ul className="space-y-1.5 text-[10px] leading-snug text-zinc-700">
              <li className="flex justify-between gap-2 border-b border-zinc-100 pb-1">
                <span className="text-zinc-500">遥测 TM</span>
                <span className="text-right font-mono text-zinc-900">
                  {health.comm.tmBps.toLocaleString()} bps
                  <span className="block text-[9px] font-normal text-zinc-400">
                    CRC OK {health.comm.tmCrcOk.toFixed(3)}%
                  </span>
                </span>
              </li>
              <li className="flex justify-between gap-2 border-b border-zinc-100 pb-1">
                <span className="text-zinc-500">遥控 TC 队列</span>
                <span className="font-mono text-zinc-900">{health.comm.tcPending} 条待确认</span>
              </li>
              <li className="flex justify-between gap-2 border-b border-zinc-100 pb-1">
                <span className="text-zinc-500">测距 σ</span>
                <span className="font-mono text-zinc-900">{health.comm.rangeSigmaM.toFixed(2)} m</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">多普勒</span>
                <span className="font-mono text-zinc-900">{health.comm.dopplerHz.toFixed(1)} Hz</span>
              </li>
            </ul>
            <p className="mt-2 text-[9px] leading-relaxed text-zinc-400">
              构成天地之间神经中枢：下行报告状态，上行下达动作；测距与多普勒为定轨原始量。
            </p>
          </SunoCard>

          <SunoCard
            title="导航与轨道"
            subtitle="星历 · TLE · 轨道状态向量 OSV"
            className="col-span-12 md:col-span-6 lg:col-span-4"
          >
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <SemiGauge
                  valuePct={Math.max(15, 100 - health.nav.tleAgeH * 18)}
                  label="星历新鲜度（示意）"
                  sub={`TLE 龄期 ${health.nav.tleAgeH.toFixed(2)} h`}
                />
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="text-zinc-500">星历 UTC</div>
                <div className="break-all font-mono text-[9px] text-zinc-900">{health.nav.ephUtc}</div>
                <div className="pt-1 text-zinc-500">OSV |r| / |v|</div>
                <div className="font-mono tabular-nums text-zinc-900">
                  {health.nav.osvR.toFixed(0)} m · {health.nav.osvV.toFixed(2)} m/s
                </div>
                <div className="rounded border border-dashed border-zinc-200 bg-zinc-50 p-1.5 font-mono text-[8px] leading-relaxed text-zinc-600">
                  TLE 1 25544U 98067A 26098.51234567 .00001234 00000-0 12345-4 0 9999
                </div>
              </div>
            </div>
          </SunoCard>

          <SunoCard
            title="任务应用 · 载荷"
            subtitle="光学 / SAR / 红外（示意）"
            className="col-span-12 md:col-span-6 lg:col-span-4"
          >
            <ul className="space-y-1.5 text-[10px] text-zinc-700">
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">光学下行</span>
                <span className="font-mono text-zinc-900">{health.mission.opticalMbps.toFixed(0)} Mbps</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">SAR</span>
                <span className="text-right text-zinc-900">{health.mission.sarMode}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-zinc-500">红外亮温窗</span>
                <span className="font-mono text-zinc-900">{health.mission.irWindowK.toFixed(1)} K</span>
              </li>
            </ul>
            <p className="mt-2 text-[9px] leading-relaxed text-zinc-400">
              交付型数据：农业、灾害、城市规划等应用场景的原始与产品链指标摘要。
            </p>
          </SunoCard>

          <SunoCard
            title="科学探测"
            subtitle="磁场 · 粒子 · 等离子体（示意）"
            className="col-span-12 md:col-span-12 lg:col-span-4"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <ul className="space-y-1 text-[10px] text-zinc-700">
                <li className="flex justify-between gap-2">
                  <span className="text-zinc-500">磁场 |B|</span>
                  <span className="font-mono text-zinc-900">{health.science.bFieldNt.toFixed(1)} nT</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-zinc-500">粒子通量</span>
                  <span className="font-mono text-zinc-900">{health.science.fluxPart.toFixed(0)} / cm²·s</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-zinc-500">电子密度 Ne</span>
                  <span className="font-mono text-[9px] text-zinc-900">
                    {(health.science.neCm3 / 1e4).toFixed(1)}×10⁴ cm⁻³
                  </span>
                </li>
              </ul>
              <div>
                <p className="mb-0.5 text-[9px] text-zinc-500">环境噪声趋势</p>
                <ThinBars
                  values={Array.from({ length: 16 }, (_, i) => 0.2 + Math.sin(i * 0.4) * 0.15 + health.science.bFieldNt * 0.002)}
                />
              </div>
            </div>
          </SunoCard>
        </div>
      </div>
    </section>
  )
}
