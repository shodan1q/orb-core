'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const PovScene = dynamic(() => import('@/components/three/PovScene'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin mx-auto mb-4" />
        <p className="text-xs text-gray-500 font-mono tracking-widest">
          BOOTING ORB-CAM...
        </p>
      </div>
    </div>
  ),
});

export type PovTarget = 'earth' | 'moon' | 'sun' | 'deepspace';

const TARGETS: { key: PovTarget; label: string; name: string; color: string }[] = [
  { key: 'earth', label: 'EARTH', name: '地球', color: '#22d3ee' },
  { key: 'moon', label: 'MOON', name: '月球', color: '#d4d4d8' },
  { key: 'sun', label: 'SUN', name: '太阳', color: '#ffd67a' },
  { key: 'deepspace', label: 'DEEP SPACE', name: '深空', color: '#a78bfa' },
];

export default function PovPage() {
  const router = useRouter();
  const [target, setTarget] = useState<PovTarget>('earth');
  const [frame, setFrame] = useState(0);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => f + 1);
      setClock(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ESC 键返回
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = () => {
    // 如果有 history 就回退, 否则回主页
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const current = TARGETS.find((t) => t.key === target)!;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black text-white">
      <PovScene target={target} />

      {/* ── 顶部 HUD ── */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onClick={handleBack}
              className="group flex items-center gap-2 px-3 py-2 border border-cyan-500/40 bg-black/50 backdrop-blur-sm hover:border-cyan-300 hover:bg-cyan-500/15 transition-colors"
              style={{ boxShadow: '0 0 18px rgba(34,211,238,0.12)' }}
              title="返回 (ESC)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="text-cyan-300 group-hover:text-cyan-100"
              >
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-left leading-tight">
                <div className="text-[10px] font-mono text-cyan-300 group-hover:text-cyan-100 tracking-widest">
                  BACK
                </div>
                <div className="text-[8px] font-mono text-gray-500">返回 · ESC</div>
              </div>
            </button>
            <div className="leading-tight">
              <div className="text-[11px] font-mono text-cyan-300 tracking-widest">
                ORB-CAM POV MODE
              </div>
              <div className="text-[9px] font-mono text-gray-500 tracking-wider">
                第一视角 · FIRST PERSON
              </div>
            </div>
          </div>

          <div className="text-right leading-tight font-mono">
            <div className="text-[10px] text-cyan-300 tracking-widest">
              TARGET · <span style={{ color: current.color }}>{current.label}</span>
            </div>
            <div className="text-[9px] text-gray-500">
              {clock} UTC · FRAME #{String(frame).padStart(5, '0')}
            </div>
          </div>
        </div>
      </div>

      {/* ── 中央瞄准十字 ── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        <div className="relative" style={{ width: 220, height: 220 }}>
          {/* 外圈虚线 */}
          <div
            className="absolute inset-0 rounded-full border border-dashed"
            style={{ borderColor: `${current.color}40` }}
          />
          {/* 四角刻度 */}
          {[0, 90, 180, 270].map((deg) => (
            <div
              key={deg}
              className="absolute top-1/2 left-1/2 w-4 h-px"
              style={{
                background: current.color,
                transform: `rotate(${deg}deg) translate(98px, 0)`,
                transformOrigin: 'left center',
                opacity: 0.7,
              }}
            />
          ))}
          {/* 中心十字 */}
          <div
            className="absolute top-1/2 left-1/2 w-12 h-px -translate-x-1/2 -translate-y-1/2"
            style={{ background: current.color, opacity: 0.4 }}
          />
          <div
            className="absolute top-1/2 left-1/2 w-px h-12 -translate-x-1/2 -translate-y-1/2"
            style={{ background: current.color, opacity: 0.4 }}
          />
          {/* 中心圆点 */}
          <div
            className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{ background: current.color, boxShadow: `0 0 6px ${current.color}` }}
          />
          {/* 目标名 */}
          <div
            className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 text-[10px] font-mono tracking-widest whitespace-nowrap"
            style={{ color: current.color, opacity: 0.9 }}
          >
            ▸ {current.name.toUpperCase()} · {current.name}
          </div>
        </div>
      </div>

      {/* ── 左下：遥测信息 ── */}
      <div className="absolute bottom-5 left-5 z-10 pointer-events-none">
        <div
          className="text-[9px] font-mono leading-relaxed p-3 border"
          style={{
            color: 'rgba(34,211,238,0.8)',
            borderColor: 'rgba(34,211,238,0.2)',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="text-cyan-300 tracking-widest mb-1">▸ ORB-CAM v2.1</div>
          <div>LENS: 50mm f/2.8 · ISO 200</div>
          <div>SHUTTER: 1/125s · RAW 16-bit</div>
          <div>SENSOR TEMP: 2.4 °C</div>
          <div className="text-gray-500 mt-1">GIMBAL: STABILIZED</div>
        </div>
      </div>

      {/* ── 右下：姿态/角度指示器 ── */}
      <div className="absolute bottom-5 right-5 z-10 pointer-events-none">
        <div
          className="text-[9px] font-mono leading-relaxed p-3 border text-right"
          style={{
            color: 'rgba(34,211,238,0.8)',
            borderColor: 'rgba(34,211,238,0.2)',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="text-cyan-300 tracking-widest mb-1">ATTITUDE ◂</div>
          <div>PITCH: {(Math.sin(frame * 0.1) * 3).toFixed(1)}°</div>
          <div>YAW:   {(Math.cos(frame * 0.08) * 5).toFixed(1)}°</div>
          <div>ROLL:  {(Math.sin(frame * 0.05) * 1.5).toFixed(1)}°</div>
          <div className="text-gray-500 mt-1">STABILITY: 99.8%</div>
        </div>
      </div>

      {/* ── 底部中央：目标切换 ── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {TARGETS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTarget(t.key)}
            className="group text-[10px] font-mono px-3 py-1.5 border transition-all"
            style={{
              color: target === t.key ? t.color : 'rgba(160,180,200,0.7)',
              borderColor:
                target === t.key ? t.color : 'rgba(255,255,255,0.15)',
              background:
                target === t.key
                  ? `${t.color}1a`
                  : 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              boxShadow:
                target === t.key ? `0 0 12px ${t.color}40` : 'none',
            }}
          >
            <div className="tracking-widest">{t.label}</div>
            <div className="text-[8px] opacity-60">{t.name}</div>
          </button>
        ))}
      </div>

      {/* ── 四角 HUD 标记 ── */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-400/40" />
        <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-400/40" />
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-400/40" />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-400/40" />
      </div>

      {/* ── 扫描线 ── */}
      <motion.div
        className="absolute left-0 right-0 h-px pointer-events-none z-[5]"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(34,211,238,0.2) 20%, rgba(34,211,238,0.5) 50%, rgba(34,211,238,0.2) 80%, transparent)',
        }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />

      {/* ── 切换目标时的短暂提示 ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={target}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
        >
          <div
            className="text-xs font-mono tracking-widest px-4 py-1 border"
            style={{
              color: current.color,
              borderColor: `${current.color}60`,
              background: `${current.color}10`,
              backdropFilter: 'blur(4px)',
            }}
          >
            ▸ TRACKING LOCKED · {current.name}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 细粒噪点 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay z-[8]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </main>
  );
}
