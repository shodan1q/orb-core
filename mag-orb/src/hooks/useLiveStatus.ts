import { useEffect, useState } from 'react'

export type LiveSnapshot = {
  levitation: '稳定' | '校准中' | '已断电'
  mcuTempC: number
  batterySoc: number
  link: '在线' | '同步中' | '离线'
  irState: '待机' | '触发'
  oledFps: number
}

const SEED: LiveSnapshot = {
  levitation: '稳定',
  mcuTempC: 28.4,
  batterySoc: 78,
  link: '在线',
  irState: '待机',
  oledFps: 30,
}

/**
 * 演示遥测：每秒微小漂移，让数字看起来"活"；
 * powered=false 时温度/SOC 缓慢回到环境基线，状态切换为已断电/离线。
 */
export function useLiveStatus(powered: boolean): LiveSnapshot {
  const [snap, setSnap] = useState<LiveSnapshot>(SEED)

  useEffect(() => {
    const id = setInterval(() => {
      setSnap((cur) => {
        if (!powered) {
          return {
            levitation: '已断电',
            mcuTempC: clamp(cur.mcuTempC + (24 - cur.mcuTempC) * 0.08 + jitter(0.05), 23, 32),
            batterySoc: cur.batterySoc,
            link: '离线',
            irState: '待机',
            oledFps: 0,
          }
        }
        // 温度在 28.4 附近 ±0.4 漂移
        const newTemp = clamp(cur.mcuTempC + jitter(0.12), 27.6, 29.4)
        // SOC 每 10 秒掉 0.1，偶尔小回升（演示充电）
        const socDelta = Math.random() < 0.04 ? +0.2 : -0.02
        const newSoc = clamp(Number((cur.batterySoc + socDelta).toFixed(1)), 60, 100)
        // 链路偶尔同步
        const newLink: LiveSnapshot['link'] = Math.random() < 0.02 ? '同步中' : '在线'
        // IR 偶尔被触发：同步设全局标志给 OLED 画 ASCII 卫星动画用
        const triggered = Math.random() < 0.05
        const newIr: LiveSnapshot['irState'] = triggered ? '触发' : '待机'
        if (triggered) {
          ;(window as unknown as { __magOrbIrTrigger?: number }).__magOrbIrTrigger = Date.now()
        }
        // OLED fps 在 30 附近 ±2 抖动
        const newFps = clamp(Math.round(30 + jitter(2)), 28, 32)
        return {
          levitation: '稳定',
          mcuTempC: Number(newTemp.toFixed(1)),
          batterySoc: newSoc,
          link: newLink,
          irState: newIr,
          oledFps: newFps,
        }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [powered])

  return snap
}

function jitter(amp: number) {
  return (Math.random() - 0.5) * 2 * amp
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
