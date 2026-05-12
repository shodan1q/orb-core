import { useState } from 'react'
import { LiveFeed, ScanlineOverlay } from '../components/LiveFeed'

type Camera = {
  iso: number
  shutter: number
  aperture: string
  resolution: string
}

type Props = { camera: Camera }

const STILLS = [
  'https://images.unsplash.com/photo-1454789548928-aef25e66a1e2?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&q=80&auto=format&fit=crop',
]

function StillStripImg({ src, seed }: { src: string; seed: string }) {
  const [active, setActive] = useState(src)
  return (
    <img
      src={active}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer-when-downgrade"
      onError={() => setActive(`https://picsum.photos/seed/${seed}/800/360`)}
      className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100 group-hover:scale-[1.02]"
    />
  )
}

export function MediaPage({ camera }: Props) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#0a0a0c]">
      <header className="shrink-0 border-b border-zinc-800/80 bg-[#0d0d10] px-4 py-3 md:px-6 md:py-3.5">
        <h2 className="text-sm font-semibold text-white">太空相机</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          条带视频与实时图传上下编排；参数与总览页图传一致，模拟在轨光学载荷下行。
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <section className="shrink-0 border-b border-zinc-800/80 bg-[#0d0d10] px-3 py-2.5 md:px-4 md:py-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 md:text-xs">
            条带视频 · Movie.mp4
          </h3>
          <div className="relative mt-2 aspect-video max-h-[min(38dvh,320px)] w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 md:max-h-[min(42dvh,380px)]">
            <video
              src="/Movie.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="absolute inset-0 z-0 h-full w-full object-cover"
            />
            <ScanlineOverlay />
            <span className="pointer-events-none absolute bottom-2 left-2 z-[2] rounded-md bg-black/60 px-2 py-0.5 font-mono text-[10px] text-zinc-200">
              循环 · 扫描线叠层与图传一致
            </span>
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col">
          <LiveFeed camera={camera} fillLayout hideTagline />
        </section>

        <section className="shrink-0 border-t border-zinc-800/80 bg-[#0d0d10] py-3 pl-5 pr-5 sm:pl-6 sm:pr-6 md:py-4 md:pl-8 md:pr-8">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">静帧归档</h3>
          <div className="mt-2 grid grid-cols-3 gap-1.5 min-[480px]:gap-2">
            {STILLS.map((src, i) => (
              <button
                key={src}
                type="button"
                className="group relative h-[5.25rem] min-h-0 min-w-0 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-900 text-left focus:outline-none focus:ring-2 focus:ring-[#ff4d33]/50 sm:h-24 sm:rounded-xl md:h-[6.75rem] lg:h-[7.25rem]"
              >
                <StillStripImg src={src} seed={`media-still-${i}`} />
                <span className="pointer-events-none absolute bottom-1 left-1 rounded px-1 py-px font-mono text-[8px] text-zinc-200 sm:bottom-2 sm:left-2 sm:px-2 sm:py-0.5 sm:text-[10px]">
                  条带 #{i + 1} · 缩略
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 border-t border-zinc-800/70 pt-3 text-center">
            <p className="text-xs text-zinc-500">视频回放队列 · H.265 录制片段（示意）</p>
            <p className="mt-2 font-mono text-[11px] text-zinc-400">
              下一段窗口 T+00:12:40 可播 · 码率与总览图传一致
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
