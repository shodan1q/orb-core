import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
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
          <span className="flex items-center gap-1.5 rounded-full bg-[#ff4d33]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#ff6b4d]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff4d33]" />
            LIVE
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
              enablePan={false}
              minDistance={2.4}
              maxDistance={7}
              maxPolarAngle={Math.PI * 0.85}
            />
          </Canvas>

          {/* 浮动 HUD */}
          <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] leading-relaxed text-zinc-300/90">
            <div>VIEW · ISO</div>
            <div className="mt-0.5 text-zinc-500">PARTS · 07</div>
          </div>
          <div className="pointer-events-none absolute right-4 top-4 text-right font-mono text-[10px] text-zinc-300/90">
            <div>MAG-ORB</div>
            <div className="mt-0.5 text-zinc-500">EXPL · {(explode * 100).toFixed(0)}%</div>
          </div>

          {/* 底部爆炸滑块 */}
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex justify-center">
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
          </div>
        </div>
      </div>
    </section>
  )
}
