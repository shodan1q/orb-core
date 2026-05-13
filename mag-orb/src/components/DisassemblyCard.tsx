import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { CornerMarks } from './CornerMarks'
import { Satellite3D, type AnimationFlags } from './Satellite3D'
import type { PartId } from '../data/parts'

type Props = {
  selected: PartId | null
  hovered: PartId | null
  explode: number
  onSelect: (id: PartId | null) => void
  onHover: (id: PartId | null) => void
  onExplode: (v: number) => void
  flags: AnimationFlags
}

export function DisassemblyCard({
  selected,
  hovered,
  explode,
  onSelect,
  onHover,
  onExplode,
  flags,
}: Props) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  return (
    <section className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#0d0d10]">
      <CornerMarks />
      <header className="relative z-10 flex items-start justify-between px-5 pb-2 pt-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Maglev Disassembly
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-200">
            3D 拆解可视化 · 拖拽 · 缩放
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 视图复位（小图标） */}
          <button
            type="button"
            onClick={() => controlsRef.current?.reset()}
            className="rounded-xl border border-zinc-700/80 p-2 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            aria-label="复位视角"
            title="复位视角 (R)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
          </button>
          {/* LIVE / OFF 状态徽章 */}
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              flags.powered ? 'bg-[#ff4d33]/15 text-[#ff6b4d]' : 'bg-zinc-800/60 text-zinc-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                flags.powered ? 'animate-pulse bg-[#ff4d33]' : 'bg-zinc-600'
              }`}
            />
            {flags.powered ? 'LIVE' : 'OFF'}
          </span>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 px-3 pb-3">
        <div className="absolute inset-x-3 bottom-3 top-0 overflow-hidden rounded-2xl border border-zinc-800/60 bg-black">
          <Canvas
            shadows
            camera={{ position: [2.8, 1.4, 3.4], fov: 34 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
          >
            <color attach="background" args={['#000000']} />
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[4, 6, 3]}
              intensity={1.2}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#aab0bd" />
            <Suspense fallback={null}>
              <Environment preset="warehouse" />
              <Satellite3D
                explode={explode}
                selected={selected}
                hovered={hovered}
                onSelect={onSelect}
                onHover={onHover}
                flags={flags}
              />
            </Suspense>
            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              minDistance={2.4}
              maxDistance={7}
              maxPolarAngle={Math.PI * 0.85}
            />
          </Canvas>

          {/* 浮动 HUD */}
          <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] leading-relaxed text-zinc-300/90">
            <div>VIEW · ISO</div>
            <div className="mt-0.5 text-zinc-500">PARTS · 09</div>
          </div>
          <div className="pointer-events-none absolute right-4 top-4 text-right font-mono text-[10px] text-zinc-300/90">
            <div>MAG-ORB</div>
            <div className="mt-0.5 text-zinc-500">EXPL · {(explode * 100).toFixed(0)}%</div>
          </div>

          {/* 断电时显示遮罩 */}
          {!flags.powered && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
              <div className="rounded-2xl border border-zinc-700/60 bg-black/70 px-6 py-4 text-center backdrop-blur-md">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                  POWER · OFF
                </p>
                <p className="mt-2 text-base font-semibold text-zinc-200">系统已断电</p>
                <p className="mt-1 text-[10px] text-zinc-500">按 P 或点击右上角电源按钮重启</p>
              </div>
            </div>
          )}

          {/* 底部爆炸滑块 + 预设 chip */}
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-center gap-2">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-zinc-700/60 bg-black/65 px-4 py-2 backdrop-blur-md">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                装配
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(explode * 100)}
                onChange={(e) => onExplode(Number(e.target.value) / 100)}
                className="explode-slider w-40 cursor-pointer md:w-48"
              />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                爆炸
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-[#ff6b4d]">
                {Math.round(explode * 100)
                  .toString()
                  .padStart(3, '0')}
                %
              </span>
            </div>
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-zinc-700/60 bg-black/65 px-2 py-1.5 font-mono text-[10px] backdrop-blur-md">
              {[
                { l: '0', v: 0 },
                { l: '50', v: 0.5 },
                { l: '100', v: 1 },
              ].map((p) => (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => onExplode(p.v)}
                  className={`rounded-full px-2.5 py-1 tabular-nums transition ${
                    Math.abs(explode - p.v) < 0.03
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {p.l}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
