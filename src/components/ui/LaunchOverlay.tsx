'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbStore } from '@/stores/useOrbStore';

// ---------------------------------------------------------------------------
// Seeded pseudo-random utility (LCG) — keeps positions deterministic
// ---------------------------------------------------------------------------
function makeSeededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------
// Glitch character set
// ---------------------------------------------------------------------------
const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?<>[]{}|/\\';
const TITLE_TARGET = '星核  ORB CORE';

// ---------------------------------------------------------------------------
// Boot log messages
// ---------------------------------------------------------------------------
const BOOT_LINES = [
  '[SYS]  Initializing primary mission computer...',
  '[MEM]  RAM check: 131072 KB  ...OK',
  '[BUS]  CAN bus arbitration nominal',
  '[PWR]  Solar array regulators online',
  '[GPS]  TLE epoch loaded  — epoch 2026.095',
  '[ATT]  Attitude determination system armed',
  '[COM]  S-band uplink locked  — 2.025 GHz',
  '[COM]  X-band downlink active — 8.400 GHz',
  '[TLM]  Telemetry frame rate: 32 kbps',
  '[NAV]  Orbit insertion burn: T+00:04:22',
  '[SYS]  Watchdog timer armed',
  '[PLD]  Payload bay pressurized',
  '[GYRO] IMU calibration: 3-axis nominal',
  '[PROP] Propellant fill: 100%',
  '[SAFE] Range safety armed',
  '[SYS]  All systems GO for launch',
];

// ---------------------------------------------------------------------------
// Telemetry channels
// ---------------------------------------------------------------------------
const TELEMETRY = [
  { label: 'ALTITUDE', unit: 'km' },
  { label: 'VELOCITY', unit: 'm/s' },
  { label: 'DOWNRANGE', unit: 'km' },
  { label: 'THROTTLE', unit: '%' },
];

// ---------------------------------------------------------------------------
// Wormhole phase durations (ms)
// ---------------------------------------------------------------------------
const WH = {
  voidEnd: 500,       // Phase 1 ends — tiny point appears
  vortexStart: 500,   // Phase 2 begins
  vortexEnd: 2000,    // Phase 2 ends
  tunnelStart: 2000,  // Phase 3 begins
  tunnelEnd: 3500,    // Phase 3 ends
  flashStart: 3500,   // Phase 4 begins
  flashEnd: 4000,     // Phase 4 ends — boot sequence begins
};

