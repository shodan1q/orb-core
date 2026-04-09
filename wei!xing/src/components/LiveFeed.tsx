import { CornerMarks } from './CornerMarks'

/** 与大图图传相同的水平扫描线叠层（CRT / 推扫示意） */
export function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)',
      }}
    />
  )
}

type Camera = {
  iso: number
  shutter: number
  aperture: string
  resolution: string
}

type Props = {
  camera: Camera
  /** 嵌入整页分栏：去外框圆角与外边距，撑满父级高度 */
  fillLayout?: boolean
  /** 隐藏「高分辨率图传 · 专业相机参数」副标题 */
  hideTagline?: boolean
}

export function LiveFeed({ camera, fillLayout, hideTagline }: Props) {
  return (
    <section
      className={`relative flex h-full min-h-[320px] flex-col overflow-hidden bg-[#0d0d10] ${
        fillLayout
          ? 'min-h-0 rounded-none border-0'
          : 'rounded-3xl border border-zinc-800/80'
      }`}
    >
      <CornerMarks />
      <header
        className={`relative z-10 flex items-start justify-between pb-2 pt-4 ${fillLayout ? 'px-4 md:px-5' : 'px-5'}`}
      >
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            实时影像回传
          </h2>
          {hideTagline ? null : (
            <p className="mt-1 text-sm font-medium text-zinc-200">高分辨率图传 · 专业相机参数</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-[#ff4d33]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#ff6b4d]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff4d33]" />
            REC
          </span>
        </div>
      </header>

      <div
        className={`relative flex min-h-0 flex-1 ${fillLayout ? 'mx-0 mb-0 px-3 pb-3 pt-0 md:px-4 md:pb-4' : 'mx-3 mb-3'}`}
      >
        <div
          className={`relative w-full overflow-hidden border border-zinc-800/60 bg-zinc-950 ${
            fillLayout ? 'rounded-xl md:rounded-2xl' : 'rounded-2xl'
          }`}
          style={{
            backgroundImage:
              'linear-gradient(160deg, rgba(10,12,18,0.55) 0%, rgba(5,6,10,0.75) 100%), url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <ScanlineOverlay />

          <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] leading-relaxed text-zinc-200/90">
            <div>ISO {camera.iso}</div>
            <div>1/{camera.shutter}</div>
            <div>{camera.aperture}</div>
          </div>
          <div className="pointer-events-none absolute right-4 top-4 text-right font-mono text-[10px] text-zinc-200/90">
            <div>{camera.resolution}</div>
            <div className="mt-1 text-zinc-500">H.265 · 60fps</div>
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[10px] text-zinc-400">
            T+ 02:14:08 · 下行 842 Mbps
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 font-mono text-[10px] text-zinc-500">
            曝光补偿 +0.3 EV
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-8 w-8 rounded-full border border-white/20" />
            <div className="absolute left-1/2 top-1/2 h-px w-12 -translate-x-1/2 -translate-y-1/2 bg-white/15" />
            <div className="absolute left-1/2 top-1/2 h-12 w-px -translate-x-1/2 -translate-y-1/2 bg-white/15" />
          </div>
        </div>
      </div>
    </section>
  )
}
