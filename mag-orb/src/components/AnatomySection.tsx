import { useEffect, useRef, useState } from 'react'
import {
  ExplodedSatellite,
  PART_INFO,
  PART_ORDER,
  type PartId,
} from './ExplodedSatellite'

export function AnatomySection() {
  const [explode, setExplode] = useState(0.0)
  const [hovered, setHovered] = useState<PartId | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [autoplayed, setAutoplayed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el || autoplayed) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.25) {
            setAutoplayed(true)
            playOnce()
            break
          }
        }
      },
      { threshold: [0, 0.25, 0.5] },
    )
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplayed])

  const playOnce = () => {
    setIsPlaying(true)
    setExplode(0)
    setTimeout(() => setExplode(1), 600)
    setTimeout(() => setIsPlaying(false), 2400)
  }

  return (
    <section
      ref={sectionRef}
      id="anatomy"
      className="relative overflow-hidden bg-black py-24 md:py-36 lg:py-44"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-[40%] h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-40 blur-[140px]"
        style={{ background: 'radial-gradient(circle, rgba(255,180,120,0.2), transparent 65%)' }}
      />

      <div className="relative mx-auto max-w-[1180px] px-5 md:px-8">
        {/* 居中标题 */}
        <div className="text-center">
          <p className="text-[14px] font-medium text-[#ffb47a] md:text-[15px]">10 个分系统</p>
          <h2 className="mt-3 text-[clamp(2rem,5.4vw,4rem)] font-semibold leading-[1.07] tracking-tight text-white md:mt-4">
            拆开看一眼。
          </h2>
          <p className="mx-auto mt-5 max-w-[42ch] text-[clamp(15px,1.6vw,19px)] leading-[1.5] text-[#a1a1a6] md:mt-6">
            10 个分系统沿中轴层层堆叠 —— 拖动滑块或点击右侧任意一层，看每一层做了什么。
          </p>
        </div>

        {/* 主体：左拆解图 + 右部件清单，无边框 */}
        <div className="mt-14 grid grid-cols-1 gap-12 md:mt-20 lg:grid-cols-12 lg:gap-16">
          {/* 左：拆解图 */}
          <div className="relative lg:col-span-7">
            <div className="relative mx-auto aspect-[2/3] w-full max-w-[460px] sm:max-w-[500px]">
              <ExplodedSatellite
                className="absolute inset-0 h-full w-full"
                uid="anatomy-orb"
                explode={explode}
                hovered={hovered}
                onHover={setHovered}
              />
            </div>

            {/* 极简控制条 */}
            <div className="mx-auto mt-6 max-w-[440px]">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#86868b]">组装</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={explode * 100}
                  onChange={(e) => setExplode(Number(e.target.value) / 100)}
                  className="apple-slider h-1 flex-1 cursor-pointer appearance-none rounded-full outline-none"
                  style={{
                    background: `linear-gradient(to right, #ffb47a 0%, #ffb47a ${explode * 100}%, #1a1a1c ${explode * 100}%, #1a1a1c 100%)`,
                  }}
                  aria-label="拆解程度"
                />
                <span className="text-[11px] text-[#86868b]">拆开</span>
                <span className="w-10 shrink-0 text-right text-[11px] font-medium tabular-nums text-[#ffb47a]">
                  {(explode * 100).toFixed(0)}%
                </span>
              </div>
              <div className="mt-4 flex justify-center gap-4 text-[13px]">
                <button
                  type="button"
                  onClick={() => setExplode(0)}
                  className="text-[#a1a1a6] transition hover:text-white"
                >
                  组装
                </button>
                <span className="text-[#3a3a3c]">·</span>
                <button
                  type="button"
                  onClick={playOnce}
                  disabled={isPlaying}
                  className="text-[#ffb47a] transition hover:text-[#ffd296] disabled:opacity-40"
                >
                  ↻ 重放
                </button>
                <span className="text-[#3a3a3c]">·</span>
                <button
                  type="button"
                  onClick={() => setExplode(1)}
                  className="text-[#a1a1a6] transition hover:text-white"
                >
                  完全拆开
                </button>
              </div>
            </div>
          </div>

          {/* 右：部件清单（行内展开） */}
          <ul className="lg:col-span-5">
            {PART_ORDER.map((id) => {
              const info = PART_INFO[id]
              const active = hovered === id
              return (
                <li key={id} className="border-b border-white/[0.08] last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setHovered(active ? null : id)}
                    onMouseEnter={() => setHovered(id)}
                    onMouseLeave={() => setHovered(null)}
                    className="group flex w-full items-baseline gap-4 py-4 text-left transition md:py-5"
                  >
                    <span
                      className={`w-7 shrink-0 text-[12px] tabular-nums transition ${
                        active ? 'text-[#ffb47a]' : 'text-[#86868b]'
                      }`}
                    >
                      {info.num}
                    </span>
                    <span
                      className={`flex-1 text-[15px] font-medium transition md:text-[16px] ${
                        active ? 'text-white' : 'text-[#d2d2d7] group-hover:text-white'
                      }`}
                    >
                      {info.name}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-[#86868b]">
                      {info.weight}
                    </span>
                  </button>
                  <div
                    className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="min-h-0">
                      <div className="pb-5 pl-11 pr-2">
                        <p className="text-[12px] tabular-nums text-[#86868b]">{info.spec}</p>
                        <p className="mt-2 text-[14px] leading-[1.55] text-[#d2d2d7]">{info.role}</p>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <p className="mt-16 text-center text-[12px] text-[#86868b] md:mt-20 md:text-[13px]">
          总重 ≤ 130 g · 直径 100 mm · 装配公差 ±0.2 mm · 含 30 g 配重铁砂可现场调平
        </p>
      </div>
    </section>
  )
}
