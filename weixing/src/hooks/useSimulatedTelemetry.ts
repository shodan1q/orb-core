import { useCallback, useEffect, useMemo, useState } from 'react'

export type EcoSnapshot = {
  solarW: number
  busLoadW: number
  computeTokenKPerH: number
  cumulativeKWh: number
  totalTokensSavedM: number
  earthRefPue: number
  satEffectivePue: number
  /** >1 表示相对地面参考更高效 */
  vsEarthRatio: number
  co2SavedKg: number
  economyCny: number
}

export type SatelliteHealthSnapshot = {
  temps: { id: string; label: string; c: number }[]
  thermalMarginPct: number
  eps: {
    solarI: number
    solarV: number
    solarT: number
    battV: number
    battI: number
    soc: number
    battT: number
  }
  epsBalancePct: number
  wheels: { id: string; rpm: number }[]
  gyroBias: readonly [number, number, number]
  starValid: boolean
  sunValid: boolean
  thrusters: { id: string; on: boolean }[]
  comm: {
    tmBps: number
    tcPending: number
    rangeSigmaM: number
    dopplerHz: number
    tmCrcOk: number
  }
  nav: {
    tleAgeH: number
    osvR: number
    osvV: number
    ephUtc: string
  }
  mission: {
    opticalMbps: number
    sarMode: string
    irWindowK: number
  }
  science: {
    bFieldNt: number
    fluxPart: number
    neCm3: number
  }
}

export function useSimulatedTelemetry() {
  const [tick, setTick] = useState(0)
  const [trail, setTrail] = useState<[number, number][]>([])

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 120)
    return () => window.clearInterval(id)
  }, [])

  const orbit = useMemo(() => {
    const a = tick * 0.018
    const lat = 28 * Math.sin(a) + 8 * Math.sin(a * 2.3)
    const lng = 160 * Math.cos(a * 0.85) + 20 * Math.sin(a * 0.4)
    const altitudeKm = 520 + 12 * Math.sin(a * 1.1)
    const speedKms = 7.62 + 0.08 * Math.sin(a * 0.7)
    return { lat, lng, altitudeKm, speedKms }
  }, [tick])

  const pushTrail = useCallback((pair: [number, number]) => {
    setTrail((prev) => {
      const next = [...prev, pair]
      return next.length > 90 ? next.slice(-90) : next
    })
  }, [])

  useEffect(() => {
    pushTrail([orbit.lat, orbit.lng])
  }, [orbit.lat, orbit.lng, pushTrail])

  const camera = useMemo(() => {
    const iso = 320 + Math.round(40 * Math.sin(tick * 0.08))
    const shutter = [250, 320, 400, 500, 640][tick % 5]
    return { iso, shutter, aperture: 'f/2.4', resolution: '3840 × 2160' }
  }, [tick])

  const health = useMemo(() => {
    const wobble = (n: number, amp: number) => n + amp * Math.sin(tick * 0.07)
    const temps = [
      { id: 'pay', label: '载荷舱', c: wobble(21.4, 0.35) },
      { id: 'panel', label: '+Y 太阳翼根', c: wobble(38.2, 1.1) },
      { id: 'batt', label: '蓄电池组', c: wobble(18.6, 0.25) },
      { id: 'eps', label: 'EPS 配电', c: wobble(24.1, 0.4) },
      { id: 'adcs', label: 'ADCS 舱壁', c: wobble(19.8, 0.2) },
    ]
    const tMax = Math.max(...temps.map((t) => t.c))
    const thermalMarginPct = Math.max(0, Math.min(100, 100 - (tMax - 15) * 2.2))

    const solarI = wobble(4.82, 0.12)
    const solarV = wobble(34.6, 0.4)
    const solarT = wobble(41.5, 0.8)
    const battV = wobble(28.05, 0.06)
    const battI = wobble(-2.1, 0.35)
    const soc = Math.max(62, Math.min(98, wobble(86.4, 0.5)))
    const battT = wobble(17.9, 0.15)
    const epsBalancePct = Math.max(
      8,
      Math.min(92, (solarI * solarV) / 180 * 100 + 10 * Math.sin(tick * 0.05)),
    )

    const wheels = [
      { id: 'RW-X', rpm: Math.round(wobble(6230, 80)) },
      { id: 'RW-Y', rpm: Math.round(wobble(-5980, 90)) },
      { id: 'RW-Z', rpm: Math.round(wobble(120, 200)) },
    ]
    const gyroBias = [
      wobble(0.012, 0.004),
      wobble(-0.009, 0.003),
      wobble(0.006, 0.002),
    ] as const
    const thrusters = [
      { id: 'J1', on: tick % 47 < 2 },
      { id: 'J2', on: false },
      { id: 'J3', on: false },
      { id: 'J4', on: tick % 113 < 1 },
    ]

    const comm = {
      tmBps: Math.round(wobble(204800, 8000)),
      tcPending: Math.max(0, Math.round(2 + Math.sin(tick * 0.03) * 1.5)),
      rangeSigmaM: wobble(1.85, 0.12),
      dopplerHz: wobble(-142.6, 4),
      tmCrcOk: 99.992 - (tick % 17) * 0.0001,
    }

    const nav = {
      tleAgeH: wobble(2.4, 0.08),
      osvR: wobble(6871023, 120),
      osvV: wobble(7542.8, 2.1),
      ephUtc: '2026-04-08T07:42:18Z',
    }

    const mission = {
      opticalMbps: wobble(312, 8),
      sarMode: 'Strip · 待命',
      irWindowK: wobble(265, 3),
    }

    const science = {
      bFieldNt: wobble(52.3, 1.2),
      fluxPart: wobble(1840, 40),
      neCm3: wobble(1.2e5, 4000),
    }

    const snapshot: SatelliteHealthSnapshot = {
      temps,
      thermalMarginPct,
      eps: { solarI, solarV, solarT, battV, battI, soc, battT },
      epsBalancePct,
      wheels,
      gyroBias,
      starValid: true,
      sunValid: tick % 200 > 3,
      thrusters,
      comm,
      nav,
      mission,
      science,
    }
    return snapshot
  }, [tick])

  const eco = useMemo((): EcoSnapshot => {
    const solarW = health.eps.solarI * health.eps.solarV
    const busLoadW = solarW * (0.58 + 0.06 * Math.sin(tick * 0.05))
    const computeTokenKPerH =
      health.mission.opticalMbps * 0.014 + 0.55 + Math.sin(tick * 0.04) * 0.08

    const cumulativeKWh = 142.8 + tick * 0.00195
    const totalTokensSavedM = 4.06 + tick * 0.00032

    const earthRefPue = 1.58
    const satEffectivePue = 1.11 + 0.02 * Math.sin(tick * 0.03)
    const vsEarthRatio = earthRefPue / satEffectivePue

    const gridCo2KgPerKwh = 0.556
    const co2SavedKg = cumulativeKWh * gridCo2KgPerKwh

    const yuanPerKwh = 0.62
    const yuanPerMToken = 14800
    const economyCny = cumulativeKWh * yuanPerKwh + totalTokensSavedM * yuanPerMToken

    return {
      solarW,
      busLoadW,
      computeTokenKPerH,
      cumulativeKWh,
      totalTokensSavedM,
      earthRefPue,
      satEffectivePue,
      vsEarthRatio,
      co2SavedKg,
      economyCny,
    }
  }, [tick, health])

  return { tick, orbit, trail, camera, health, eco }
}
