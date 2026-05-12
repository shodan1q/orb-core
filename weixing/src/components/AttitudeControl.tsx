import { useCallback, useState } from 'react'
import { AttitudeStlCanvas } from './AttitudeStlCanvas'
import { CornerMarks } from './CornerMarks'

export function AttitudeControl() {
  /** 零位：与 `ATTITUDE_ZERO_REFERENCE_DEG` 对应的实际朝向在 3D 中固化，读数均为 0° */
  const [pitch, setPitch] = useState(0)
  const [roll, setRoll] = useState(0)
  const [yaw, setYaw] = useState(0)

  const reset = useCallback(() => {
    setPitch(0)
    setRoll(0)
    setYaw(0)
  }, [])

  const axis = (
    label: string,
    value: number,
    set: (n: number) => void,
    min: number,
    max: number,
  ) => (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <span className="font-mono text-sm tabular-nums text-zinc-200">{value.toFixed(1)}°</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-zinc-500"
      />
    </div>
  )

  return (
    <section className="relative flex h-full min-h-[320px] flex-col rounded-3xl border border-zinc-800/80 bg-[#0d0d10] p-5">
      <CornerMarks />
      <header className="relative z-10 mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Motion Sense
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-200">姿态控制</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-zinc-700/80 px-3 py-1 text-[11px] text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
        >
          归零
        </button>
      </header>

      <div className="relative z-10 flex flex-1 flex-col gap-4">
        <AttitudeStlCanvas pitchDeg={pitch} rollDeg={roll} yawDeg={yaw} />

        <div className="space-y-4 rounded-2xl border border-zinc-800/60 bg-black/25 p-4">
          {axis('俯仰 Pitch', pitch, setPitch, -45, 45)}
          {axis('横滚 Roll', roll, setRoll, -45, 45)}
          {axis('偏航 Yaw', yaw, setYaw, 0, 360)}
        </div>
      </div>
    </section>
  )
}
