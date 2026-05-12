import { LevitationBase } from './LevitationBase'
import { MagField } from './MagField'
import { SatelliteSculpture } from './SatelliteSculpture'

const STEPS = [
  {
    num: '01',
    title: '4 路电磁铁拉，4 路霍尔感',
    desc: '底座顶面有四颗对称布置的电磁铁与四颗霍尔传感器；霍尔检测卫星距离，MCU 以 1 kHz 调整电流，让吸力刚好抵消重力。',
  },
  {
    num: '02',
    title: '12 mm 气隙的力学平衡',
    desc: '气隙保持 12 mm — 上拉力随距离 ⁻²，靠 PID 闭环维持稳态。指尖拨动时进入瞬态过渡，松手 800 ms 内回到中心。',
  },
  {
    num: '03',
    title: 'Qi 隔空充电同时进行',
    desc: 'Qi 100–200 kHz 与悬浮 30–50 kHz 频率不冲突，再用铁氧体片把磁场约束在中心区，避免干扰悬浮霍尔读数。',
  },
]

export function HowItFloats() {
  return (
    <section
      id="how"
      className="relative overflow-hidden bg-[#0a0a0a] py-24 md:py-36 lg:py-44"
    >
      <div className="mx-auto max-w-[980px] px-5 md:px-8">
        {/* 居中标题区 */}
        <div className="text-center">
          <p className="text-[14px] font-medium text-[#ffb47a] md:text-[15px]">悬浮原理</p>
          <h2 className="mt-3 text-[clamp(2rem,5.4vw,4rem)] font-semibold leading-[1.07] tracking-tight text-white md:mt-4">
            它怎么浮起来的？
          </h2>
          <p className="mx-auto mt-5 max-w-[36ch] text-[clamp(15px,1.6vw,19px)] leading-[1.5] text-[#a1a1a6] md:mt-6">
            没有 trick，没有透明柱。是 1 kHz 的力反馈在每秒一千次地稳住它。
          </p>
        </div>

        {/* 大图：卫星动态场景 */}
        <div className="relative mt-16 md:mt-24">
          <div
            className="pointer-events-none absolute left-1/2 top-[35%] h-[60%] w-[80%] -translate-x-1/2 rounded-full opacity-50 blur-[100px]"
            style={{ background: 'radial-gradient(circle, rgba(120,170,255,0.3), transparent 65%)' }}
          />
          <div className="relative mx-auto flex aspect-[5/4] w-full max-w-[720px] items-center justify-center">
            {/* 标尺：12 mm */}
            <div className="absolute right-[10%] top-[36%] z-[5] flex flex-col items-center text-[#86868b]">
              <div className="h-12 w-px bg-gradient-to-b from-transparent via-[#ffb47a]/70 to-transparent" />
              <div className="my-1 font-medium text-[11px] tracking-wide text-[#ffb47a]">12 mm</div>
              <div className="h-12 w-px bg-gradient-to-b from-[#ffb47a]/70 via-transparent to-transparent" />
            </div>

            <div className="anim-float absolute left-0 right-0 top-0 z-[3]">
              <SatelliteSculpture
                className="mx-auto block h-auto w-[58%]"
                showShadow={false}
                uid="how-orb"
              />
            </div>
            <div className="pointer-events-none absolute bottom-[20%] left-1/2 z-[2] w-[48%] -translate-x-1/2">
              <MagField className="block h-auto w-full" uid="how-field" />
            </div>
            <div className="absolute bottom-[4%] left-0 right-0 z-[1]">
              <LevitationBase className="mx-auto block h-auto w-[68%]" uid="how-base" />
            </div>
          </div>
        </div>

        {/* 三步说明：横排，无边框 */}
        <ol className="mt-16 grid grid-cols-1 gap-y-10 gap-x-12 md:mt-24 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.num} className="text-left">
              <div className="font-medium text-[14px] text-[#ffb47a]">{s.num}</div>
              <h3 className="mt-2 text-[20px] font-semibold leading-[1.2] tracking-tight text-white md:text-[22px]">
                {s.title}
              </h3>
              <p className="mt-3 text-[14.5px] leading-[1.55] text-[#a1a1a6] md:text-[15px]">
                {s.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
