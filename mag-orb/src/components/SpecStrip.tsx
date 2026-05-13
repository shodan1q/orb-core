import { CornerMarks } from './CornerMarks'

type SpecItem = {
  title: string
  value: string
  tag: string
  detail: string
}

const SPECS: SpecItem[] = [
  {
    title: '磁气隙',
    value: '22 mm',
    tag: '反馈悬浮 · ±0.5 mm',
    detail: '霍尔阵列检测姿态，四组电磁线圈 PID 调流；本体浮高约 22 mm。',
  },
  {
    title: '本体载荷',
    value: '380 g',
    tag: '黄铜框架 + 模组',
    detail: '含框架、PCB、电池、舵机、卫星锅与外饰，铸造小批量装配。',
  },
  {
    title: '供电',
    value: '5 V · 10 W',
    tag: 'Qi 感应 · 整流',
    detail: '底座对本体感应耦合，整流后给电池补能；运行电流约 80 mA。',
  },
  {
    title: '上行',
    value: 'BLE 5.2',
    tag: '配网 · 状态',
    detail: '蓝牙低功耗对接 App，用于设置时间、扫描脉冲样式、IR 阈值。',
  },
  {
    title: '显示',
    value: '128 × 64',
    tag: 'OLED 0.96″ I²C',
    detail: 'SSD1306 屏，刷新 30 fps；时间 + 扫描脉冲，IR 触发切换。',
  },
  {
    title: '续航',
    value: '14 h',
    tag: '满电 · @ 80 mA',
    detail: '锂聚 3.7V 1200 mAh，悬浮启动到下电典型续航约 14 小时。',
  },
]

export function SpecStrip() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#0d0d10]">
      <CornerMarks />
      <header className="relative z-10 flex items-end justify-between gap-2 border-b border-zinc-800/60 px-5 pb-3 pt-4 md:px-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Key Specs
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-200">关键参数 · 六项硬指标</p>
        </div>
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">DESKTOP SAT · R-007</p>
      </header>

      <div className="relative z-10 grid grid-cols-2 gap-px bg-zinc-800/40 sm:grid-cols-3 lg:grid-cols-6">
        {SPECS.map((s) => (
          <div key={s.title} className="bg-[#0d0d10] px-4 py-4 md:px-5 md:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {s.title}
            </p>
            <div className="mt-2 border-t border-zinc-800/80 pt-2 font-mono text-xl font-semibold tabular-nums leading-none text-white md:text-2xl">
              {s.value}
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-500">{s.tag}</p>
            <p className="mt-1 text-[11px] leading-snug text-zinc-600">{s.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
