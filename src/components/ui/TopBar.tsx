'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useAnimationFrame } from 'framer-motion';
import { useOrbStore } from '@/stores/useOrbStore';

// ─── Live clock with milliseconds ───────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState({ utc: '--:--:--', ms: '---', met: '--:--:--' });
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (startRef.current === null) startRef.current = Date.now() - 47 * 60 * 1000 - 23 * 1000;

    const update = () => {
      const now = new Date();
      const utc = now.toISOString().slice(11, 19);
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      const elapsed = Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000);
      const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
      const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
      const ss = String(elapsed % 60).padStart(2, '0');
      setTime({ utc, ms, met: `${hh}:${mm}:${ss}` });
    };

    update();
    const id = setInterval(update, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-right leading-tight select-none">
      <p className="text-[11px] font-mono text-gray-300 tabular-nums">
        {time.utc}
        <span className="text-cyan-500 text-[9px]">.{time.ms}</span>
        <span className="text-gray-600 ml-1 text-[9px]">UTC</span>
      </p>
      <p className="text-[9px] font-mono text-gray-600 tabular-nums">
        MET +{time.met}
      </p>
    </div>
  );
}

// ─── Animated logo ───────────────────────────────────────────────────────────
function OrbLogo() {
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          border: '1px solid rgba(34,211,238,0.5)',
          boxShadow: '0 0 8px rgba(34,211,238,0.3)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        {/* Ring tick marks */}
        {[0, 90, 180, 270].map((deg) => (
          <div
            key={deg}
            className="absolute w-1 h-px bg-cyan-400"
            style={{
              top: '50%',
              left: deg === 180 ? 0 : deg === 0 ? 'calc(100% - 4px)' : '50%',
              transform: `rotate(${deg}deg) translateX(${deg === 90 || deg === 270 ? '-50%' : '0'})`,
              transformOrigin: 'left center',
            }}
          />
        ))}
      </motion.div>

      {/* Inner pulsing ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: 4,
          border: '1px solid rgba(34,211,238,0.25)',
        }}
        animate={{ opacity: [0.25, 0.7, 0.25], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Glow pulse */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: 0,
          background: 'radial-gradient(circle, rgba(34,211,238,0.15) 0%, transparent 70%)',
        }}
        animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Center core */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-3 h-3 rounded-full"
          style={{
            background: 'radial-gradient(circle, #ffffff 0%, #22d3ee 50%, #3b82f6 100%)',
            boxShadow: '0 0 10px #22d3ee, 0 0 20px rgba(34,211,238,0.4)',
          }}
          animate={{
            boxShadow: [
              '0 0 6px #22d3ee, 0 0 12px rgba(34,211,238,0.3)',
              '0 0 14px #22d3ee, 0 0 28px rgba(34,211,238,0.6)',
              '0 0 6px #22d3ee, 0 0 12px rgba(34,211,238,0.3)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}

// ─── Scrolling ticker tape ───────────────────────────────────────────────────
const TICKER_MESSAGES = [
  'SOLAR ARRAY OUTPUT: 2.4 kW — NOMINAL',
  'ORBIT ALTITUDE: 408 km — STABLE',
  'DOWNLINK RATE: 150 Mbps — ACTIVE',
  'THERMAL MGMT: 24.3 C — NOMINAL',
  'ATTITUDE CTRL: LOCKED — NADIR-POINTING',
  'COMMS UPLINK: ESTABLISHED — 3.2 ms LATENCY',
  'AI CORE: ONLINE — INFERENCE READY',
  'REFLECTOR ARRAY: STOWED — ON STANDBY',
  'BATTERY CELLS: 100% — FULL CHARGE',
  'ORBITAL PERIOD: 92.7 MIN — TRACK NOMINAL',
];

function TickerTape() {
  const fullText = useMemo(
    () => TICKER_MESSAGES.join('   ///   ') + '   ///   ',
    []
  );

  return (
    <div className="overflow-hidden flex-1 mx-4" style={{ maskImage: 'linear-gradient(90deg, transparent, black 10%, black 90%, transparent)' }}>
      <motion.div
        className="whitespace-nowrap text-[9px] font-mono text-gray-500 tracking-widest"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ display: 'inline-block', width: 'max-content' }}
      >
        {/* Duplicate for seamless loop */}
        {fullText + fullText}
      </motion.div>
    </div>
  );
}

// ─── Connection status with signal waves ────────────────────────────────────
function ConnectionStatus() {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Ripple waves */}
      <div className="relative w-5 h-5 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-green-400"
            style={{ width: 4 + i * 6, height: 4 + i * 6 }}
            animate={{ opacity: [0.8, 0, 0.8], scale: [0.8, 1.2, 0.8] }}
            transition={{
              duration: 2,
              delay: i * 0.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}
        <div className="w-1 h-1 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #4ade80' }} />
      </div>
      <span className="text-[9px] font-mono text-green-400 tracking-widest">UPLINK OK</span>
    </div>
  );
}

