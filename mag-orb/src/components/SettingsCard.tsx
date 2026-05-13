import { CornerMarks } from './CornerMarks'
import type { AnimationFlags } from './Satellite3D'

type Props = {
  powered: boolean
  flags: AnimationFlags
  explode: number
  onPower: (next: boolean) => void
  onFlags: (next: AnimationFlags) => void
  onExplode: (v: number) => void
}

const DEFAULT_FLAGS: AnimationFlags = {
  powered: true,
  bodyRotate: true,
  dishScan: true,
  dishScanSpeed: 1,
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
  disabled,
}: {
  label: string
  sub: string
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-zinc-800/60 bg-black/30 px-4 py-3 transition hover:border-zinc-700 ${disabled ? 'opacity-40' : ''}`}
    >
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-zinc-200">{label}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">{sub}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          value ? 'bg-[#ff4d33]' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}

function SliderRow({
  label,
  sub,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  sub: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-black/30 px-4 py-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[12px] font-medium text-zinc-200">{label}</p>
        <span className="font-mono text-sm tabular-nums text-white">
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">{sub}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="explode-slider mt-3 w-full cursor-pointer"
      />
    </div>
  )
}

export function SettingsCard({ powered, flags, explode, onPower, onFlags, onExplode }: Props) {
  const setFlag = <K extends keyof AnimationFlags>(k: K, v: AnimationFlags[K]) =>
    onFlags({ ...flags, [k]: v })

  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#0d0d10]">
      <CornerMarks />
      <header className="relative z-10 flex items-start justify-between border-b border-zinc-800/60 px-5 pb-3 pt-4 md:px-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Console Settings
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-200">
            控制台设置 · 动画 · 电源 · 演示参数
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            powered
              ? 'bg-[#ff4d33]/15 text-[#ff6b4d]'
              : 'bg-zinc-800/60 text-zinc-400'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${powered ? 'animate-pulse bg-[#ff4d33]' : 'bg-zinc-600'}`}
          />
          {powered ? 'POWER  ON' : 'POWER  OFF'}
        </span>
      </header>

      <div className="relative z-10 grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2 md:px-6">
        {/* 电源 */}
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={() => onPower(!powered)}
            className={`relative w-full overflow-hidden rounded-2xl border px-5 py-5 text-left transition ${
              powered
                ? 'border-[#ff4d33]/50 bg-[#ff4d33]/8 hover:bg-[#ff4d33]/12'
                : 'border-zinc-700/80 bg-black/30 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Master Power
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {powered ? '通电运行中' : '已断电'}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {powered
                    ? '所有动画与 LED 启用 · OLED 显示时间扫描'
                    : '本体姿态冻结 · LED 矩阵熄灭 · OLED 黑屏'}
                </p>
              </div>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={powered ? 'text-[#ff6b4d]' : 'text-zinc-500'}>
                <path d="M12 2v10M18.4 6.6a9 9 0 11-12.77 0" />
              </svg>
            </div>
          </button>
        </div>

        {/* 动画开关 */}
        <ToggleRow
          label="本体自转"
          sub="Body Yaw · 0.12 rad/s"
          value={flags.bodyRotate}
          onChange={(v) => setFlag('bodyRotate', v)}
          disabled={!powered}
        />
        <ToggleRow
          label="卫星锅扫描"
          sub="Dish Yaw Scan · ±31°"
          value={flags.dishScan}
          onChange={(v) => setFlag('dishScan', v)}
          disabled={!powered}
        />

        {/* 扫描速度 */}
        <SliderRow
          label="卫星锅扫描速度"
          sub="Scan Speed · 1.0× 基准"
          value={flags.dishScanSpeed}
          min={0.2}
          max={3}
          step={0.1}
          onChange={(v) => setFlag('dishScanSpeed', v)}
          format={(v) => `${v.toFixed(1)} ×`}
        />

        {/* 爆炸预设 */}
        <div className="rounded-2xl border border-zinc-800/60 bg-black/30 px-4 py-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[12px] font-medium text-zinc-200">拆解预设</p>
            <span className="font-mono text-sm tabular-nums text-white">
              {Math.round(explode * 100)}%
            </span>
          </div>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Explode Presets
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: '装配', v: 0 },
              { label: '半拆', v: 0.5 },
              { label: '完全拆开', v: 1 },
            ].map((p) => (
              <button
                key={p.v}
                type="button"
                onClick={() => onExplode(p.v)}
                className={`rounded-xl border px-3 py-2 text-[12px] font-medium transition ${
                  Math.abs(explode - p.v) < 0.05
                    ? 'border-[#ff4d33]/60 bg-[#ff4d33]/10 text-[#ff6b4d]'
                    : 'border-zinc-700/80 text-zinc-300 hover:border-zinc-500 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 恢复默认 + 快捷键提示 */}
      <div className="relative z-10 flex flex-col items-center gap-2 border-t border-zinc-800/60 px-5 py-4 md:px-6">
        <button
          type="button"
          onClick={() => {
            onFlags(DEFAULT_FLAGS)
            onPower(true)
            onExplode(0)
          }}
          className="rounded-full border border-zinc-700/80 px-4 py-1.5 text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-white"
        >
          ↺ 恢复默认
        </button>
        <p className="text-center text-[10px] text-zinc-600">
          快捷键: <span className="text-zinc-400">P</span> 电源 ·{' '}
          <span className="text-zinc-400">1 / 2 / 3</span> 切 tab ·{' '}
          <span className="text-zinc-400">E / Q</span> 拆解 ± ·{' '}
          <span className="text-zinc-400">R</span> 复位
        </p>
      </div>
    </section>
  )
}
