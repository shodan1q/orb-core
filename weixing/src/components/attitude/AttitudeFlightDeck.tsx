import { useCallback, useEffect, useMemo, useState } from 'react'
import { AttitudeStlCanvas } from '../AttitudeStlCanvas'
import type { SatelliteHealthSnapshot } from '../../hooks/useSimulatedTelemetry'
import { MiniOrbitMap } from './MiniOrbitMap'

/** 与参考图一致：罗盘角度胶囊略偏蓝；针与 REC 为红 */
const COMPASS_PILL_BG = '#3d5a80'
const COMPASS_NEEDLE = '#e53935'

type Orbit = {
  lat: number
  lng: number
  altitudeKm: number
  speedKms: number
}

type Camera = {
  iso: number
  shutter: number
  aperture: string
  resolution: string
}

export type AttitudeFlightDeckProps = {
  orbit: Orbit
  trail: [number, number][]
  health: SatelliteHealthSnapshot
  camera: Camera
  tick: number
}

function yawNorm360(yawDeg: number) {
  return ((yawDeg % 360) + 360) % 360
}

function toDms(deg: number, lat: boolean) {
  const sign = deg >= 0 ? 1 : -1
  const a = Math.abs(deg)
  const d = Math.floor(a)
  const mf = (a - d) * 60
  const m = Math.floor(mf)
  const s = Math.round((mf - m) * 60)
  const hemi = lat ? (sign >= 0 ? 'N' : 'S') : sign >= 0 ? 'E' : 'W'
  return `${d}°${m}'${s}"${hemi}`
}

function FlightCompass({
  yawDeg,
  pitchDeg = 0,
  rollDeg = 0,
  compact,
}: {
  yawDeg: number
  pitchDeg?: number
  rollDeg?: number
  compact?: boolean
}) {
  const y = yawNorm360(yawDeg)
  return (
    <div
      className={`relative mx-auto aspect-square w-full ${compact ? 'max-w-[min(8.5rem,46vw)]' : 'max-w-[200px]'}`}
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-visible">
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ transform: `rotate(${rollDeg}deg)` }}
        >
          <div
            className="h-full w-full"
            style={{ transform: `translateY(${-pitchDeg * 0.32}px)` }}
          >
            <svg viewBox="0 0 200 200" className="h-full w-full text-zinc-600">
        <circle cx="100" cy="100" r="92" fill="#121214" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        {Array.from({ length: 12 }, (_, i) => i * 30).map((a) => {
          const rad = ((a - 90) * Math.PI) / 180
          const x1 = 100 + 80 * Math.cos(rad)
          const y1 = 100 + 80 * Math.sin(rad)
          const x2 = 100 + 90 * Math.cos(rad)
          const y2 = 100 + 90 * Math.sin(rad)
          return (
            <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" opacity="0.55" />
          )
        })}
        {[0, 90, 180, 270].map((a) => {
          const rad = ((a - 90) * Math.PI) / 180
          const lab = a === 0 ? 'N' : a === 90 ? 'E' : a === 180 ? 'S' : 'W'
          return (
            <text
              key={a}
              x={100 + 64 * Math.cos(rad)}
              y={100 + 64 * Math.sin(rad)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-zinc-400 text-[11px] font-semibold"
            >
              {lab}
            </text>
          )
        })}
        {[30, 60, 120, 150, 210, 240, 300, 330].map((a) => {
          const rad = ((a - 90) * Math.PI) / 180
          return (
            <text
              key={`d-${a}`}
              x={100 + 82 * Math.cos(rad)}
              y={100 + 82 * Math.sin(rad)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-zinc-500 text-[8px] font-mono tabular-nums"
            >
              {a}
            </text>
          )
        })}
        <g transform={`rotate(${-y} 100 100)`}>
          <line
            x1="100"
            y1="168"
            x2="100"
            y2="32"
            stroke={COMPASS_NEEDLE}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.95"
          />
        </g>
        <circle cx="100" cy="100" r="5" fill="#0a0a0c" stroke="rgb(161 161 170)" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold text-white"
        style={{ backgroundColor: COMPASS_PILL_BG }}
      >
        {y.toFixed(1)}°
      </div>
    </div>
  )
}

