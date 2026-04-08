'use client';

/* ==========================================================================
 * LaunchOverlay.tsx
 * 开场动画外壳: 承载 IntroSequence (Three.js 4 幕) + 顶部 HUD + 跳过按钮 +
 * 结束渐隐
 * ======================================================================== */

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { useOrbStore } from '@/stores/useOrbStore';

// IntroSequence 里有 document.createElement, 必须仅在客户端加载
const IntroSequence = dynamic(
  () => import('@/components/three/IntroSequence'),
  { ssr: false }
);

const SCENE_LABELS = [
  { start: 0, end: 2.0, en: 'SATELLITE', zh: '卫星特写' },
  { start: 2.0, end: 4.4, en: 'ORBIT', zh: '轨道回望' },
];

export default function LaunchOverlay() {
  const showLaunch = useOrbStore((s) => s.showLaunch);
  const setShowLaunch = useOrbStore((s) => s.setShowLaunch);
  const setPhase = useOrbStore((s) => s.setPhase);

  const [fading, setFading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const dismiss = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setShowLaunch(false);
      setPhase('orbiting');
    }, 650);
  }, [setShowLaunch, setPhase]);

  // HUD 计时
  useEffect(() => {
    if (!showLaunch) return;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      setElapsed((performance.now() - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showLaunch]);

  if (!showLaunch) return null;

  const currentScene = SCENE_LABELS.find(
    (s) => elapsed >= s.start && elapsed < s.end
  );
  const progress = Math.min(1, elapsed / 4.4);

  return (
    <AnimatePresence>
      {!fading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="fixed inset-0 z-50 overflow-hidden bg-black"
        >
          {/* Three.js 4-scene canvas */}
          <div className="absolute inset-0">
            <IntroSequence onDone={dismiss} />
          </div>

          {/* Top HUD */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="absolute top-5 left-5 right-5 z-10 flex items-start justify-between font-mono text-xs text-cyan-300 pointer-events-none"
          >
            <div>
              <div className="text-[10px] text-cyan-500 tracking-[0.3em]">
                ORB CORE / INTRO SEQUENCE
              </div>
              <div className="text-[9px] text-gray-500 mt-1 tracking-widest">
                CINEMATIC BOOT v2.0
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-cyan-400 tracking-widest">
                T+ {elapsed.toFixed(2)}s
              </div>
              <div className="text-[9px] text-gray-500 mt-1 tracking-widest">
                {currentScene
                  ? `${currentScene.en} · ${currentScene.zh}`
                  : 'STANDBY'}
              </div>
            </div>
          </motion.div>

          {/* Bottom progress bar + chapter markers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="absolute bottom-6 left-5 right-5 z-10 font-mono text-[9px] text-gray-500 pointer-events-none"
          >
            <div className="flex justify-between mb-1">
              {SCENE_LABELS.map((s, i) => {
                const active = elapsed >= s.start;
                const current = currentScene && currentScene.en === s.en;
                return (
                  <div
                    key={i}
                    className={`tracking-widest transition-colors ${
                      current
                        ? 'text-cyan-300'
                        : active
                          ? 'text-cyan-600'
                          : 'text-gray-700'
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')} · {s.en}
                  </div>
                );
              })}
            </div>
            <div className="relative h-[2px] bg-cyan-900/40">
              <motion.div
                className="absolute inset-y-0 left-0 bg-cyan-400"
                style={{ width: `${progress * 100}%` }}
                animate={{
                  boxShadow: [
                    '0 0 6px rgba(34,211,238,0.5)',
                    '0 0 12px rgba(34,211,238,0.9)',
                    '0 0 6px rgba(34,211,238,0.5)',
                  ],
                }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
            </div>
          </motion.div>

          {/* Skip button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            onClick={dismiss}
            className="absolute top-5 right-5 z-20 px-3 py-1.5 border border-cyan-500/30 bg-black/40 backdrop-blur-sm text-[10px] font-mono text-cyan-300 tracking-widest hover:border-cyan-400 hover:bg-cyan-500/10 transition-colors"
            style={{ marginTop: '48px' }}
          >
            SKIP ›
          </motion.button>

          {/* Subtle scanlines overlay */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-20"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 3px)',
            }}
          />
          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.7) 100%)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
