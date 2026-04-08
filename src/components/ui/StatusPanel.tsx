'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useOrbStore } from '@/stores/useOrbStore';

// ─── Seeded random ──────────────────────────────────────────────────────────
function makeSeeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ─── Animated number ────────────────────────────────────────────────────────
function Num({ value, d = 2, suffix = '' }: { value: number; d?: number; suffix?: string }) {
  const [display, setDisplay] = useState(value);
  const animRef = useRef<number | null>(null);
  const startRef = useRef(display);

  useEffect(() => {
    startRef.current = display;
    let startTime: number | null = null;
    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const t = Math.min((now - startTime) / 500, 1);
      setDisplay(startRef.current + (value - startRef.current) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) animRef.current = requestAnimationFrame(tick);
    };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display.toFixed(d)}{suffix}</>;
}

// ─── Large ring gauge ───────────────────────────────────────────────────────
function RingGauge({ value, max }: { value: number; max: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pct = Math.min(value / max, 1);
  const size = 140;
  const stroke = 5;
  const r = (size - stroke * 2 - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const fill = arc * pct;

  const color = pct > 0.6 ? '#22d3ee' : pct > 0.3 ? '#fb923c' : '#ef4444';
  const glow = pct > 0.6 ? '0,211,238' : pct > 0.3 ? '251,146,60' : '239,68,68';

  // Pre-compute tick positions (static, no store dependency)
  const ticks = useMemo(() => {
    const count = 30;
    const inner = r - 8;
    const outer = r - 4;
    const result: { x1: number; y1: number; x2: number; y2: number; idx: number }[] = [];
    for (let i = 0; i < count; i++) {
      if (i / count > 0.75) continue;
      const angle = (i / count) * 2 * Math.PI;
      result.push({
        x1: cx + inner * Math.cos(angle),
        y1: cy + inner * Math.sin(angle),
        x2: cx + outer * Math.cos(angle),
        y2: cy + outer * Math.sin(angle),
        idx: i,
      });
    }
    return result;
  }, [r, cx, cy]);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(135deg)' }}>
        {/* Tick marks — render only on client to avoid hydration mismatch */}
        {mounted && ticks.map((t) => (
          <line
            key={t.idx}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.idx / 30 <= pct * 0.75 ? color : 'rgba(255,255,255,0.08)'}
            strokeWidth={1}
            strokeLinecap="round"
          />
        ))}

        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={stroke}
          strokeDasharray={`${arc} ${circ}`}
          strokeLinecap="round"
        />

        {/* Outer subtle ring */}
        <circle
          cx={cx} cy={cy} r={r + 10}
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth={1}
          strokeDasharray={`${circ * 0.75} ${circ}`}
          strokeLinecap="round"
        />

        {/* Active fill */}
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px rgba(${glow},0.5))` }}
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${fill} ${circ}` }}
          transition={{ type: 'spring', stiffness: 40, damping: 15 }}
        />

        {/* Bright dot at fill end */}
        {mounted && (
          <motion.circle
            r={3}
            fill={color}
            style={{ filter: `drop-shadow(0 0 6px rgba(${glow},0.8))` }}
            animate={{
              cx: cx + r * Math.cos(pct * 0.75 * 2 * Math.PI),
              cy: cy + r * Math.sin(pct * 0.75 * 2 * Math.PI),
            }}
            transition={{ type: 'spring', stiffness: 40, damping: 15 }}
          />
        )}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-light leading-none" style={{ color }}>
          {Math.round(pct * 100)}
        </span>
        <span className="font-mono text-[9px] text-gray-500 tracking-widest mt-1">PERCENT</span>
        <div className="w-8 h-px mt-2 mb-1.5" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
        <span className="font-mono text-[10px] text-gray-300">
          <Num value={value} d={0} /> <span className="text-gray-600">/ {max}</span>
        </span>
        <span className="font-mono text-[8px] text-gray-600 tracking-widest mt-0.5">ENERGY POINTS</span>
      </div>
    </div>
  );
}

// ─── Scan line ──────────────────────────────────────────────────────────────
function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-[1px] pointer-events-none z-10"
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.5) 50%, transparent)',
      }}
      initial={{ top: '0%', opacity: 0 }}
      animate={{ top: ['0%', '100%', '100%', '0%'], opacity: [0, 0.6, 0, 0] }}
      transition={{ duration: 4, times: [0, 0.4, 0.6, 1], repeat: Infinity, repeatDelay: 8, ease: 'linear' }}
    />
  );
}