function DPad({
  onNudge,
}: {
  onNudge: (axis: 'pitch' | 'roll' | 'yaw', delta: number) => void
}) {
  const btn =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/95 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100 active:scale-95 lg:h-9 lg:w-9 lg:rounded-xl'
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">微调</span>
      <div className="grid grid-cols-3 gap-1 lg:gap-1.5">
        <span />
        <button type="button" className={btn} aria-label="俯仰+" onClick={() => onNudge('pitch', 1)}>
          ▲
        </button>
        <span />
        <button type="button" className={btn} aria-label="横滚-" onClick={() => onNudge('roll', -1)}>
          ◀
        </button>
        <span className="flex h-8 w-8 items-center justify-center text-zinc-600 lg:h-9 lg:w-9">·</span>
        <button type="button" className={btn} aria-label="横滚+" onClick={() => onNudge('roll', 1)}>
          ▶
        </button>
        <span />
        <button type="button" className={btn} aria-label="俯仰-" onClick={() => onNudge('pitch', -1)}>
          ▼
        </button>
        <span />
      </div>
      <div className="mt-0.5 flex w-full max-w-[9.5rem] justify-center gap-1.5">
        <button type="button" className={`${btn} min-w-0 flex-1 px-1.5 text-[10px]`} onClick={() => onNudge('yaw', -1)}>
          左偏
        </button>
        <button type="button" className={`${btn} min-w-0 flex-1 px-1.5 text-[10px]`} onClick={() => onNudge('yaw', 1)}>
          右偏
        </button>
      </div>
    </div>
  )
}

function AxisSlider({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-[9px] leading-none text-zinc-500 lg:text-[10px]">{label}</span>
        <span className="shrink-0 font-mono text-[9px] tabular-nums leading-none text-zinc-200 lg:text-[10px]">
          {value.toFixed(1)}°
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-zinc-800/90 accent-zinc-400 lg:h-1.5"
      />
    </div>
  )
}

type MaintStatus = 'ok' | 'check' | 'warn'

/** 参考星上标注单机：太阳敏、电池阵、灯阵、相机、天线、插头 — 遥测由 health/camera/tick 演示合成 */
const AUTO_SCAN_INTERVAL_MS = 10 * 60 * 1000

