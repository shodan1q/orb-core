import { useState } from 'react'
import logoSubtract from '../Subtract.svg'
import { AttitudeControl } from './components/AttitudeControl'
import { GlobalTelemetryStrip } from './components/GlobalTelemetryStrip'
import { LiveFeed } from './components/LiveFeed'
import { OrbitTracker } from './components/OrbitTracker'
import { useSimulatedTelemetry } from './hooks/useSimulatedTelemetry'
import { AttitudePage } from './pages/AttitudePage'
import { EcoSavingsPage } from './pages/EcoSavingsPage'
import { MediaPage } from './pages/MediaPage'
import { SatelliteDataPage } from './pages/SatelliteDataPage'

const TABS = [
  { id: 'overview', label: '我的卫星' },
  { id: 'satellite', label: '卫星数据' },
  { id: 'attitude', label: '姿态控制' },
  { id: 'media', label: '太空相机' },
  { id: 'eco', label: '节能与环保' },
] as const

type TabId = (typeof TABS)[number]['id']

export function SatelliteConsole() {
  const { orbit, trail, camera, health, eco, tick } = useSimulatedTelemetry()
  const [tab, setTab] = useState<TabId>('overview')

  return (
    <div
      className={`flex flex-col bg-[#0a0a0c] text-zinc-200 ${
        tab === 'attitude' || tab === 'eco' || tab === 'media'
          ? 'h-dvh max-h-dvh overflow-hidden'
          : 'min-h-svh'
      }`}
    >
      <header className="relative z-[10000] shrink-0 border-b border-zinc-800/50 bg-[#0a0a0c] px-5 py-3 md:px-8 md:py-4">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex min-w-0 items-stretch gap-0">
            <div className="flex w-11 shrink-0 items-center justify-center md:w-[3.25rem]">
              <img
                src={logoSubtract}
                alt="喂！星"
                width={124}
                height={103}
                className="h-9 w-auto max-w-[2.75rem] object-contain opacity-90 invert md:h-10 md:max-w-[3rem]"
                decoding="async"
              />
            </div>
            <div className="ml-3 flex min-h-[2.75rem] flex-col justify-center gap-1 border-l border-zinc-700/50 pl-4 md:ml-4 md:min-h-12 md:pl-5">
              <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.18em] text-zinc-500">
                Personal Satellite
              </p>
              <h1 className="text-lg font-semibold leading-snug tracking-tight text-white md:text-[1.375rem] md:leading-tight">
                个人卫星控制台
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
                className="rounded-xl border border-zinc-700/80 p-2.5 text-zinc-400 transition hover:border-zinc-600 hover:text-white"
                aria-label="设置"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </button>
              <button
                type="button"
                className="rounded-xl border border-zinc-700/80 p-2.5 text-zinc-400 transition hover:border-[#ff4d33]/40 hover:text-[#ff6b4d]"
                aria-label="电源"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M12 2v10M18.4 6.6a9 9 0 11-12.77 0" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main
        className={
          tab === 'attitude' || tab === 'eco'
            ? 'flex min-h-0 w-full flex-1 flex-col overflow-hidden p-0'
            : tab === 'media'
              ? 'flex min-h-0 w-full flex-1 flex-col overflow-hidden p-0'
              : tab === 'satellite'
                ? 'mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-visible px-5 pb-10 md:px-8'
                : 'mx-auto max-w-[1600px] space-y-5 overflow-visible px-5 pb-10 md:px-8'
        }
      >
        {tab === 'overview' ? (
          <>
            <div className="relative z-[1] grid min-h-[420px] gap-5 pt-5 md:pt-7 lg:grid-cols-12 lg:grid-rows-1">
              <div className="lg:col-span-5 lg:min-h-[420px]">
                <OrbitTracker
                  lat={orbit.lat}
                  lng={orbit.lng}
                  trail={trail}
                  altitudeKm={orbit.altitudeKm}
                  speedKms={orbit.speedKms}
                />
              </div>
              <div className="lg:col-span-4 lg:min-h-[420px]">
                <LiveFeed camera={camera} />
              </div>
              <div className="lg:col-span-3 lg:min-h-[420px]">
                <AttitudeControl />
              </div>
            </div>
            <GlobalTelemetryStrip health={health} orbit={orbit} onNavigateTab={setTab} />
          </>
        ) : null}

        {tab === 'satellite' ? <SatelliteDataPage health={health} /> : null}
        {tab === 'attitude' ? (
          <AttitudePage
            orbit={orbit}
            trail={trail}
            health={health}
            camera={camera}
            tick={tick}
          />
        ) : null}
        {tab === 'media' ? <MediaPage camera={camera} /> : null}
        {tab === 'eco' ? (
          <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
            <EcoSavingsPage eco={eco} tick={tick} health={health} />
          </div>
        ) : null}
      </main>
    </div>
  )
}
