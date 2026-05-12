import { LevitationBase } from './LevitationBase'
import { MagField } from './MagField'
import { SatelliteSculpture } from './SatelliteSculpture'

export function CTAFooter() {
  return (
    <>
      <section
        id="preorder"
        className="relative isolate overflow-hidden bg-[#0a0a0a] py-24 md:py-36 lg:py-44"
      >
        {/* 暖色辉光 */}
        <div
          className="pointer-events-none absolute left-1/2 top-[40%] h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-40 blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(255,140,80,0.35), transparent 65%)' }}
        />

        <div className="relative mx-auto flex max-w-[980px] flex-col items-center px-5 text-center md:px-8">
          {/* 居中卫星视觉 */}
          <div className="relative mx-auto h-[220px] w-full max-w-[420px] md:h-[280px] md:max-w-[480px]">
            <div className="anim-float absolute left-0 right-0 top-0 z-[3]">
              <SatelliteSculpture
                className="mx-auto block h-auto w-[55%]"
                showShadow={false}
                uid="cta-orb"
                intensity="bright"
              />
            </div>
            <div className="pointer-events-none absolute bottom-[24%] left-1/2 z-[2] w-[40%] -translate-x-1/2">
              <MagField className="block h-auto w-full" uid="cta-field" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-[1]">
              <LevitationBase className="mx-auto block h-auto w-[64%]" uid="cta-base" />
            </div>
          </div>

          <p className="mt-6 text-[14px] font-medium text-[#ffb47a] md:mt-8 md:text-[15px]">
            首批 200 台 · 现已开放预订
          </p>

          <h2 className="mt-3 text-[clamp(2.4rem,6.6vw,5.2rem)] font-semibold leading-[1.05] tracking-tight text-white md:mt-4">
            把太空带到
            <br />
            你的桌上。
          </h2>

          <p className="mx-auto mt-5 max-w-[36ch] text-[clamp(15px,1.6vw,19px)] leading-[1.5] text-[#a1a1a6] md:mt-6">
            首批 200 台 · 深圳手装 · 含定制底座、配套 App、终身固件升级。
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-7 md:mt-10">
            <a
              href="mailto:hello@orb.core"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#ffb47a] px-7 py-3 text-[15px] font-medium text-black transition hover:bg-[#ffd296] sm:w-auto"
            >
              预订磁悬星 · ¥ 2,888
            </a>
            <a
              href="#how"
              className="inline-flex items-center text-[15px] font-normal text-[#ffb47a] transition hover:text-[#ffd296]"
            >
              再看一遍它怎么浮 <span className="ml-1.5">›</span>
            </a>
          </div>

          <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[12px] text-[#86868b] md:mt-16 md:text-[13px]">
            <li>全球顺丰</li>
            <li className="text-[#3a3a3c]">·</li>
            <li>一年保修</li>
            <li className="text-[#3a3a3c]">·</li>
            <li>30 天无理由</li>
            <li className="text-[#3a3a3c]">·</li>
            <li>可定制刻字</li>
          </ul>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black py-8 md:py-10">
        <div className="mx-auto flex max-w-[1024px] flex-col items-center gap-3 px-5 text-center text-[12px] text-[#86868b] md:flex-row md:justify-between md:px-8">
          <p>© ORBCORE · Maglev Satellite Ornament · v1 · 2026</p>
          <p className="flex flex-wrap items-center justify-center gap-4">
            <a href="mailto:hello@orb.core" className="transition hover:text-white">
              联系
            </a>
            <a href="#specs" className="transition hover:text-white">
              规格
            </a>
            <a href="#preorder" className="transition hover:text-white">
              预订
            </a>
          </p>
        </div>
      </footer>
    </>
  )
}
