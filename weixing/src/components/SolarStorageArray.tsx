import type { SatelliteHealthSnapshot } from '../hooks/useSimulatedTelemetry'

export function SolarStorageArray({
  health,
  tick,
  compact,
}: {
  health: SatelliteHealthSnapshot
  tick: number
  compact?: boolean
}) {
  const solarW = health.eps.solarI * health.eps.solarV
  const solarNorm = Math.min(1, solarW / 3200)
  const charging = health.eps.battI >= 0
  const panelCols = 8
  const panelRows = 2
  const panelN = panelCols * panelRows
  const battCols = 6
  const battRows = 4
  const battN = battCols * battRows
  const filledBatt = Math.round((health.eps.soc / 100) * battN)

  return (
    <div className={compact ? 'space-y-1' : 'space-y-3'}>
      <div className="flex items-end justify-between gap-1.5">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">太阳翼发电</p>
          <p
            className={`mt-0.5 font-mono tabular-nums text-zinc-300 ${compact ? 'truncate text-[9px]' : 'text-[11px]'}`}
          >
            {solarW.toFixed(0)} W · {health.eps.solarI.toFixed(2)} A × {health.eps.solarV.toFixed(1)} V
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md border px-1 py-0.5 font-medium tabular-nums ${
            compact ? 'text-[8px]' : 'px-1.5 py-0.5 text-[9px]'
          } ${
            charging
              ? 'border-zinc-600 bg-zinc-800/80 text-zinc-200'
              : 'border-zinc-700 bg-zinc-900/60 text-zinc-500'
          }`}
        >
          {charging ? '充' : '放'} {charging ? '+' : ''}
          {health.eps.battI.toFixed(1)} A
        </span>
      </div>

      <div
        className={`rounded-md border border-zinc-800/90 bg-zinc-950/50 ${compact ? 'p-1' : 'p-1.5'}`}
        title="太阳翼单元示意：亮度随辐照与模拟波动变化"
      >
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: `repeat(${panelCols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: panelN }, (_, i) => {
            const phase = tick * 0.07 + i * 0.42
            const flicker = 0.35 + 0.65 * solarNorm * (0.55 + 0.45 * Math.sin(phase))
            const tone = Math.round(50 + flicker * 205)
            return (
              <div
                key={`p-${i}`}
                className={`aspect-[2.2/1] rounded-[1px] border border-zinc-800/80 ${compact ? 'min-h-[6px]' : 'min-h-[14px] rounded-[2px]'}`}
                style={{
                  backgroundColor: `rgb(${tone} ${tone} ${tone})`,
                  opacity: 0.35 + flicker * 0.65,
                }}
              />
            )
          })}
        </div>
        {!compact ? (
          <div className="mt-1 flex justify-between text-[8px] text-zinc-600">
            <span>+Y / −Y 翼面示意</span>
            <span>母线 {health.eps.battV.toFixed(2)} V</span>
          </div>
        ) : (
          <div className="mt-0.5 text-[7px] text-zinc-600">母线 {health.eps.battV.toFixed(2)} V</div>
        )}
      </div>

      <div
        className={`flex items-end justify-between gap-1.5 border-t border-zinc-800/80 ${compact ? 'pt-1' : 'pt-3'}`}
      >
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">蓄电池 SOC</p>
          <p
            className={`mt-0.5 font-mono font-semibold tabular-nums text-zinc-100 ${compact ? 'text-sm' : 'text-lg'}`}
          >
            {health.eps.soc.toFixed(1)}
            <span className={compact ? 'text-xs text-zinc-500' : 'text-sm text-zinc-500'}>%</span>
          </p>
        </div>
        <p className={`text-right leading-snug text-zinc-600 ${compact ? 'text-[7px]' : 'text-[9px]'}`}>
          平衡 {health.epsBalancePct.toFixed(0)}% · {health.eps.battT.toFixed(0)}°C
        </p>
      </div>

      <div
        className={`rounded-md border border-zinc-800/90 bg-zinc-950/50 ${compact ? 'p-1' : 'p-1.5'}`}
        title="储能模组：已充格数与 SOC 对应"
      >
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: `repeat(${battCols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: battN }, (_, i) => {
            const on = i < filledBatt
            const ripple = 0.85 + 0.15 * Math.sin(tick * 0.06 + i * 0.35)
            return (
              <div
                key={`b-${i}`}
                className={`aspect-square rounded-[1px] border transition-colors duration-300 ${
                  compact ? 'min-h-[5px]' : 'min-h-[10px] rounded-[2px]'
                } ${
                  on
                    ? 'border-zinc-500/60 bg-gradient-to-br from-zinc-200/90 to-zinc-400/70'
                    : 'border-zinc-800 bg-zinc-900/80'
                }`}
                style={on ? { opacity: ripple } : undefined}
              />
            )
          })}
        </div>
        {!compact ? (
          <p className="mt-1 text-[8px] text-zinc-600">
            共 {battN} 节示意格 · 已储能 {filledBatt} 格 · 约 {Math.round(health.eps.soc * 0.18)} min 等效续航（演示）
          </p>
        ) : (
          <p className="mt-0.5 text-[7px] text-zinc-600">
            {filledBatt}/{battN} 格 · ~{Math.round(health.eps.soc * 0.18)} min
          </p>
        )}
      </div>
    </div>
  )
}