// ---------------------------------------------------------------------------
// Timeline phases (ms) — all original timings offset by +4000ms
// ---------------------------------------------------------------------------
const T = {
  bootStart:     4300,
  bootEnd:       6400,
  titleStart:    6700,
  glitchDone:    8200,
  subtitleIn:    8400,
  launchAnnounce: 9200,
  liftoff:       9800,
  warp:          9900,
  flash:         9850,
  stageSep:     10700,
  deploy:       11400,
  particleBurst: 11400,
  online:       12100,
  fadeOut:      13200,
  done:         14000,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LaunchOverlay() {
  const showLaunch = useOrbStore((s) => s.showLaunch);
  const setShowLaunch = useOrbStore((s) => s.setShowLaunch);
  const setPhase = useOrbStore((s) => s.setPhase);

  // Visibility
  const [visible, setVisible] = useState(true);

  // ---- Wormhole phases ----
  const [whPhase, setWhPhase] = useState<'void' | 'vortex' | 'tunnel' | 'flash' | 'done'>('void');
  const [shakeX, setShakeX] = useState(0);
  const [shakeY, setShakeY] = useState(0);

  // Boot log
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [bootDone, setBootDone] = useState(false);

  // Title glitch
  const [titleChars, setTitleChars] = useState<string[]>(Array(TITLE_TARGET.length).fill(' '));
  const [titleVisible, setTitleVisible] = useState(false);

  // Sub-phases
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [launchVisible, setLaunchVisible] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [liftoff, setLiftoff] = useState(false);
  const [warp, setWarp] = useState(false);
  const [flash, setFlash] = useState(false);
  const [statusLine, setStatusLine] = useState<{ text: string; color: string } | null>(null);
  const [particleBurst, setParticleBurst] = useState(false);
  const [online, setOnline] = useState(false);
  const [fading, setFading] = useState(false);

  // Telemetry values
  const [telemetry, setTelemetry] = useState([0, 0, 0, 0]);

  // Progress (0-100)
  const [progress, setProgress] = useState(0);

  // ---------------------------------------------------------------------------
  // Deterministic data
  // ---------------------------------------------------------------------------
  const stars = useMemo(() => {
    const r = makeSeededRandom(42);
    return Array.from({ length: 120 }, (_, i) => ({
      id: i,
      left: r() * 100,
      top: r() * 100,
      size: 0.5 + r() * 1.5,
      brightness: 0.3 + r() * 0.7,
      dur: 2 + r() * 4,
      delay: r() * 3,
    }));
  }, []);

  // Inward-streaking vortex stars (pulled toward center)
  const vortexStars = useMemo(() => {
    const r = makeSeededRandom(200);
    return Array.from({ length: 100 }, (_, i) => {
      // Start at a random edge position
      const angle = r() * Math.PI * 2;
      const startRadius = 55 + r() * 45; // 55–100% from center
      const startX = 50 + Math.cos(angle) * startRadius;
      const startY = 50 + Math.sin(angle) * startRadius;
      return {
        id: i,
        startX,
        startY,
        angle: (angle * 180) / Math.PI,
        length: 30 + r() * 80,
        dur: 0.6 + r() * 0.8,
        delay: r() * 1.0,
        opacity: 0.4 + r() * 0.6,
        color: r() > 0.6 ? '#ffffff' : r() > 0.3 ? '#00d4ff' : '#8800ff',
      };
    });
  }, []);

  // Tunnel speed lines (phase 3 — radial from edges toward center)
  const tunnelLines = useMemo(() => {
    const r = makeSeededRandom(333);
    return Array.from({ length: 64 }, (_, i) => {
      const angle = (i / 64) * 360 + r() * 5;
      const startRadius = 50 + r() * 55;
      const rad = (angle * Math.PI) / 180;
      const startX = 50 + Math.cos(rad) * startRadius;
      const startY = 50 + Math.sin(rad) * startRadius;
      return {
        id: i,
        startX,
        startY,
        angle,
        length: 40 + r() * 120,
        width: 1 + r() * 1.5,
        dur: 0.3 + r() * 0.4,
        delay: r() * 0.5,
        opacity: 0.3 + r() * 0.6,
      };
    });
  }, []);

  // Vortex concentric rings (phase 2 — 5 rings, different hues)
  const vortexRings = useMemo(() => [
    { id: 0, color: '#ffffff',  delay: 0,    dur: 1.5, rotDir: 1,  scale: 0.08 },
    { id: 1, color: '#aaddff',  delay: 0.08, dur: 1.8, rotDir: -1, scale: 0.18 },
    { id: 2, color: '#00d4ff',  delay: 0.16, dur: 2.1, rotDir: 1,  scale: 0.30 },
    { id: 3, color: '#0066ff',  delay: 0.24, dur: 1.6, rotDir: -1, scale: 0.44 },
    { id: 4, color: '#8800ff',  delay: 0.32, dur: 2.4, rotDir: 1,  scale: 0.60 },
    { id: 5, color: '#440088',  delay: 0.40, dur: 2.0, rotDir: -1, scale: 0.78 },
  ], []);

  const warpStars = useMemo(() => {
    const r = makeSeededRandom(99);
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: 20 + r() * 60,
      top: 10 + r() * 80,
      angle: (r() - 0.5) * 60,
      length: 60 + r() * 140,
      delay: r() * 0.4,
      dur: 0.4 + r() * 0.4,
    }));
  }, []);

  const particles = useMemo(() => {
    const r = makeSeededRandom(77);
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      angle: r() * 360,
      dist: 60 + r() * 120,
      size: 2 + r() * 4,
      dur: 0.6 + r() * 0.8,
      color: r() > 0.5 ? '#00d4ff' : r() > 0.25 ? '#ffffff' : '#ff8c00',
    }));
  }, []);

  const soundBars = useMemo(() => {
    const r = makeSeededRandom(13);
    return Array.from({ length: 48 }, (_, i) => ({
      id: i,
      baseH: 4 + r() * 28,
      dur: 0.3 + r() * 0.5,
      delay: r() * 0.4,
    }));
  }, []);

  const scanLineCount = 18;

  // ---------------------------------------------------------------------------
  // Glitch resolve animation
  // ---------------------------------------------------------------------------
  const runGlitch = useCallback(() => {
    const total = TITLE_TARGET.length;
    const r = makeSeededRandom(55);
    let frame = 0;
    const totalFrames = 28;
    const id = setInterval(() => {
      frame++;
      setTitleChars((prev) =>
        prev.map((_, idx) => {
          const resolved = frame / totalFrames > idx / total + 0.1;
          if (resolved) return TITLE_TARGET[idx];
          return GLITCH_CHARS[Math.floor(r() * GLITCH_CHARS.length)];
        })
      );
      if (frame >= totalFrames) clearInterval(id);
    }, 55);
    return id;
  }, []);

  // ---------------------------------------------------------------------------
  // Dismiss helper
  // ---------------------------------------------------------------------------
  const dismiss = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      setShowLaunch(false);
      setPhase('orbiting');
    }, 800);
  }, [setShowLaunch, setPhase]);

  // ---------------------------------------------------------------------------
  // Master timeline
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!showLaunch) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const t = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const intervals: ReturnType<typeof setInterval>[] = [];

    // ---- Wormhole sequence ----
    // Phase 1: void (already default state 'void')
    t(WH.vortexStart, () => setWhPhase('vortex'));
    t(WH.tunnelStart, () => setWhPhase('tunnel'));

    // Screen shake during tunnel rush (Phase 3)
    const shakeR = makeSeededRandom(7);
    const shakeInterval = setInterval(() => {
      setShakeX((shakeR() - 0.5) * 6);
      setShakeY((shakeR() - 0.5) * 6);
    }, 60);
    // Only run shake during Phase 3
    t(WH.tunnelStart, () => intervals.push(shakeInterval));
    t(WH.flashStart, () => {
      clearInterval(shakeInterval);
      setShakeX(0);
      setShakeY(0);
    });

    t(WH.flashStart, () => setWhPhase('flash'));
    t(WH.flashEnd, () => setWhPhase('done'));

    // ---- Boot log: stream lines in over ~2s ----
    const lineInterval = Math.floor((T.bootEnd - T.bootStart) / BOOT_LINES.length);
    BOOT_LINES.forEach((line, i) => {
      t(T.bootStart + i * lineInterval, () =>
        setBootLines((prev) => [...prev, line])
      );
    });
    t(T.bootEnd + 100, () => setBootDone(true));

    // ---- Title glitch ----
    t(T.titleStart, () => {
      setTitleVisible(true);
      const id = runGlitch();
      timers.push(id as unknown as ReturnType<typeof setTimeout>);
    });

    // ---- Subtitle ----
    t(T.subtitleIn, () => setSubtitleVisible(true));

    // ---- Launch announce ----
    t(T.launchAnnounce, () => setLaunchVisible(true));

    // ---- Countdown ----
    // Countdown removed — jump straight to liftoff
    t(T.liftoff, () => {
      setCountdown(null);
      setLiftoff(true);
    });

    // ---- Flash + Warp ----
    t(T.flash, () => {
      setFlash(true);
      setTimeout(() => setFlash(false), 350);
    });
    t(T.warp, () => {
      setWarp(true);
      setTimeout(() => setWarp(false), 900);
    });

    // ---- Telemetry ticker (starts at liftoff) ----
    t(T.liftoff, () => {
      const telId = setInterval(() => {
        setTelemetry((prev) => {
          const r = makeSeededRandom(Date.now() % 99999);
          return [
            prev[0] + 0.8 + r() * 0.4,
            Math.min(7800, prev[1] + 18 + r() * 8),
            prev[2] + 0.6 + r() * 0.3,
            Math.round(85 + r() * 10),
          ];
        });
      }, 80);
      intervals.push(telId);
      t(T.online - T.liftoff + 800, () => clearInterval(telId));
    });

    // ---- Status lines ----
    t(T.stageSep, () =>
      setStatusLine({ text: 'STAGE SEPARATION  COMPLETE', color: '#a3e635' })
    );
    t(T.deploy, () =>
      setStatusLine({ text: 'SOLAR ARRAYS  DEPLOYED', color: '#a3e635' })
    );

    // ---- Particle burst ----
    t(T.particleBurst, () => {
      setParticleBurst(true);
      setTimeout(() => setParticleBurst(false), 1200);
    });

    // ---- Online ----
    t(T.online, () => {
      setOnline(true);
      setStatusLine({ text: 'ORB CORE  ONLINE', color: '#00d4ff' });
    });

    // ---- Progress bar ----
    const progInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 0.55, 100));
    }, 60);
    intervals.push(progInterval);

    // ---- Fade out ----
    t(T.fadeOut, () => setFading(true));
    t(T.done, () => {
      setVisible(false);
      setShowLaunch(false);
      setPhase('orbiting');
    });

    return () => {
      timers.forEach((id) => clearTimeout(id));
      intervals.forEach((id) => clearInterval(id));
    };
  }, [showLaunch, setShowLaunch, setPhase, runGlitch]);

  if (!showLaunch) return null;

  const inWormhole = whPhase === 'void' || whPhase === 'vortex' || whPhase === 'tunnel' || whPhase === 'flash';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{
            opacity: fading ? 0 : 1,
            x: inWormhole ? shakeX : 0,
            y: inWormhole ? shakeY : 0,
          }}
          transition={{ duration: fading ? 0.8 : 0.06 }}
          className="fixed inset-0 z-50 overflow-hidden font-mono select-none"
          style={{
            background: '#00000f',
            perspective: '800px',
          }}
        >
          {/* ----------------------------------------------------------------
              WORMHOLE SEQUENCE (Phases 1-4, 0-4s)
          ---------------------------------------------------------------- */}
          <AnimatePresence>
            {(whPhase === 'void' || whPhase === 'vortex' || whPhase === 'tunnel' || whPhase === 'flash') && (
              <motion.div
                key="wormhole-container"
                className="absolute inset-0 z-30 overflow-hidden flex items-center justify-center"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{ background: '#000000' }}
              >
                {/* Phase 1 + 2 + 3 + 4 — deep space background */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      whPhase === 'tunnel' || whPhase === 'flash'
                        ? 'radial-gradient(ellipse at center, #0a0020 0%, #04000f 40%, #000000 100%)'
                        : '#000000',
                  }}
                />

                {/* ---- Phase 1: seed point at center ---- */}
                <AnimatePresence>
                  {(whPhase === 'void' || whPhase === 'vortex' || whPhase === 'tunnel') && (
                    <motion.div
                      key="seed-point"
                      className="absolute"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: '0 0 12px 4px #ffffff, 0 0 30px 8px rgba(0,212,255,0.6)',
                        zIndex: 10,
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: [0, 1.6, 1] }}
                      transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
                    />
                  )}
                </AnimatePresence>

                {/* Shockwave ring from seed point (Phase 1) */}
                <AnimatePresence>
                  {whPhase !== 'void' && (
                    <motion.div
                      key="shockwave"
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        border: '1px solid rgba(0,212,255,0.7)',
                        boxShadow: '0 0 8px rgba(0,212,255,0.4)',
                      }}
                      initial={{ width: 8, height: 8, opacity: 0.9 }}
                      animate={{ width: 160, height: 160, opacity: 0 }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                    />
                  )}
                </AnimatePresence>

                {/* ---- Phase 2: Concentric expanding rings ---- */}
                <AnimatePresence>
                  {(whPhase === 'vortex' || whPhase === 'tunnel') && (
                    <motion.div
                      key="vortex-rings"
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {vortexRings.map((ring) => (
                        <motion.div
                          key={ring.id}
                          className="absolute rounded-full"
                          style={{
                            border: `1px solid ${ring.color}`,
                            boxShadow: `0 0 8px ${ring.color}44, inset 0 0 8px ${ring.color}22`,
                            left: '50%',
                            top: '50%',
                          }}
                          initial={{
                            width: 0,
                            height: 0,
                            x: '-50%',
                            y: '-50%',
                            opacity: 0,
                            rotate: 0,
                          }}
                          animate={{
                            width: `${ring.scale * 100}vmin`,
                            height: `${ring.scale * 100}vmin`,
                            x: '-50%',
                            y: '-50%',
                            opacity: [0, 0.9, 0.7],
                            rotate: ring.rotDir * 360 * 3,
                          }}
                          transition={{
                            width: { duration: ring.dur, delay: ring.delay, ease: 'easeOut' },
                            height: { duration: ring.dur, delay: ring.delay, ease: 'easeOut' },
                            opacity: { duration: ring.dur, delay: ring.delay },
                            rotate: {
                              duration: ring.dur * 2,
                              delay: ring.delay,
                              ease: 'linear',
                              repeat: Infinity,
                            },
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Phase 2: Inward-streaking stars (pulled toward center) */}
                <AnimatePresence>
                  {(whPhase === 'vortex' || whPhase === 'tunnel') && (
                    <motion.div
                      key="vortex-stars"
                      className="absolute inset-0 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {vortexStars.map((vs) => (
                        <motion.div
                          key={vs.id}
                          className="absolute"
                          style={{
                            left: `${vs.startX}%`,
                            top: `${vs.startY}%`,
                            width: 1.5,
                            height: vs.length,
                            transformOrigin: 'top center',
                            // Rotate so the streak points toward center (50%, 50%)
                            rotate: vs.angle + 180,
                            background: `linear-gradient(to bottom, transparent, ${vs.color}, transparent)`,
                            opacity: 0,
                          }}
                          animate={{
                            opacity: [0, vs.opacity, 0],
                            scaleY: [0.3, 1, 0.1],
                            x: [0, -(vs.startX - 50) * 1.8],
                            y: [0, -(vs.startY - 50) * 1.8],
                          }}
                          transition={{
                            duration: vs.dur,
                            delay: vs.delay,
                            repeat: Infinity,
                            repeatDelay: vs.delay * 0.3,
                            ease: 'easeIn',
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ---- Phase 3: Tunnel speed lines (radial, from edges inward) ---- */}
                <AnimatePresence>
                  {whPhase === 'tunnel' && (
                    <motion.div
                      key="tunnel-lines"
                      className="absolute inset-0 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {tunnelLines.map((tl) => (
                        <motion.div
                          key={tl.id}
                          className="absolute"
                          style={{
                            left: `${tl.startX}%`,
                            top: `${tl.startY}%`,
                            width: tl.width,
                            height: tl.length,
                            transformOrigin: 'top center',
                            rotate: tl.angle + 180,
                            background:
                              'linear-gradient(to bottom, transparent, rgba(0,180,255,0.8), rgba(136,0,255,0.5), transparent)',
                          }}
                          animate={{
                            opacity: [0, tl.opacity, 0],
                            scaleY: [0, 1.2, 0],
                            x: [0, -(tl.startX - 50) * 2.0],
                            y: [0, -(tl.startY - 50) * 2.0],
                          }}
                          transition={{
                            duration: tl.dur,
                            delay: tl.delay,
                            repeat: Infinity,
                            repeatDelay: 0.05,
                            ease: 'easeIn',
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Phase 3: Growing vortex center glow */}
                <AnimatePresence>
                  {whPhase === 'tunnel' && (
                    <motion.div
                      key="tunnel-glow"
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        background:
                          'radial-gradient(ellipse at center, #ffffff 0%, #00aaff 20%, #0044ff 45%, #8800ff 70%, transparent 100%)',
                        filter: 'blur(2px)',
                      }}
                      initial={{ width: 20, height: 20, opacity: 0.4 }}
                      animate={{
                        width: [20, 80, 140, 220],
                        height: [20, 80, 140, 220],
                        opacity: [0.4, 0.7, 0.9, 1],
                      }}
                      transition={{ duration: 1.5, ease: 'easeIn' }}
                    />
                  )}
                </AnimatePresence>

                {/* Phase 3: Spinning vortex disc */}
                <AnimatePresence>
                  {whPhase === 'tunnel' && (
                    <motion.div
                      key="vortex-disc"
                      className="absolute pointer-events-none"
                      style={{
                        left: '50%',
                        top: '50%',
                      }}
                      initial={{ width: 60, height: 60, x: '-50%', y: '-50%', opacity: 0, rotate: 0 }}
                      animate={{
                        width: [60, 160, 280],
                        height: [60, 160, 280],
                        x: '-50%',
                        y: '-50%',
                        opacity: [0, 0.6, 0.9],
                        rotate: [0, 360 * 4],
                      }}
                      transition={{ duration: 1.5, ease: 'easeIn' }}
                    >
                      <div
                        className="w-full h-full rounded-full"
                        style={{
                          background:
                            'conic-gradient(from 0deg, transparent 0%, #8800ff22 15%, #0066ff44 30%, #00d4ff66 45%, #ffffff88 50%, #00d4ff44 55%, #0066ff22 70%, transparent 85%)',
                          filter: 'blur(3px)',
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ---- Phase 4: Blinding white flash expanding from center ---- */}
                <AnimatePresence>
                  {whPhase === 'flash' && (
                    <motion.div
                      key="wormhole-flash"
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(ellipse at center, #ffffff 0%, rgba(200,230,255,0.95) 20%, rgba(100,180,255,0.6) 50%, transparent 80%)',
                        zIndex: 20,
                      }}
                      initial={{ opacity: 0, scale: 0.1 }}
                      animate={{ opacity: [0, 1, 1, 0], scale: [0.1, 1, 2, 3] }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ----------------------------------------------------------------
              SCAN LINES overlay
          ---------------------------------------------------------------- */}
          <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
            {Array.from({ length: scanLineCount }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute left-0 w-full"
                style={{
                  height: 1,
                  top: `${(i / scanLineCount) * 100}%`,
                  background: 'rgba(0,212,255,0.04)',
                }}
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{
                  duration: 3 + i * 0.1,
                  repeat: Infinity,
                  delay: i * 0.07,
                }}
              />
            ))}
            {/* Moving scan sweep */}
            <motion.div
              className="absolute left-0 w-full"
              style={{
                height: 3,
                background:
                  'linear-gradient(transparent, rgba(0,212,255,0.12), transparent)',
              }}
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          {/* ----------------------------------------------------------------
              STATIC STARS (background layer)
          ---------------------------------------------------------------- */}
          <div className="absolute inset-0 overflow-hidden">
            {stars.map((s) => (
              <motion.div
                key={s.id}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                  width: s.size,
                  height: s.size,
                  opacity: s.brightness * 0.6,
                }}
                animate={{ opacity: [s.brightness * 0.3, s.brightness, s.brightness * 0.3] }}
                transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
              />
            ))}
          </div>

          {/* ----------------------------------------------------------------
              WARP / HYPERSPACE EFFECT
          ---------------------------------------------------------------- */}
          <AnimatePresence>
            {warp && (
              <motion.div
                key="warp"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 overflow-hidden"
                style={{ background: 'radial-gradient(ellipse at center, #001a2e 0%, #000008 70%)' }}
              >
                {warpStars.map((ws) => (
                  <motion.div
                    key={ws.id}
                    className="absolute"
                    style={{
                      left: `${ws.left}%`,
                      top: `${ws.top}%`,
                      width: 2,
                      height: ws.length,
                      transformOrigin: 'top center',
                      rotate: ws.angle,
                      background:
                        'linear-gradient(to bottom, rgba(0,212,255,0.0), rgba(0,212,255,0.9), rgba(255,255,255,0.6), rgba(0,212,255,0.0))',
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: [0, 1, 0] }}
                    transition={{ duration: ws.dur, delay: ws.delay, ease: 'easeOut' }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ----------------------------------------------------------------
              SCREEN FLASH
          ---------------------------------------------------------------- */}
          <AnimatePresence>
            {flash && (
              <motion.div
                key="flash"
                className="absolute inset-0 z-30"
                initial={{ opacity: 0.95 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{
                  background:
                    'radial-gradient(ellipse at center bottom, rgba(255,140,0,0.9) 0%, rgba(255,200,50,0.6) 30%, rgba(255,255,255,0.4) 60%, transparent 80%)',
                }}
              />
            )}
          </AnimatePresence>

          {/* ----------------------------------------------------------------
              LIFTOFF ROCKET FLAME
          ---------------------------------------------------------------- */}
          <AnimatePresence>
            {liftoff && (
              <motion.div
                key="flame"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10"
                initial={{ opacity: 0, scaleX: 0.5 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Core flame */}
                <motion.div
                  style={{
                    width: 6,
                    height: 180,
                    background:
                      'linear-gradient(to top, #ff4500, #ff8c00, #ffdc00, rgba(255,255,255,0.8), transparent)',
                    filter: 'blur(2px)',
                    marginLeft: -3,
                  }}
                  animate={{ scaleX: [1, 1.3, 0.8, 1.2, 0.9, 1], scaleY: [1, 0.95, 1.05, 0.98, 1] }}
                  transition={{ duration: 0.15, repeat: Infinity }}
                />
                {/* Outer glow */}
                <motion.div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: 80,
                    height: 260,
                    background:
                      'linear-gradient(to top, rgba(255,69,0,0.5), rgba(255,140,0,0.2), transparent)',
                    filter: 'blur(18px)',
                  }}
                  animate={{ opacity: [0.6, 1, 0.7, 0.9] }}
                  transition={{ duration: 0.2, repeat: Infinity }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ----------------------------------------------------------------
              PARTICLE BURST (satellite deploy)
          ---------------------------------------------------------------- */}
          <AnimatePresence>
            {particleBurst && (
              <motion.div
                key="particles"
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              >
                {particles.map((p) => {
                  const rad = (p.angle * Math.PI) / 180;
                  const tx = Math.cos(rad) * p.dist;
                  const ty = Math.sin(rad) * p.dist;
                  return (
                    <motion.div
                      key={p.id}
                      className="absolute rounded-full"
                      style={{
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                      }}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{ x: tx, y: ty, opacity: 0, scale: 0.3 }}
                      transition={{ duration: p.dur, ease: 'easeOut' }}
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ----------------------------------------------------------------
              BOOT LOG  (top-left terminal panel)
          ---------------------------------------------------------------- */}
          <AnimatePresence>
            {!bootDone && whPhase === 'done' && (
              <motion.div
                key="bootlog"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.4 } }}
                className="absolute top-8 left-8 right-8 md:right-auto md:w-[520px] z-20"
                style={{ maxHeight: 320, overflowY: 'hidden' }}
              >
                <div className="text-[10px] leading-5 text-left space-y-px">
                  {bootLines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ color: line.startsWith('[SYS]') ? '#00d4ff' : '#6b7280' }}
                    >
                      {line}
                    </motion.div>
                  ))}
                  {/* Blinking cursor */}
                  <motion.span
                    className="inline-block w-2 h-3 ml-1 align-middle"
                    style={{ background: '#00d4ff' }}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ----------------------------------------------------------------
              CENTRAL CONTENT
          ---------------------------------------------------------------- */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            {/* -- TITLE GLITCH -- */}
            <AnimatePresence>
              {titleVisible && (
                <motion.div
                  key="title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center mb-4"
                >
                  <div
                    className="text-4xl md:text-6xl lg:text-7xl font-thin tracking-[0.25em] inline-block"
                    style={{ color: '#00d4ff', textShadow: '0 0 30px rgba(0,212,255,0.5)' }}
                  >
                    {titleChars.map((ch, i) => (
                      <span
                        key={i}
                        style={{
                          color: ch === TITLE_TARGET[i] ? '#ffffff' : '#00d4ff',
                          opacity: ch === ' ' ? 0 : 1,
                          textShadow:
                            ch !== TITLE_TARGET[i]
                              ? '0 0 8px #00d4ff'
                              : '0 0 20px rgba(255,255,255,0.4)',
                          transition: 'color 0.1s',
                        }}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>

                  {/* Subtitle line */}
                  <AnimatePresence>
                    {subtitleVisible && (
                      <motion.p
                        key="sub"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="mt-3 text-xs md:text-sm tracking-[0.35em] uppercase"
                        style={{ color: 'rgba(0,212,255,0.6)' }}
                      >
                        Private Satellite Mission Control
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Decorative divider */}
            <AnimatePresence>
              {subtitleVisible && (
                <motion.div
                  key="divider"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="w-64 my-5"
                  style={{ height: 1, background: 'linear-gradient(to right, transparent, #00d4ff, transparent)' }}
                />
              )}
            </AnimatePresence>

            {/* -- LAUNCH ANNOUNCE -- */}
            <AnimatePresence>
              {launchVisible && !liftoff && (
                <motion.div
                  key="announce"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-xs tracking-[0.3em] uppercase"
                  style={{ color: '#ff8c00' }}
                >
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                  >
                    &gt;&gt; LAUNCH SEQUENCE INITIATED
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* -- COUNTDOWN -- */}
            {/* -- LIFTOFF BANNER -- */}
            <AnimatePresence>
              {liftoff && (
                <motion.div
                  key="liftoff"
                  initial={{ opacity: 0, scale: 0.4, y: 30 }}
                  animate={{ opacity: 1, scale: [1, 1.08, 1], y: 0 }}
                  transition={{ duration: 0.5, ease: 'backOut' }}
                  className="mt-4 text-5xl md:text-7xl font-bold tracking-[0.2em]"
                  style={{
                    color: '#ffffff',
                    textShadow:
                      '0 0 20px rgba(255,140,0,1), 0 0 60px rgba(255,69,0,0.7), 0 0 120px rgba(255,140,0,0.3)',
                  }}
                >
                  LIFTOFF
                </motion.div>
              )}
            </AnimatePresence>

            {/* -- STATUS LINE (stage sep / deploy / online) -- */}
            <AnimatePresence mode="wait">
              {statusLine && (
                <motion.div
                  key={statusLine.text}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6 text-xs tracking-[0.25em] uppercase flex items-center gap-3"
                  style={{ color: statusLine.color }}
                >
                  <span
                    className="inline-block px-1 py-px text-[10px] border"
                    style={{ borderColor: statusLine.color, color: statusLine.color }}
                  >
                    OK
                  </span>
                  {statusLine.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* -- TELEMETRY READOUTS -- */}
            <AnimatePresence>
              {liftoff && (
                <motion.div
                  key="telemetry"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mt-8 grid grid-cols-4 gap-6 md:gap-10"
                >
                  {TELEMETRY.map((ch, i) => (
                    <div key={ch.label} className="text-center">
                      <div
                        className="text-[9px] tracking-widest mb-1"
                        style={{ color: 'rgba(0,212,255,0.5)' }}
                      >
                        {ch.label}
                      </div>
                      <motion.div
                        className="text-base md:text-lg font-bold tabular-nums"
                        style={{ color: '#00d4ff' }}
                      >
                        {telemetry[i].toFixed(i === 3 ? 0 : 1)}
                      </motion.div>
                      <div
                        className="text-[9px] mt-px"
                        style={{ color: 'rgba(0,212,255,0.4)' }}
                      >
                        {ch.unit}
                      </div>
                      {/* Mini bar */}
                      <div
                        className="mt-1 rounded-full overflow-hidden"
                        style={{ height: 2, background: 'rgba(0,212,255,0.15)', width: 48 }}
                      >
                        <motion.div
                          style={{
                            height: '100%',
                            background: '#00d4ff',
                            width: `${Math.min((telemetry[i] / (i === 3 ? 100 : i === 1 ? 7800 : i === 0 ? 500 : 800)) * 100, 100)}%`,
                          }}
                          transition={{ duration: 0.08 }}
                        />
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ----------------------------------------------------------------
              HUD CORNER DECORATIONS
          ---------------------------------------------------------------- */}
          {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map(
            (pos, i) => (
              <div
                key={i}
                className={`absolute ${pos} w-8 h-8 pointer-events-none`}
                style={{ opacity: 0.4 }}
              >
                <div
                  className="absolute"
                  style={{
                    width: 20,
                    height: 2,
                    background: '#00d4ff',
                    top: i < 2 ? 0 : 'auto',
                    bottom: i >= 2 ? 0 : 'auto',
                    left: i % 2 === 0 ? 0 : 'auto',
                    right: i % 2 === 1 ? 0 : 'auto',
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    width: 2,
                    height: 20,
                    background: '#00d4ff',
                    top: i < 2 ? 0 : 'auto',
                    bottom: i >= 2 ? 0 : 'auto',
                    left: i % 2 === 0 ? 0 : 'auto',
                    right: i % 2 === 1 ? 0 : 'auto',
                  }}
                />
              </div>
            )
          )}

          {/* ----------------------------------------------------------------
              PROGRESS BAR  (mission control telemetry style)
          ---------------------------------------------------------------- */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-80 z-20">
            <div className="flex justify-between text-[9px] tracking-widest mb-1" style={{ color: 'rgba(0,212,255,0.45)' }}>
              <span>MISSION ELAPSED</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div
              className="rounded-full overflow-hidden"
              style={{ height: 3, background: 'rgba(0,212,255,0.12)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(to right, #0066cc, #00d4ff)',
                  boxShadow: '0 0 8px rgba(0,212,255,0.7)',
                }}
                transition={{ duration: 0.06 }}
              />
            </div>
            {/* Tick marks */}
            <div className="flex justify-between mt-1">
              {[0, 25, 50, 75, 100].map((tick) => (
                <div
                  key={tick}
                  style={{
                    width: 1,
                    height: 4,
                    background: progress >= tick ? '#00d4ff' : 'rgba(0,212,255,0.2)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* ----------------------------------------------------------------
              SOUND-WAVE VISUALIZATION BARS  (bottom)
          ---------------------------------------------------------------- */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-px z-20" style={{ height: 40 }}>
            {soundBars.map((bar) => (
              <motion.div
                key={bar.id}
                style={{
                  width: 3,
                  background: online
                    ? 'linear-gradient(to top, #00d4ff, rgba(0,212,255,0.3))'
                    : liftoff
                    ? 'linear-gradient(to top, #ff8c00, rgba(255,140,0,0.3))'
                    : 'linear-gradient(to top, rgba(0,212,255,0.5), transparent)',
                  borderRadius: 1,
                  minHeight: 3,
                }}
                animate={{
                  height: liftoff || online
                    ? [bar.baseH * 0.5, bar.baseH * 1.8, bar.baseH * 0.7, bar.baseH * 1.4, bar.baseH]
                    : [bar.baseH * 0.3, bar.baseH * 0.8, bar.baseH * 0.4],
                }}
                transition={{
                  duration: bar.dur,
                  repeat: Infinity,
                  delay: bar.delay,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* ----------------------------------------------------------------
              SKIP BUTTON
          ---------------------------------------------------------------- */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            whileHover={{ opacity: 1 }}
            onClick={dismiss}
            className="absolute bottom-8 right-8 text-[10px] tracking-[0.25em] uppercase z-50 px-3 py-1 border transition-colors"
            style={{
              color: 'rgba(0,212,255,0.6)',
              borderColor: 'rgba(0,212,255,0.2)',
            }}
          >
            SKIP &gt;&gt;
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
