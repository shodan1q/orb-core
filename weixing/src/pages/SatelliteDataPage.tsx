import { TelemetryHealthGrid } from '../components/TelemetryHealthGrid'
import type { SatelliteHealthSnapshot } from '../hooks/useSimulatedTelemetry'

type Props = { health: SatelliteHealthSnapshot }

export function SatelliteDataPage({ health }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pt-5">
      <div className="shrink-0 rounded-2xl border border-zinc-800/80 bg-[#0d0d10]/80 px-4 py-3 md:px-5">
        <h2 className="text-sm font-semibold text-white">卫星数据</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          热控、EPS、ADCS、测控、轨道、载荷与科学遥测分卡展示；数据为模拟流，可对接真实 TM。
        </p>
      </div>
      <div className="mt-auto min-h-0 w-full min-w-0">
        <TelemetryHealthGrid health={health} />
      </div>
    </div>
  )
}
