import { PARTS, type PartId } from '../data/parts'
import { CornerMarks } from './CornerMarks'

type Props = {
  selected: PartId | null
  hovered: PartId | null
  onSelect: (id: PartId | null) => void
  onHover: (id: PartId | null) => void
}

export function PartsListCard({ selected, hovered, onSelect, onHover }: Props) {
  return (
    <section className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#0d0d10]">
      <CornerMarks />
      <header className="relative z-10 flex items-start justify-between px-5 pb-2 pt-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Bill of Materials
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-200">
            零件清单 · 09 分系统
          </p>
        </div>
        {selected ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-full border border-zinc-700/80 px-3 py-1 text-[11px] text-zinc-400 transition hover:border-zinc-500 hover:text-white"
          >
            清空选择 ×
          </button>
        ) : (
          <span className="rounded-full bg-zinc-800/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
            点击高亮
          </span>
        )}
      </header>

      <div className="relative z-10 min-h-0 flex-1 overflow-hidden px-3 pb-3">
        <ul className="grid h-full grid-cols-1 gap-px overflow-y-auto rounded-2xl border border-zinc-800/60 bg-zinc-800/40 [scrollbar-width:thin]">
          {PARTS.map((p) => {
            const isSel = selected === p.id
            const isHi = isSel || hovered === p.id
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(isSel ? null : p.id)}
                  onMouseEnter={() => onHover(p.id)}
                  onMouseLeave={() => onHover(null)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    isSel
                      ? 'bg-[#ff4d33]/8'
                      : isHi
                        ? 'bg-[#16161a]'
                        : 'bg-[#0a0a0c] hover:bg-[#101014]'
                  }`}
                >
                  <span
                    className={`h-9 w-0.5 shrink-0 rounded-full transition ${
                      isSel ? 'bg-[#ff4d33]' : isHi ? 'bg-zinc-400' : 'bg-zinc-700'
                    }`}
                  />
                  <span
                    className={`font-mono text-[11px] tracking-[0.18em] ${
                      isHi ? 'text-white' : 'text-zinc-500'
                    }`}
                  >
                    {p.index}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-[13px] font-medium ${
                          isHi ? 'text-white' : 'text-zinc-300'
                        }`}
                      >
                        {p.name}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                        {p.sub}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">{p.blurb}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
