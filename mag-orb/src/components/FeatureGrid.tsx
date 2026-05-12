import {
  IconFlywheel,
  IconLEDRing,
  IconLevitate,
  IconNFC,
  IconNearLink,
  IconQi,
} from './FeatureIcons'
import type { ComponentType } from 'react'

type Feature = {
  icon: ComponentType<{ className?: string }>
  title: string
  desc: string
  metric: string
  metricUnit?: string
  /** Tailwind 网格 col-span / row-span */
  span: string
}

const FEATURES: Feature[] = [
  {
    icon: IconLevitate,
    title: '稳定悬浮 12 mm',
    desc: '4 路电磁铁 + 4 路霍尔闭环，1 kHz 力反馈把卫星精准托在底座中心；指尖可拨动，松手即归位。',
    metric: '12',
    metricUnit: 'mm',
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    icon: IconQi,
    title: 'Qi 隔空充电',
    desc: '5 W 无接触输能 · 无须接口，下班自动满血。',
    metric: '5',
    metricUnit: 'W',
    span: 'md:col-span-2',
  },
  {
    icon: IconFlywheel,
    title: '反作用飞轮姿控',
    desc: '空心杯电机 35 000 rpm + 铜配重盘，2 秒完成 90° 转向。',
    metric: '35K',
    metricUnit: 'rpm',
    span: 'md:col-span-2',
  },
  {
    icon: IconNearLink,
    title: '星闪 NearLink',
    desc: '鸿蒙原生 OpenHarmony，30 ms 端到端推送状态，比 BLE 更快更稳。',
    metric: '30',
    metricUnit: 'ms',
    span: 'md:col-span-2',
  },
  {
    icon: IconLEDRing,
    title: '360° 扫描光环',
    desc: '腰部 12 颗 + 底盘 24 颗 LED，从待机呼吸到任务扫描，灯光替它说话。',
    metric: '36',
    metricUnit: 'LED',
    span: 'md:col-span-2',
  },
  {
    icon: IconNFC,
    title: 'NFC 碰一碰',
    desc: '掏出手机贴底座，鸿蒙服务卡片一秒上桌。',
    metric: '< 1',
    metricUnit: 's',
    span: 'md:col-span-2',
  },
]

export function FeatureGrid() {
  return (
    <section
      id="features"
      className="relative bg-[#0a0a0a] py-24 md:py-36 lg:py-44"
    >
      <div className="mx-auto max-w-[1180px] px-5 md:px-8">
        {/* 居中标题 */}
        <div className="text-center">
          <p className="text-[14px] font-medium text-[#ffb47a] md:text-[15px]">六大能力</p>
          <h2 className="mt-3 text-[clamp(1.7rem,5.4vw,4rem)] font-semibold leading-[1.12] tracking-tight text-white md:mt-4">
            真卫星会做的事，
            <br />
            这颗摆件全都会做。
          </h2>
          <p className="mx-auto mt-5 max-w-[36ch] text-[clamp(15px,1.6vw,19px)] leading-[1.5] text-[#a1a1a6] md:mt-6">
            悬浮、姿控、通信、能源 —— 真卫星的四大分系统，等比缩进 100 mm 的桌面。
          </p>
        </div>

        {/* Bento */}
        <div className="mt-14 grid grid-cols-1 gap-3 md:mt-20 md:grid-cols-6 md:gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            const isHero = i === 0
            return (
              <article
                key={f.title}
                className={`group relative overflow-hidden rounded-3xl bg-[#141416] p-7 transition hover:bg-[#18181a] md:p-8 ${f.span}`}
              >
                {/* 暖色辉光 */}
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-0 blur-[80px] transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(circle, rgba(255,180,122,0.4), transparent 70%)' }}
                />

                <div
                  className={`relative flex flex-col gap-4 ${
                    isHero ? 'h-full justify-between md:gap-6' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex items-center justify-center rounded-2xl bg-white/5 text-[#ffd296] transition group-hover:bg-white/10 ${
                        isHero ? 'h-14 w-14 md:h-16 md:w-16' : 'h-12 w-12'
                      }`}
                    >
                      <Icon className={isHero ? 'h-9 w-9 md:h-10 md:w-10' : 'h-7 w-7'} />
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-semibold leading-none tracking-tight tabular-nums text-white ${
                          isHero ? 'text-[44px] md:text-[64px]' : 'text-[32px] md:text-[40px]'
                        }`}
                      >
                        {f.metric}
                      </div>
                      {f.metricUnit ? (
                        <div className="mt-1 text-[12px] text-[#86868b]">{f.metricUnit}</div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <h3
                      className={`font-semibold leading-[1.15] tracking-tight text-white ${
                        isHero ? 'text-[24px] md:text-[28px]' : 'text-[18px] md:text-[20px]'
                      }`}
                    >
                      {f.title}
                    </h3>
                    <p
                      className={`mt-2 leading-[1.5] text-[#a1a1a6] ${
                        isHero ? 'text-[15px] md:text-[16px]' : 'text-[13.5px] md:text-[14.5px]'
                      }`}
                    >
                      {f.desc}
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
