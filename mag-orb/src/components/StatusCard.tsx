import { CornerMarks } from './CornerMarks'
import { PART_MAP, type PartId } from '../data/parts'
import { useLiveStatus } from '../hooks/useLiveStatus'

type Props = {
  selected: PartId | null
  hovered: PartId | null
  onClear: () => void
  powered: boolean
}

export function StatusCard({ selected, hovered, onClear, powered }: Props) {
  const detail = selected ? PART_MAP[selected] : hovered ? PART_MAP[hovered] : null
  const live = useLiveStatus(powered)

  const rows: { k: string; v: string; accent?: boolean }[] = [
    { k: '悬浮反馈', v: live.levitation, accent: powered },
    { k: '主控温度', v: `${live.mcuTempC.toFixed(1)} °C` },
    { k: '电池 SOC', v: `${live.batterySoc.toFixed(1)} %` },
    { k: '链路 LINK', v: live.link },
    { k: '红外触发', v: live.irState },
    { k: 'OLED 刷新', v: powered ? `${live.oledFps} fps` : '— fps' },
  ]

  return (
    <section className="relative flex h-full min-h-[320px] flex-col rounded-3xl border border-zinc-800/80 bg-[#0d0d10]">
      <CornerMarks />
      <header className="relative z-10 mb-4 flex items-start justify-between px-5 pb-2 pt-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {detail ? 'Part Detail' : 'Live Status'}
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-200">
            {detail ? '零件详情' : '实时状态摘要'}
          </p>
        </div>
        {detail && selected ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-zinc-700/80 px-3 py-1 text-[11px] text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
          >
            返回
          </button>
        ) : (
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              powered ? 'bg-[#ff4d33]/15 text-[#ff6b4d]' : 'bg-zinc-800/60 text-zinc-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${powered ? 'animate-pulse bg-[#ff4d33]' : 'bg-zinc-600'}`}
            />
            {powered ? 'LIVE' : 'OFF'}
          </span>
        )}
      </header>

      <div className="relative z-10 flex flex-1 flex-col gap-4 px-5 pb-5">
        {detail ? (
          <>
            <div className="flex items-baseline gap-3 border-b border-zinc-800/60 pb-3">
              <span
                className="font-mono text-xs tracking-[0.18em]"
                style={{ color: detail.accent }}
              >
                {detail.index}
              </span>
              <h3 className="text-base font-semibold text-white">{detail.name}</h3>
              <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {detail.sub}
              </span>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">{detail.blurb}</p>
            <p className="text-[13px] leading-relaxed text-zinc-300">{detail.detail}</p>
          </>
        ) : (
          <div className="space-y-3 rounded-2xl border border-zinc-800/60 bg-black/25 p-4">
            {rows.map((s) => (
              <div
                key={s.k}
                className="flex items-baseline justify-between border-b border-dashed border-zinc-800/60 pb-2 last:border-0 last:pb-0"
              >
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  {s.k}
                </span>
                <span
                  className={`font-mono text-sm tabular-nums ${
                    s.accent ? 'text-[#ff6b4d]' : powered ? 'text-zinc-200' : 'text-zinc-500'
                  }`}
                >
                  {s.v}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
