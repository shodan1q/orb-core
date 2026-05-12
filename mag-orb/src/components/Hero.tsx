import { SatelliteSculpture } from './SatelliteSculpture'
import { LevitationBase } from './LevitationBase'
import { MagField } from './MagField'
import { StarField } from './StarField'

export function Hero() {
  return (
    <section
      id="hero"
      className="relative isolate overflow-hidden bg-black pt-12 md:pt-20"
    >
      {/* 星空 */}
      <StarField className="pointer-events-none absolute inset-0 h-full w-full opacity-50" />

      {/* 居中辉光 */}
      <div
        className="pointer-events-none absolute left-1/2 top-[58%] h-[640px] w-[820px] -translate-x-1/2 rounded-full opacity-60 blur-[140px]"
        style={{
          background:
            'radial-gradient(circle, rgba(120,170,255,0.28) 0%, rgba(255,140,80,0.18) 45%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-[1024px] flex-col items-center px-5 text-center md:px-8">
        {/* eyebrow */}
        <p className="text-[14px] font-medium text-[#ffb47a] md:text-[15px]">
          全新 v1 · 限量 200 台
        </p>

        {/* 巨大标题 */}
        <h1 className="mt-3 max-w-[16ch] text-[clamp(2.6rem,7.2vw,5.6rem)] font-semibold leading-[1.04] tracking-tight text-white md:mt-4">
          让一颗卫星
          <br />
          悬浮在你的桌上。
        </h1>

        {/* 一行副文案 */}
        <p className="mt-5 max-w-[36ch] text-[clamp(17px,1.8vw,21px)] font-normal leading-[1.4] text-[#a1a1a6] md:mt-6">
          12 mm 气隙 · Qi 隔空充电 · 反作用飞轮姿控 · 星闪 NearLink 实时下行。
        </p>

        {/* 按钮组 */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 md:mt-10">
          <a
            href="#preorder"
            className="inline-flex items-center justify-center rounded-full bg-[#ffb47a] px-6 py-2.5 text-[15px] font-medium text-black transition hover:bg-[#ffd296]"
          >
            预订 ¥ 2,888
          </a>
          <a
            href="#how"
            className="inline-flex items-center text-[15px] font-normal text-[#ffb47a] transition hover:text-[#ffd296]"
          >
            了解更多 <span className="ml-1.5 transition group-hover:translate-x-0.5">›</span>
          </a>
        </div>

        {/* 主视觉 */}
        <div className="relative mt-12 w-full md:mt-16">
          <div className="relative mx-auto aspect-[4/3] w-full max-w-[820px]">
            {/* 卫星 */}
            <div className="anim-float absolute left-0 right-0 top-[4%] z-[3]">
              <div className="anim-yaw" style={{ transformOrigin: '50% 45%' }}>
                <SatelliteSculpture
                  className="mx-auto block h-auto w-[58%] md:w-[52%]"
                  showShadow={false}
                  uid="hero-orb"
                />
              </div>
            </div>

            {/* 磁场 */}
            <div className="pointer-events-none absolute bottom-[28%] left-1/2 z-[2] w-[42%] -translate-x-1/2 md:w-[38%]">
              <MagField className="block h-auto w-full" uid="hero-field" />
            </div>

            {/* 底座 */}
            <div className="absolute bottom-[8%] left-0 right-0 z-[1]">
              <LevitationBase className="mx-auto block h-auto w-[60%] md:w-[54%]" uid="hero-base" />
            </div>
          </div>
        </div>

        {/* 关键参数 */}
        <dl className="mb-20 mt-10 grid max-w-2xl grid-cols-3 gap-6 text-center md:mb-28 md:mt-12 md:gap-12">
          <div>
            <dt className="text-[12px] font-normal text-[#86868b] md:text-[13px]">悬浮气隙</dt>
            <dd className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-white md:text-[40px]">
              12<span className="ml-0.5 text-[14px] font-normal text-[#86868b] md:text-[18px]"> mm</span>
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-normal text-[#86868b] md:text-[13px]">无线充电</dt>
            <dd className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-white md:text-[40px]">
              5<span className="ml-0.5 text-[14px] font-normal text-[#86868b] md:text-[18px]"> W</span>
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-normal text-[#86868b] md:text-[13px]">续航</dt>
            <dd className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-white md:text-[40px]">
              3<span className="ml-0.5 text-[14px] font-normal text-[#86868b] md:text-[18px]"> h</span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
