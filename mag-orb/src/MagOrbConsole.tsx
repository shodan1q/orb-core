import { useEffect, useState } from 'react'
import logoSubtract from '../Subtract.svg'
import { OverviewBoard } from './components/OverviewBoard'
import { SpecStrip } from './components/SpecStrip'
import { SignalChainCard } from './components/SignalChainCard'
import { SettingsCard } from './components/SettingsCard'
import type { PartId } from './data/parts'
import type { AnimationFlags } from './components/Satellite3D'

const TABS = [
  { id: 'overview', label: '总览' },
  { id: 'signal', label: '信号链路' },
  { id: 'settings', label: '设置' },
] as const

type TabId = (typeof TABS)[number]['id']

const DEFAULT_FLAGS: AnimationFlags = {
  powered: true,
  bodyRotate: true,
  dishScan: true,
  dishScanSpeed: 1,
}

export function MagOrbConsole() {
  const [tab, setTab] = useState<TabId>('overview')
  const [selected, setSelected] = useState<PartId | null>(null)
  const [hovered, setHovered] = useState<PartId | null>(null)
  const [explode, setExplode] = useState(0)
  const [powered, setPowered] = useState(true)
  const [flags, setFlags] = useState<AnimationFlags>(DEFAULT_FLAGS)

  // 同步 powered 到全局（LEDMatrix / OLEDDisplay 通过 window 读取，避免 prop 穿透 PartMesh 接口）
  useEffect(() => {
    ;(window as unknown as { __magOrbPowered?: boolean }).__magOrbPowered = powered
  }, [powered])

  // 键盘快捷键：P/R/E/Q/1/2/3
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return
      switch (e.key.toLowerCase()) {
        case 'p':
          setPowered((v) => !v)
          break
        case '1':
          setTab('overview')
          break
        case '2':
          setTab('signal')
          break
        case '3':
          setTab('settings')
          break
        case 'e':
          setExplode((v) => Math.min(1, Math.round((v + 0.1) * 10) / 10))
          break
        case 'q':
          setExplode((v) => Math.max(0, Math.round((v - 0.1) * 10) / 10))
          break
        case 'r':
          // R 用于复位拆解（视图复位在 DisassemblyCard 内部按钮）
          setExplode(0)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // powered 关时，把 flags.powered 同步关掉
  const effectiveFlags: AnimationFlags = { ...flags, powered }

  return (
    <div className="flex flex-col bg-[#0a0a0c] text-zinc-200 min-h-svh">
      <header className="relative z-[10000] shrink-0 border-b border-zinc-800/50 bg-[#0a0a0c] px-5 py-3 md:px-8 md:py-4">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex min-w-0 items-stretch gap-0">
            <div className="flex w-11 shrink-0 items-center justify-center md:w-[3.25rem]">
              <img
                src={logoSubtract}
                alt="磁悬卫星摆件"
                width={124}
                height={103}
                className="h-9 w-auto max-w-[2.75rem] object-contain opacity-90 invert md:h-10 md:max-w-[3rem]"
                decoding="async"
              />
            </div>
            <div className="ml-3 flex min-h-[2.75rem] flex-col justify-center gap-1 border-l border-zinc-700/50 pl-4 md:ml-4 md:min-h-12 md:pl-5">
              <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.18em] text-zinc-500">
                Personal Satellite · Maglev Orb
              </p>
              <h1 className="text-lg font-semibold leading-snug tracking-tight text-white md:text-[1.375rem] md:leading-tight">
                磁悬卫星摆件控制台
              </h1>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3 md:max-w-none md:gap-6">
            <nav className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto overflow-y-hidden rounded-full border border-zinc-800/90 bg-zinc-900/40 p-1 backdrop-blur-sm [scrollbar-width:none] md:mx-0 [&::-webkit-scrollbar]:hidden">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
                    tab === item.id
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setTab('settings')}
                className={`rounded-xl border p-2.5 transition ${
                  tab === 'settings'
                    ? 'border-zinc-500 text-white'
                    : 'border-zinc-700/80 text-zinc-400 hover:border-zinc-600 hover:text-white'
                }`}
                aria-label="设置"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setPowered((p) => !p)}
                className={`rounded-xl border p-2.5 transition ${
                  powered
                    ? 'border-[#ff4d33]/40 text-[#ff6b4d] hover:border-[#ff4d33]/70'
                    : 'border-zinc-700/80 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                }`}
                aria-label={powered ? '电源（已开）' : '电源（已关）'}
                title={powered ? '点击断电' : '点击通电'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M12 2v10M18.4 6.6a9 9 0 11-12.77 0" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-5 overflow-visible px-5 pb-10 md:px-8 w-full">
        {tab === 'overview' && (
          <>
            <OverviewBoard
              selected={selected}
              hovered={hovered}
              explode={explode}
              onSelect={setSelected}
              onHover={setHovered}
              onExplode={setExplode}
              flags={effectiveFlags}
              powered={powered}
            />
            <SpecStrip />
          </>
        )}

        {tab === 'signal' && (
          <div className="pt-5 md:pt-7">
            <SignalChainCard />
          </div>
        )}

        {tab === 'settings' && (
          <div className="pt-5 md:pt-7">
            <SettingsCard
              powered={powered}
              flags={flags}
              explode={explode}
              onPower={setPowered}
              onFlags={setFlags}
              onExplode={setExplode}
            />
          </div>
        )}
      </main>
    </div>
  )
}