// ─── Data stream dots ───────────────────────────────────────────────────────
function DataStream() {
  const dots = useMemo(() => {
    const r = makeSeeded(123);
    return Array.from({ length: 10 }, (_, i) => ({
      id: i, x: r() * 100, delay: r() * 5, dur: 3 + r() * 3, size: r() > 0.5 ? 2 : 1,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
      {dots.map((d) => (
        <motion.div
          key={d.id}
          className="absolute rounded-full bg-cyan-400/15"
          style={{ width: d.size, height: d.size, left: `${d.x}%` }}
          initial={{ top: '-2%', opacity: 0 }}
          animate={{ top: '102%', opacity: [0, 0.5, 0.5, 0] }}
          transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

// ─── Holo panel wrapper ─────────────────────────────────────────────────────
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(8,12,28,0.85) 0%, rgba(5,8,20,0.92) 100%)',
        border: '1px solid rgba(34,211,238,0.08)',
        boxShadow: '0 0 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/20" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/20" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/20" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/20" />

      <ScanLine />
      <DataStream />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ─── Data row ───────────────────────────────────────────────────────────────
function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[9px] font-mono text-gray-600 tracking-widest">{label}</span>
      <span className="text-sm font-mono text-white tabular-nums">{children}</span>
    </div>
  );
}

// ─── Subsystem item ─────────────────────────────────────────────────────────
function Subsystem({ name, status, color, active, delay }: {
  name: string; status: string; color: string; active: boolean; delay: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-2 text-[11px] font-mono"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      {/* Status dot */}
      <motion.div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
        animate={active ? {
          boxShadow: [`0 0 3px ${color}`, `0 0 8px ${color}`, `0 0 3px ${color}`],
        } : {}}
        transition={active ? { duration: 2, repeat: Infinity } : {}}
      />

      {/* Name */}
      <span className="text-gray-500 w-20">{name}</span>

      {/* Line */}
      <div className="flex-1 h-px relative overflow-hidden">
        <div className="absolute inset-0 bg-white/[0.03]" />
        {active && (
          <motion.div
            className="absolute inset-y-0 w-1/3"
            style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }}
            animate={{ left: ['-33%', '133%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: delay * 2 }}
          />
        )}
      </div>

      {/* Status */}
      <span className="text-right w-20 flex-shrink-0" style={{ color }}>{status}</span>
    </motion.div>
  );
}

// ─── Main panel ─────────────────────────────────────────────────────────────
export default function StatusPanel() {
  const energy = useOrbStore((s) => s.energy);
  const maxEnergy = useOrbStore((s) => s.maxEnergy);
  const satelliteLat = useOrbStore((s) => s.satelliteLat);
  const satelliteLng = useOrbStore((s) => s.satelliteLng);
  const satelliteAlt = useOrbStore((s) => s.satelliteAlt);
  const velocity = useOrbStore((s) => s.velocity);
  const reflectionActive = useOrbStore((s) => s.reflectionActive);
  const phase = useOrbStore((s) => s.phase);

  const pct = energy / maxEnergy;
  const eColor = pct > 0.6 ? '#22d3ee' : pct > 0.3 ? '#fb923c' : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
      className="absolute top-14 right-4 w-[280px] space-y-2.5 z-20"
    >
      {/* ═══ Telemetry ═══ */}
      <Panel className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[9px] font-mono text-cyan-400/80 tracking-[0.2em]">TELEMETRY</span>
          </div>
          <motion.span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            {phase.toUpperCase().replace(/-/g, ' ')}
          </motion.span>
        </div>

        {/* Coordinate grid */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-x-6">
            <DataRow label="LAT"><Num value={satelliteLat} d={2} suffix="&#176;" /></DataRow>
            <DataRow label="LNG"><Num value={satelliteLng} d={2} suffix="&#176;" /></DataRow>
          </div>
          <div className="grid grid-cols-2 gap-x-6">
            <DataRow label="ALT"><Num value={satelliteAlt} d={0} suffix=" km" /></DataRow>
            <DataRow label="VEL"><Num value={velocity} d={2} suffix=" km/s" /></DataRow>
          </div>
        </div>

        {/* Orbit indicator */}
        <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-2">
          <span className="text-[8px] font-mono text-gray-600 tracking-widest">ORBIT</span>
          <div className="flex-1 h-px bg-white/[0.04]" />
          <span className="text-[9px] font-mono text-gray-400">LEO</span>
          <span className="text-[9px] font-mono text-gray-600">T+92.7m</span>
        </div>
      </Panel>

      {/* ═══ Energy ═══ */}
      <Panel className="px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono text-gray-600 tracking-[0.2em]">ENERGY CELL</span>
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: eColor }}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-[9px] font-mono" style={{ color: eColor }}>
              {pct > 0.6 ? 'NOMINAL' : pct > 0.3 ? 'LOW' : 'CRITICAL'}
            </span>
          </div>
        </div>

        {/* Ring gauge */}
        <RingGauge value={energy} max={maxEnergy} />

        {/* Stats row below gauge */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { label: 'INPUT', value: '+2.4 kW', color: '#4ade80' },
            { label: 'RATE', value: '+3.2/s', color: '#22d3ee' },
            { label: 'SOURCE', value: 'SOLAR', color: '#a78bfa' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <span className="text-[7px] font-mono text-gray-600 tracking-widest block">{s.label}</span>
              <span className="text-[10px] font-mono block mt-0.5" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* ═══ Subsystems ═══ */}
      <Panel className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-mono text-gray-600 tracking-[0.2em]">SUBSYSTEMS</span>
          <span className="text-[9px] font-mono text-green-400/80">5/5 OK</span>
        </div>

        <div className="space-y-2">
          <Subsystem name="Solar Array" status="NOMINAL" color="#4ade80" active delay={0.05} />
          <Subsystem
            name="ORB-CAM"
            status={phase === 'photo-sequence' ? 'ACTIVE' : 'STANDBY'}
            color={phase === 'photo-sequence' ? '#22d3ee' : '#555'}
            active={phase === 'photo-sequence'}
            delay={0.1}
          />
          <Subsystem
            name="Reflector"
            status={reflectionActive ? 'ACTIVE' : 'IDLE'}
            color={reflectionActive ? '#fbbf24' : '#555'}
            active={reflectionActive}
            delay={0.15}
          />
          <Subsystem name="AI Core" status="READY" color="#4ade80" active delay={0.2} />
          <Subsystem name="Downlink" status="150 Mbps" color="#4ade80" active delay={0.25} />
        </div>
      </Panel>
    </motion.div>
  );
}
