import { DATA_PIPELINE_STEPS } from '../data/satelliteDataCatalog'

/** 对应「用户面板 → 处理层 → 原始接入」的轻量提示，不占滚动区 */
export function DataPipelineStrip() {
  return (
    <div className="flex h-5 shrink-0 items-center gap-1 overflow-hidden border-b border-zinc-200 bg-white px-2 text-[6px] text-zinc-500 md:h-5 md:text-[7px]">
      <span className="shrink-0 font-semibold uppercase tracking-wider text-zinc-400">
        数据流
      </span>
      <span className="shrink-0 text-zinc-300">|</span>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap">
        {DATA_PIPELINE_STEPS.map((s, i) => (
          <span key={s.id} className="inline-flex items-center gap-1">
            {i > 0 ? <span className="text-zinc-300">→</span> : null}
            <span className="rounded-sm border border-zinc-200 bg-zinc-50 px-1 py-px text-zinc-600">
              {s.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