function AdcsAutoMaintenancePanel({
  health,
  camera,
  tick,
  onInspectClick,
}: {
  health: SatelliteHealthSnapshot
  camera: Camera
  tick: number
  onInspectClick: () => void
}) {
  const rows = useMemo(() => {
    const solarW = health.eps.solarI * health.eps.solarV
    const sunAngleErr = (0.04 + 0.025 * Math.sin(tick * 0.09)).toFixed(3)
    const ledDuty = (78 + 8 * Math.sin(tick * 0.06)).toFixed(0)
    const vswrY = (1.08 + 0.04 * Math.sin(tick * 0.04)).toFixed(2)
    const vswrNegY = (1.11 + 0.03 * Math.cos(tick * 0.045)).toFixed(2)
    const plugR = (5.2 + 1.2 * Math.sin(tick * 0.03)).toFixed(1)
    const mtf = (0.36 + 0.02 * Math.sin(tick * 0.05)).toFixed(2)
    const dehydrate = (99.12 + Math.sin(tick * 0.05) * 0.04).toFixed(2)

    const list: { name: string; status: MaintStatus; detail: string }[] = [
      {
        name: '太阳敏感器',
        status: health.sunValid ? 'ok' : 'warn',
        detail: health.sunValid
          ? `粗精捕锁定 · 入射角残差 ${sunAngleErr}° · 星敏 ${health.starValid ? '协同' : '—'}`
          : `未捕获太阳矢量 · 残差 ${sunAngleErr}° · 建议切备份敏`,
      },
      {
        name: '电池阵列',
        status: health.eps.soc > 22 ? 'ok' : 'warn',
        detail: `SOC ${health.eps.soc.toFixed(1)}% · 母线 ${health.eps.battV.toFixed(2)} V · 阵面 ${solarW.toFixed(0)} W · ${health.eps.solarT.toFixed(1)}°C`,
      },
      {
        name: '载荷灯阵',
        status: 'ok',
        detail: `24×16 单元 · PWM 占空 ${ledDuty}% · 热裕 ${health.thermalMarginPct.toFixed(0)}%`,
      },
      {
        name: '对地相机',
        status: health.mission.opticalMbps > 200 ? 'ok' : 'check',
        detail: `下行 ${health.mission.opticalMbps.toFixed(0)} Mbps · ${health.mission.sarMode} · IR 窗 ${health.mission.irWindowK.toFixed(0)} K`,
      },
      {
        name: '载荷相机 · 宽视场',
        status: 'ok',
        detail: `ISO ${camera.iso} · 1/${camera.shutter} · ${camera.aperture} · 防抖 ON`,
      },
      {
        name: '载荷相机 · 详查',
        status: 'ok',
        detail: `${camera.resolution} · MTF ${mtf} · 脱水 ${dehydrate}%`,
      },
      {
        name: '数传天线',
        status: health.comm.tmCrcOk > 99.97 ? 'ok' : 'warn',
        detail: `TM ${(health.comm.tmBps / 1000).toFixed(0)} kbps · CRC ${health.comm.tmCrcOk.toFixed(3)}% · TC 队列 ${health.comm.tcPending}`,
      },
      {
        name: '载荷天线 · +Y',
        status: 'ok',
        detail: `VSWR ${vswrY} · 多普勒 ${health.comm.dopplerHz.toFixed(1)} Hz`,
      },
      {
        name: '载荷天线 · −Y',
        status: 'ok',
        detail: `VSWR ${vswrNegY} · 测距残差 σ ${health.comm.rangeSigmaM.toFixed(2)} m`,
      },
      {
        name: '星表插头',
        status: 'ok',
        detail: `接触电阻 ${plugR} mΩ · 栓锁到位 · 等效插拔 ${880 + (tick % 240)} 次`,
      },
    ]
    return list
  }, [health, camera, tick])

  const pillClass = (s: MaintStatus) =>
    s === 'ok'
      ? 'shrink-0 rounded border border-zinc-600 bg-zinc-800/70 px-1 py-0.5 text-[7px] text-zinc-300 md:text-[8px]'
      : s === 'warn'
        ? 'shrink-0 rounded border border-zinc-500 bg-zinc-700/40 px-1 py-0.5 text-[7px] text-zinc-100 md:text-[8px]'
        : 'shrink-0 rounded border border-zinc-800 bg-zinc-900/60 px-1 py-0.5 text-[7px] text-zinc-500 md:text-[8px]'

  const pillLabel = (s: MaintStatus) => (s === 'ok' ? '正常' : s === 'warn' ? '注意' : '巡检')

  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-1.5">
        <div className="min-w-0">
          <h2 className="truncate text-xs font-semibold tracking-tight text-white md:text-sm">
            自动检修 · ADCS
          </h2>
          <p className="mt-0.5 text-[8px] uppercase tracking-wider text-zinc-500 md:text-[10px]">
            单机自检 · 演示遥测
          </p>
        </div>
        <span className="shrink-0 rounded border border-zinc-700/80 px-1 py-0.5 text-[8px] text-zinc-400 md:rounded-lg md:px-1.5 md:text-[9px]">
          自检
        </span>
      </div>
      <div className="mt-1.5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700">
        <ul className="pr-0.5">
          {rows.map((row) => (
            <li key={row.name} className="border-b border-zinc-800/70 py-1.5 last:border-b-0 md:py-2">
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-[8px] font-medium leading-tight text-zinc-400 md:text-[9px]">{row.name}</span>
                <span className={pillClass(row.status)}>{pillLabel(row.status)}</span>
              </div>
              <p className="mt-0.5 font-mono text-[7px] leading-snug text-zinc-600 md:text-[8px]">{row.detail}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-2 flex shrink-0 gap-1 border-t border-zinc-800/80 pt-2">
        {['一键巡检', '标称', '静默'].map((m, i) => (
          <button
            key={m}
            type="button"
            onClick={i === 0 ? onInspectClick : undefined}
            className={`flex-1 rounded-full border py-1 text-[8px] font-medium transition md:py-2 md:text-[10px] ${
              i === 1
                ? 'border-zinc-600 bg-zinc-800 text-white shadow-sm'
                : 'border-zinc-800/90 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </>
  )
}

export function AttitudeFlightDeck({
  orbit,
  trail,
  health,
  camera,
  tick,
}: AttitudeFlightDeckProps) {
  const [pitch, setPitch] = useState(0)
  const [roll, setRoll] = useState(0)
  const [yaw, setYaw] = useState(0)
  const [scanPulseKey, setScanPulseKey] = useState(0)

  const triggerMaterialScan = useCallback(() => {
    setScanPulseKey((k) => k + 1)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setScanPulseKey((k) => k + 1)
    }, AUTO_SCAN_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [])

  const reset = useCallback(() => {
    setPitch(0)
    setRoll(0)
    setYaw(0)
  }, [])

  const nudge = useCallback(
    (axis: 'pitch' | 'roll' | 'yaw', delta: number) => {
      if (axis === 'pitch') setPitch((p) => Math.max(-45, Math.min(45, p + delta)))
      if (axis === 'roll') setRoll((r) => Math.max(-45, Math.min(45, r + delta)))
      if (axis === 'yaw') {
        if (delta === 0) return
        setYaw((y) => (y + delta + 360) % 360)
      }
    },
    [],
  )

  const fps = (58 + Math.sin(tick * 0.11) * 2.5).toFixed(1)
  const missionClock = useMemo(() => {
    const s = Math.floor(tick * 0.35)
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }, [tick])

  const altPct = Math.min(100, (orbit.altitudeKm / 650) * 100)
  const bars = useMemo(
    () => Array.from({ length: 24 }, (_, i) => 20 + Math.sin(tick * 0.08 + i * 0.4) * 18 + (i % 5) * 3),
    [tick],
  )

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#0a0a0c]">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1800px] flex-1 flex-col gap-1.5 overflow-hidden px-1.5 py-1 md:gap-2 md:px-2 md:py-1.5 lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,300px)] lg:grid-rows-[minmax(0,1fr)_auto] lg:items-stretch lg:gap-x-3 lg:gap-y-2 lg:px-3 lg:py-2">
        {/* 卫星视场：大屏 grid (1,1)，与右侧检修同高 */}
        <div className="relative order-1 min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#0d0d10] md:rounded-3xl lg:order-none lg:col-start-1 lg:row-start-1 lg:h-full lg:min-h-0 lg:flex-none">
            <div className="absolute inset-0">
              <AttitudeStlCanvas
                pitchDeg={pitch}
                rollDeg={roll}
                yawDeg={yaw}
                variant="flightdeck"
                scanPulseKey={scanPulseKey}
              />
            </div>

            {/* 参考网格 */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #fff 1px, transparent 1px),
                  linear-gradient(to bottom, #fff 1px, transparent 1px)
                `,
                backgroundSize: '33.33% 33.33%',
              }}
            />

            {/* 人造地平线与横滚 — 纯灰阶，无彩色天区 */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
              <div
                className="relative h-[120%] w-full"
                style={{ transform: `rotate(${roll}deg)` }}
              >
                <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/55" />
                <div className="absolute bottom-1/2 left-0 right-0 top-0 bg-gradient-to-b from-white/[0.06] to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 top-1/2 bg-gradient-to-b from-transparent to-zinc-950/55" />
              </div>
              <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-zinc-950/40" />
              <div className="absolute left-1/2 top-1/2 w-16 -translate-x-1/2 -translate-y-1/2 border-t border-white/20" />
            </div>

            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <span className="rounded-lg border border-zinc-700/80 bg-black/45 px-1.5 py-0.5 text-zinc-300">
                星敏
              </span>
              <span className="rounded-lg border border-zinc-800 bg-black/45 px-1.5 py-0.5 text-zinc-300">
                {fps} Hz
              </span>
            </div>
            <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2">
              <span
                className="rounded-full px-2 py-1 text-[10px] font-semibold text-white"
                style={{ backgroundColor: `${COMPASS_NEEDLE}e6` }}
              >
                ● REC {missionClock}
              </span>
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 flex items-end gap-px opacity-90">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-sm bg-zinc-500/80"
                  style={{ height: `${h}%`, maxHeight: 40 }}
                />
              ))}
            </div>
            <p className="pointer-events-none absolute bottom-1 right-2 hidden text-[8px] text-zinc-600 sm:block md:text-[9px]">
              拖拽旋转视角 · 滑块 / 十字键
            </p>
        </div>

        {/* 底部操纵台：大屏 grid (2,1)，与右侧罗盘同排；轨道卡为上下布局（地图上 / 遥测下） */}
        <div className="order-2 grid shrink-0 grid-cols-1 gap-1 lg:order-none lg:col-start-1 lg:row-start-2 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.68fr)_minmax(0,1.52fr)] lg:gap-1.5">
            <div className="flex min-h-0 flex-col rounded-2xl border border-zinc-800/80 bg-[#0d0d10] p-1 md:rounded-3xl md:p-1.5 lg:h-full lg:min-h-0">
              <div className="shrink-0 text-[8px] font-semibold uppercase tracking-wider text-zinc-500 md:text-[9px]">
                轨道投影
              </div>
              <div className="mt-0.5 flex min-h-0 flex-1 flex-col gap-1 lg:mt-1">
                <div className="h-[clamp(3rem,8dvh,4rem)] min-h-[2.75rem] w-full min-w-0 shrink-0 lg:min-h-0 lg:flex-1">
                  <MiniOrbitMap lat={orbit.lat} lng={orbit.lng} trail={trail} />
                </div>
                <div className="flex w-full shrink-0 flex-col gap-0.5 border-t border-zinc-800/60 pt-1">
                  <div className="grid grid-cols-[auto_1fr] gap-x-1.5 gap-y-px text-[7px] leading-tight md:text-[8px]">
                    <span className="text-zinc-600">Lat</span>
                    <span className="truncate text-right font-mono tabular-nums text-zinc-400">
                      {toDms(orbit.lat, true)}
                    </span>
                    <span className="text-zinc-600">Lon</span>
                    <span className="truncate text-right font-mono tabular-nums text-zinc-400">
                      {toDms(orbit.lng, false)}
                    </span>
                  </div>
                  <div className="mt-0.5">
                    <div className="flex justify-between gap-2 text-[7px] text-zinc-500 md:text-[8px]">
                      <span>高度带</span>
                      <span className="shrink-0 font-mono tabular-nums text-zinc-400">{orbit.altitudeKm.toFixed(1)} km</span>
                    </div>
                    <div className="mt-px h-0.5 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full rounded-full bg-zinc-500" style={{ width: `${altPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col gap-1.5 rounded-2xl border border-zinc-800/80 bg-[#0d0d10] p-2 md:rounded-3xl md:p-2.5 lg:h-full lg:min-w-0 lg:gap-1.5 lg:p-2">
              <div className="text-[8px] font-semibold uppercase tracking-wider text-zinc-500 md:text-[9px]">
                任务 / 光学
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 lg:grid-cols-1 lg:gap-y-1">
                <div className="min-w-0 rounded-lg border border-zinc-800/50 bg-zinc-900/25 px-1.5 py-1 lg:border-zinc-800/40 lg:px-2 lg:py-1">
                  <div className="text-[7px] font-medium uppercase tracking-wide text-zinc-600 md:text-[8px]">地速</div>
                  <div className="mt-0.5 font-mono text-xs font-medium tabular-nums text-white md:text-sm">
                    {(orbit.speedKms * 3600).toFixed(0)}
                    <span className="ml-0.5 text-[9px] font-normal text-zinc-500">km/h</span>
                  </div>
                </div>
                <div className="min-w-0 rounded-lg border border-zinc-800/50 bg-zinc-900/25 px-1.5 py-1 lg:border-zinc-800/40 lg:px-2 lg:py-1">
                  <div className="text-[7px] font-medium uppercase tracking-wide text-zinc-600 md:text-[8px]">
                    任务时钟
                  </div>
                  <div className="mt-0.5 font-mono text-xs font-medium tabular-nums text-zinc-100 md:text-sm">
                    {missionClock}
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-800/70 pt-1.5 lg:pt-1.5">
                <div className="text-[7px] font-medium uppercase tracking-wide text-zinc-600 md:text-[8px]">光学 · 曝光</div>
                <p className="mt-0.5 font-mono text-[9px] leading-snug text-zinc-300 md:text-[10px]">
                  ISO <span className="text-zinc-100">{camera.iso}</span>
                  <span className="mx-0.5 text-zinc-600">·</span>1/
                  <span className="text-zinc-100">{camera.shutter}</span>
                  <span className="mx-0.5 text-zinc-600">·</span>
                  <span className="text-zinc-100">{camera.aperture}</span>
                </p>
              </div>

              <div className="border-t border-zinc-800/70 pt-1.5 lg:pt-1.5">
                <div className="mb-1 text-[7px] font-medium uppercase tracking-wide text-zinc-600 md:text-[8px]">
                  输出分辨率
                </div>
                <div className="flex flex-wrap gap-1">
                  {['3840×2160', '1920×1080', '1280×720'].map((r) => (
                    <span
                      key={r}
                      className={`rounded border px-1.5 py-0.5 font-mono text-[7px] tabular-nums md:text-[8px] ${
                        r === '3840×2160'
                          ? 'border-zinc-500/80 bg-zinc-800/90 text-white'
                          : 'border-zinc-800 bg-zinc-950/40 text-zinc-500'
                      }`}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-2 rounded-2xl border border-zinc-800/80 bg-[#0d0d10] p-2 md:rounded-3xl md:p-2.5 lg:h-full lg:flex-row lg:items-stretch lg:gap-0 lg:pl-3 lg:pr-2.5 lg:pt-2 lg:pb-2">
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 lg:min-w-0 lg:pr-3">
                <div className="text-[8px] font-semibold uppercase tracking-wider text-zinc-500 md:text-[9px]">姿态 · 飞控</div>
                <div className="flex flex-col gap-1.5">
                  <AxisSlider label="俯仰 Pitch" value={pitch} onChange={setPitch} min={-45} max={45} />
                  <AxisSlider label="横滚 Roll" value={roll} onChange={setRoll} min={-45} max={45} />
                  <AxisSlider label="偏航 Yaw" value={yaw} onChange={setYaw} min={0} max={360} />
                </div>
              </div>
              <div className="flex shrink-0 flex-row items-end justify-center gap-2 border-t border-zinc-800/70 pt-2 max-lg:pb-0.5 lg:flex-col lg:items-center lg:justify-between lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                <DPad onNudge={nudge} />
                <button
                  type="button"
                  onClick={reset}
                  className="shrink-0 rounded-lg border border-zinc-700/80 px-3 py-1.5 text-[10px] font-medium text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100 max-lg:self-end lg:w-full lg:max-w-[9.5rem] lg:py-2 lg:text-[11px]"
                >
                  归零
                </button>
              </div>
            </div>
        </div>

        {/* 小屏横排；大屏 lg:contents 拆成两格：检修与卫星同高、罗盘与底栏行同高 */}
        <div className="order-3 flex min-h-0 w-full shrink-0 gap-1.5 overflow-hidden max-lg:max-h-[22dvh] max-lg:flex-row lg:contents">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#0d0d10] p-2 md:rounded-3xl md:p-3 lg:col-start-2 lg:row-start-1 lg:h-full lg:min-h-0 lg:max-h-full lg:min-w-[260px] lg:flex-none">
            <AdcsAutoMaintenancePanel
              health={health}
              camera={camera}
              tick={tick}
              onInspectClick={triggerMaterialScan}
            />
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#0d0d10] p-2 md:rounded-3xl md:p-3 lg:col-start-2 lg:row-start-2 lg:h-full lg:min-h-0 lg:min-w-[260px] lg:flex-none">
            <h3 className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
              航向 / 罗盘
            </h3>
            <div className="mt-1 flex min-h-0 flex-1 items-center justify-center overflow-hidden">
              <FlightCompass yawDeg={yaw} pitchDeg={pitch} rollDeg={roll} compact />
            </div>
            <div className="mt-1 shrink-0 truncate border-t border-zinc-800/80 pt-1 font-mono text-[7px] leading-tight text-zinc-500 md:text-[9px]">
              {health.nav.ephUtc.slice(11, 19)}Z · TM {(health.comm.tmBps / 1000).toFixed(0)}k
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
