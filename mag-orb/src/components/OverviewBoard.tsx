import { useState, useRef, useEffect, useCallback } from 'react'
import { DisassemblyCard } from './DisassemblyCard'
import { PartsListCard } from './PartsListCard'
import { StatusCard } from './StatusCard'
import type { PartId } from '../data/parts'
import type { AnimationFlags } from './Satellite3D'

type Props = {
  selected: PartId | null
  hovered: PartId | null
  explode: number
  onSelect: (id: PartId | null) => void
  onHover: (id: PartId | null) => void
  onExplode: (v: number) => void
  flags: AnimationFlags
  powered: boolean
}

/** 监听断点（仅 lg+ 开启拖动） */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(query)
    const handler = () => setMatches(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

/**
 * 三栏：3D 拆解 | 零件清单 | 状态卡。中间分隔条可拖拽改变左右宽度。
 * - lg+：flex-row，左:中 比例可调（2.5..7 fr），右栏（状态）固定 3 fr
 * - lg 以下：flex-col 自然堆叠，拖拽不显示
 */
export function OverviewBoard({
  selected,
  hovered,
  explode,
  onSelect,
  onHover,
  onExplode,
  flags,
  powered,
}: Props) {
  const isLg = useMediaQuery('(min-width: 1024px)')
  const containerRef = useRef<HTMLDivElement>(null)
  // 左:中 的相对宽度比例（默认 5:4，对应原 grid-cols-12 中的 5/4）
  const [leftFr, setLeftFr] = useState(5)

  const startResize = useCallback(
    (startEvt: React.MouseEvent<HTMLButtonElement>) => {
      if (!isLg || !containerRef.current) return
      startEvt.preventDefault()

      const move = (mv: MouseEvent) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        // 右栏状态卡占 3/12 ≈ 25%；左+中占 75%
        const splitAreaWidth = rect.width * (9 / 12)
        const cursorInSplit = Math.max(
          0,
          Math.min(splitAreaWidth, mv.clientX - rect.left),
        )
        const ratio = cursorInSplit / splitAreaWidth // 0..1
        let newLeft = ratio * 9
        newLeft = Math.max(2.5, Math.min(7, newLeft))
        newLeft = Math.round(newLeft * 10) / 10
        setLeftFr(newLeft)
      }
      const up = () => {
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [isLg],
  )

  // 移动端不设 flex（让卡片按 min-height 自然堆叠）；桌面端用 flex-grow 分比例
  const flexStyle = (grow: number) =>
    isLg ? { flexGrow: grow, flexShrink: 1, flexBasis: 0 as const } : {}

  return (
    <div
      ref={containerRef}
      className="relative z-[1] flex flex-col gap-5 pt-5 md:pt-7 lg:flex-row lg:items-stretch"
    >
      <div className="min-w-0 lg:min-h-[420px]" style={flexStyle(leftFr)}>
        <DisassemblyCard
          selected={selected}
          hovered={hovered}
          explode={explode}
          onSelect={onSelect}
          onHover={onHover}
          onExplode={onExplode}
          flags={flags}
        />
      </div>

      {/* 可拖动分隔条（仅 lg+ 显示） */}
      <button
        type="button"
        onMouseDown={startResize}
        aria-label="拖动调整 3D 与零件清单宽度"
        title="拖动调整左右宽度"
        className="group hidden lg:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center self-stretch rounded-full bg-transparent transition-colors hover:bg-zinc-700/40 active:bg-[#ff4d33]/40"
      >
        <span className="h-16 w-0.5 rounded-full bg-zinc-700/80 transition-all group-hover:h-24 group-hover:bg-zinc-500 group-active:bg-[#ff4d33]" />
      </button>

      <div className="min-w-0 lg:min-h-[420px]" style={flexStyle(9 - leftFr)}>
        <PartsListCard
          selected={selected}
          hovered={hovered}
          onSelect={onSelect}
          onHover={onHover}
        />
      </div>

      <div className="min-w-0 lg:min-h-[420px]" style={flexStyle(3)}>
        <StatusCard
          selected={selected}
          hovered={hovered}
          onClear={() => onSelect(null)}
          powered={powered}
        />
      </div>
    </div>
  )
}