// ─── Animated separator line ─────────────────────────────────────────────────
function SeparatorLine() {
  return (
    <div className="relative h-px overflow-hidden">
      {/* Base line */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      {/* Flowing shimmer */}
      <motion.div
        className="absolute top-0 bottom-0 w-1/3"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(34,211,238,0.6), rgba(34,211,238,0.3), transparent)',
        }}
        animate={{ left: ['-33%', '133%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
      />
      {/* Second shimmer offset */}
      <motion.div
        className="absolute top-0 bottom-0 w-1/4"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)',
        }}
        animate={{ left: ['-25%', '125%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: 1.5 }}
      />
    </div>
  );
}

// ─── Energy indicator ────────────────────────────────────────────────────────
function EnergyIndicator() {
  const energy = useOrbStore((s) => s.energy);
  const maxEnergy = useOrbStore((s) => s.maxEnergy);
  const pct = energy / maxEnergy;
  const color = pct > 0.6 ? '#22d3ee' : pct > 0.3 ? '#fb923c' : '#ef4444';

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[9px] font-mono text-gray-600 tracking-widest">EP</span>
        <motion.span
          className="text-[10px] font-mono tabular-nums"
          style={{ color }}
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {energy}
        </motion.span>
      </div>
      {/* Mini vertical gauge */}
      <div className="w-1 h-6 bg-white/5 rounded-full overflow-hidden flex flex-col-reverse">
        <motion.div
          className="w-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
          animate={{ height: `${pct * 100}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 20 }}
        />
      </div>
    </div>
  );
}

// ─── Phase badge ──────────────────────────────────────────────────────────────
function PhaseBadge() {
  const phase = useOrbStore((s) => s.phase);
  return (
    <motion.div
      className="flex items-center gap-1.5 flex-shrink-0"
      key={phase}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <span className="text-[9px] font-mono text-gray-600 tracking-widest">MODE</span>
      <span
        className="text-[9px] font-mono px-1.5 py-0.5 rounded"
        style={{
          color: '#22d3ee',
          backgroundColor: 'rgba(34,211,238,0.08)',
          border: '1px solid rgba(34,211,238,0.2)',
        }}
      >
        {phase.toUpperCase().replace(/-/g, ' ')}
      </span>
    </motion.div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function TopBar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.8 }}
      className="absolute top-0 left-0 right-0 z-20"
    >
      {/* Main bar */}
      <div className="flex items-center px-5 py-2 gap-4">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <OrbLogo />
          <div className="leading-tight select-none">
            <h1 className="text-sm font-bold text-white tracking-wider leading-none">
              星核{' '}
              <span className="text-cyan-400 font-light tracking-widest">ORB CORE</span>
            </h1>
            <p className="text-[8px] text-gray-600 font-mono tracking-[0.25em] mt-0.5">
              PRIVATE SATELLITE SYSTEM
            </p>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-8 w-px bg-white/10 flex-shrink-0" />

        {/* Connection status */}
        <ConnectionStatus />

        {/* Vertical divider */}
        <div className="h-8 w-px bg-white/10 flex-shrink-0 hidden md:block" />

        {/* Ticker tape — takes remaining space */}
        <div className="hidden md:flex items-center flex-1 min-w-0">
          <TickerTape />
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
          <PhaseBadge />

          {/* Vertical divider */}
          <div className="h-8 w-px bg-white/10" />

          <EnergyIndicator />

          {/* Vertical divider */}
          <div className="h-8 w-px bg-white/10" />

          <LiveClock />
        </div>
      </div>

      {/* Animated separator line */}
      <SeparatorLine />
    </motion.div>
  );
}
