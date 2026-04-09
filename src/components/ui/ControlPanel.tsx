'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useOrbStore } from '@/stores/useOrbStore';
import { sendRemoteAttitude } from '@/hooks/useRemoteLink';

const ControlSatellite = dynamic(() => import('@/components/three/ControlSatellite'), {
  ssr: false,
});

/* ------------------------------------------------------------------ */
/*  Panel 1: 卫星模拟数据                                                */
/* ------------------------------------------------------------------ */
function SimDataPanel() {
  const lat = useOrbStore((s) => s.satelliteLat);
  const lng = useOrbStore((s) => s.satelliteLng);
  const alt = useOrbStore((s) => s.satelliteAlt);
  const vel = useOrbStore((s) => s.velocity);
  const energy = useOrbStore((s) => s.energy);
  const maxEnergy = useOrbStore((s) => s.maxEnergy);

  // 几个模拟抖动的遥测数
  const [jitter, setJitter] = useState({
    temp: 24.3,
    solar: 2.4,
    downlink: 150,
    cpu: 38,
    sig: -72,
  });
  useEffect(() => {
    const id = setInterval(() => {
      setJitter({
        temp: 22 + Math.random() * 4,
        solar: 2.1 + Math.random() * 0.6,
        downlink: 140 + Math.random() * 20,
        cpu: 30 + Math.random() * 20,
        sig: -70 - Math.random() * 8,
      });
    }, 900);
    return () => clearInterval(id);
  }, []);

  const Row = ({ k, v, unit, color }: { k: string; v: string; unit?: string; color?: string }) => (
    <div className="flex justify-between items-baseline text-[10px] font-mono py-1 border-b border-white/5">
      <span className="text-gray-500 tracking-wider">{k}</span>
      <span className="tabular-nums" style={{ color: color ?? '#b8faff' }}>
        {v}
        {unit && <span className="text-gray-600 ml-1">{unit}</span>}
      </span>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-cyan-400 tracking-widest">TELEMETRY · 实时</span>
        <span className="text-[9px] font-mono text-green-400">● LIVE</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Row k="LATITUDE" v={lat.toFixed(3) + '°'} />
        <Row k="LONGITUDE" v={lng.toFixed(3) + '°'} />
        <Row k="ALTITUDE" v={alt.toFixed(0)} unit="km" />
        <Row k="VELOCITY" v={vel.toFixed(2)} unit="km/s" />
        <Row k="ORBIT PERIOD" v="92.7" unit="min" />
        <Row k="INCLINATION" v="51.6°" />
        <Row k="TEMP INTERNAL" v={jitter.temp.toFixed(1)} unit="°C" />
        <Row k="SOLAR OUTPUT" v={jitter.solar.toFixed(2)} unit="kW" color="#ffd67a" />
        <Row k="DOWNLINK" v={jitter.downlink.toFixed(0)} unit="Mbps" />
        <Row k="CPU LOAD" v={jitter.cpu.toFixed(0)} unit="%" />
        <Row k="SIGNAL RSSI" v={jitter.sig.toFixed(0)} unit="dBm" />
        <Row k="ENERGY CELL" v={`${energy} / ${maxEnergy}`} unit="EP" color="#7bff9c" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel 2: 卫星姿态控制                                                */
/* ------------------------------------------------------------------ */
function AttitudePanel() {
  const [pitch, setPitch] = useState(0);
  const [yaw, setYaw] = useState(0);
  const [roll, setRoll] = useState(0);
  const [mode, setMode] = useState<'NADIR' | 'SUN' | 'TARGET' | 'FREE'>('NADIR');
  const [thrust, setThrust] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // HarmonyOS remote station uplink. When the phone is connected, its
  // gyroscope drives the sliders / 3D model in real time; when offline,
  // the sliders stay fully manual.
  const attitudePitch = useOrbStore((s) => s.attitudePitch);
  const attitudeRoll = useOrbStore((s) => s.attitudeRoll);
  const attitudeYaw = useOrbStore((s) => s.attitudeYaw);
  const remoteLinkState = useOrbStore((s) => s.remoteLinkState);
  const remoteActive = remoteLinkState === 'connected';

  useEffect(() => {
    if (!remoteActive) return;
    // Clamp into the slider's -180..180 domain (phone yaw is 0..360).
    const wrap = (v: number) => (v > 180 ? v - 360 : v);
    setPitch(attitudePitch);
    setRoll(attitudeRoll);
    setYaw(wrap(attitudeYaw));
  }, [attitudePitch, attitudeRoll, attitudeYaw, remoteActive]);

  // Stream slider values back through the relay at ~10 Hz so connected
  // phones continuously mirror the web control-panel state. A single
  // send-on-change isn't enough because the phone's sensor overwrites
  // the value within 500 ms if it doesn't keep receiving fresh frames.
  const attRef = useRef({ pitch: 0, roll: 0, yaw: 0 });
  attRef.current = { pitch, roll, yaw };
  useEffect(() => {
    const timer = setInterval(() => {
      const a = attRef.current;
      sendRemoteAttitude(a.pitch, a.roll, a.yaw);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const Slider = ({
    label,
    value,
    set,
  }: {
    label: string;
    value: number;
    set: (v: number) => void;
  }) => (
    <div className="mb-2">
      <div className="flex justify-between text-[9px] font-mono text-gray-400 tracking-wider mb-1">
        <span>{label}</span>
        <span className="tabular-nums text-cyan-300">
          {value > 0 ? '+' : ''}
          {value.toFixed(1)}°
        </span>
      </div>
      <input
        type="range"
        min={-180}
        max={180}
        step={0.5}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full h-1 accent-cyan-400 bg-white/10 rounded"
      />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-cyan-400 tracking-widest">ATTITUDE CTRL</span>
        <span
          className={`text-[9px] font-mono ${
            remoteActive ? 'text-emerald-300' : 'text-amber-400'
          }`}
        >
          ● {remoteActive ? 'HM REMOTE' : 'MANUAL'}
        </span>
      </div>

      {/* 姿态模式 */}
      <div className="grid grid-cols-4 gap-1 mb-3">
        {(['NADIR', 'SUN', 'TARGET', 'FREE'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-[9px] font-mono py-1 border transition-colors ${
              mode === m
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-white/10 text-gray-500 hover:border-white/30'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* 姿态滑块 */}
      <Slider label="PITCH" value={pitch} set={setPitch} />
      <Slider label="YAW" value={yaw} set={setYaw} />
      <Slider label="ROLL" value={roll} set={setRoll} />

      {/* 推力 */}
      <div className="mt-2 mb-2">
        <div className="flex justify-between text-[9px] font-mono text-gray-400 tracking-wider mb-1">
          <span>THRUST</span>
          <span className="tabular-nums text-amber-300">{thrust.toFixed(0)}%</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setThrust((t) => Math.max(0, t - 10))}
            className="flex-1 text-[10px] font-mono py-1 border border-white/10 text-gray-400 hover:border-amber-400 hover:text-amber-300 transition-colors"
          >
            −10
          </button>
          <div className="flex-[3] h-6 bg-white/5 relative overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-500/40 to-amber-300/60"
              style={{ width: `${thrust}%` }}
            />
          </div>
          <button
            onClick={() => setThrust((t) => Math.min(100, t + 10))}
            className="flex-1 text-[10px] font-mono py-1 border border-white/10 text-gray-400 hover:border-amber-400 hover:text-amber-300 transition-colors"
          >
            +10
          </button>
        </div>
      </div>

      {/* 3D 姿态预览 - 真·可控卫星 */}
      <div className="flex-1 relative border border-cyan-500/20 bg-gradient-to-b from-[#020812] to-[#000408] overflow-hidden min-h-[180px]">
        <ControlSatellite pitch={pitch} yaw={yaw} roll={roll} thrust={thrust} />
        {/* HUD 角标 */}
        <div className="absolute top-1 left-1 w-3 h-3 border-t border-l border-cyan-400/60 pointer-events-none" />
        <div className="absolute top-1 right-1 w-3 h-3 border-t border-r border-cyan-400/60 pointer-events-none" />
        <div className="absolute bottom-1 left-1 w-3 h-3 border-b border-l border-cyan-400/60 pointer-events-none" />
        <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r border-cyan-400/60 pointer-events-none" />
        <div className="absolute top-1.5 left-2 text-[8px] font-mono text-cyan-400/80 tracking-widest pointer-events-none">
          ORB-CORE · 3D MODEL
        </div>
        <div className="absolute bottom-1.5 right-2 text-[8px] font-mono text-gray-500 pointer-events-none">
          拖动旋转视角
        </div>
        {/* Expand button */}
        <button
          onClick={() => setExpanded(true)}
          className="absolute top-1.5 right-2 z-10 px-1.5 py-0.5 text-[8px] font-mono text-cyan-400/80 border border-cyan-500/30 bg-black/50 hover:border-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/15 transition-colors tracking-wider"
        >
          ⛶ EXPAND
        </button>
      </div>

      {/* Fullscreen 3D model overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col"
          onClick={() => setExpanded(false)}
        >
          <div
            className="flex-1 relative m-4 border border-cyan-500/25 bg-gradient-to-b from-[#020812] to-[#000408] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ControlSatellite pitch={pitch} yaw={yaw} roll={roll} thrust={thrust} />
            {/* HUD 角标 */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-cyan-400/60 pointer-events-none" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-cyan-400/60 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-cyan-400/60 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-cyan-400/60 pointer-events-none" />
            <div className="absolute top-3 left-4 text-[10px] font-mono text-cyan-400/80 tracking-widest pointer-events-none">
              ORB-CORE · 3D MODEL · FULLSCREEN
            </div>
            {/* Attitude HUD overlay */}
            <div className="absolute bottom-3 left-4 text-[10px] font-mono text-cyan-300/70 tracking-wider pointer-events-none space-y-0.5">
              <div>PITCH <span className="text-cyan-200 tabular-nums">{pitch > 0 ? '+' : ''}{pitch.toFixed(1)}°</span></div>
              <div>YAW&nbsp;&nbsp; <span className="text-cyan-200 tabular-nums">{yaw > 0 ? '+' : ''}{yaw.toFixed(1)}°</span></div>
              <div>ROLL&nbsp; <span className="text-cyan-200 tabular-nums">{roll > 0 ? '+' : ''}{roll.toFixed(1)}°</span></div>
            </div>
            <div className="absolute bottom-3 right-4 text-[10px] font-mono text-gray-500 pointer-events-none">
              拖动旋转视角 · 点击空白处关闭
            </div>
            {/* Close button */}
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-3 right-4 z-10 px-2 py-1 text-[10px] font-mono text-cyan-400 border border-cyan-500/30 bg-black/60 hover:border-cyan-400 hover:bg-cyan-500/15 transition-colors tracking-wider"
            >
              CLOSE ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => {
            setPitch(0);
            setYaw(0);
            setRoll(0);
            setThrust(0);
          }}
          className="flex-1 text-[9px] font-mono py-1.5 border border-white/10 text-gray-400 hover:border-rose-400 hover:text-rose-300 transition-colors"
        >
          RESET
        </button>
        <button className="flex-1 text-[9px] font-mono py-1.5 border border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors">
          APPLY
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel 3: 视频播放器                                                  */
/* ------------------------------------------------------------------ */
const VIDEO_FRAMES = [
  '/textures/sat-shenzhen.jpg',
  '/textures/sat-beijing.jpg',
  '/textures/sat-shanghai.jpg',
];

function VideoPanel() {
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const total = 180;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % VIDEO_FRAMES.length);
      setElapsed((t) => (t + 1) % total);
    }, 2500);
    return () => clearInterval(id);
  }, [playing]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-cyan-400 tracking-widest">LIVE FEED · ORB-CAM</span>
        <span className="text-[9px] font-mono text-red-400 flex items-center gap-1">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-red-500"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          REC
        </span>
      </div>

      <div className="relative flex-1 bg-black overflow-hidden border border-cyan-500/15">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={frame}
            src={VIDEO_FRAMES[frame]}
            alt="feed"
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        </AnimatePresence>

        {/* 扫描线 */}
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(34,211,238,0.6) 50%, transparent)',
          }}
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        {/* 四角标记 */}
        <div className="absolute top-1 left-1 w-4 h-4 border-t border-l border-cyan-400/60" />
        <div className="absolute top-1 right-1 w-4 h-4 border-t border-r border-cyan-400/60" />
        <div className="absolute bottom-1 left-1 w-4 h-4 border-b border-l border-cyan-400/60" />
        <div className="absolute bottom-1 right-1 w-4 h-4 border-b border-r border-cyan-400/60" />

        {/* HUD 文本 */}
        <div className="absolute top-2 left-2 text-[9px] font-mono text-cyan-300/80 leading-tight">
          <div>CH-01 / 4K 30fps</div>
          <div>BITRATE: 45 Mbps</div>
        </div>

        {/* 噪点 */}
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* 控制条 */}
      <div className="mt-2">
        <div className="flex items-center gap-2 text-[9px] font-mono text-gray-400 mb-1">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="text-cyan-300 hover:text-cyan-100"
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <span className="tabular-nums">{fmt(elapsed)}</span>
          <div className="flex-1 h-1 bg-white/10 relative">
            <div
              className="absolute left-0 top-0 bottom-0 bg-cyan-400/70"
              style={{ width: `${(elapsed / total) * 100}%` }}
            />
          </div>
          <span className="tabular-nums text-gray-600">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel 4: 地球星轨图                                                  */
/* ------------------------------------------------------------------ */
function GroundTrackPanel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lat = useOrbStore((s) => s.satelliteLat);
  const lng = useOrbStore((s) => s.satelliteLng);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/textures/earth-day-lowres.jpg';
    img.onload = () => {
      imgRef.current = img;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      // 背景地球贴图 (等距圆柱投影)
      ctx.fillStyle = '#02060d';
      ctx.fillRect(0, 0, w, h);
      if (imgRef.current) {
        ctx.globalAlpha = 0.65;
        ctx.drawImage(imgRef.current, 0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // 网格
      ctx.strokeStyle = 'rgba(34,211,238,0.15)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        const y = (i / 6) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let i = 1; i < 12; i++) {
        const x = (i / 12) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // 赤道加粗
      ctx.strokeStyle = 'rgba(34,211,238,0.35)';
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // 轨道地面轨迹: 经纬度随时间变化的正弦曲线 (倾角 51.6°)
      const INC = 51.6;
      ctx.strokeStyle = 'rgba(123,255,156,0.75)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(123,255,156,0.7)';
      ctx.shadowBlur = 6;

      // 画两条循环轨迹 (一圈,由于地球自转二圈会偏移; 简化只画一圈)
      for (let pass = 0; pass < 3; pass++) {
        ctx.beginPath();
        const offsetLng = pass * -22; // 每圈地面轨迹西移
        for (let i = 0; i <= 360; i += 2) {
          const lngAt = ((i + offsetLng + 180) % 360) - 180;
          const latAt = INC * Math.sin((i * Math.PI) / 180);
          const px = ((lngAt + 180) / 360) * w;
          const py = ((90 - latAt) / 180) * h;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.globalAlpha = 0.3 + 0.4 * (1 - pass / 3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // 卫星当前位置
      const sx = ((lng + 180) / 360) * w;
      const sy = ((90 - lat) / 180) * h;

      // 光圈脉冲
      const now = performance.now();
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.004);
      ctx.beginPath();
      ctx.arc(sx, sy, 8 + pulse * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.6 * (1 - pulse)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 十字
      ctx.strokeStyle = 'rgba(34,211,238,0.85)';
      ctx.beginPath();
      ctx.moveTo(sx - 12, sy);
      ctx.lineTo(sx + 12, sy);
      ctx.moveTo(sx, sy - 12);
      ctx.lineTo(sx, sy + 12);
      ctx.stroke();

      // 中心点
      ctx.fillStyle = '#b8faff';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 坐标文字
      ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = 'rgba(34,211,238,0.9)';
      ctx.fillText(`${lat.toFixed(2)}° / ${lng.toFixed(2)}°`, sx + 10, sy - 8);

      raf = requestAnimationFrame(draw);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [lat, lng]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-cyan-400 tracking-widest">GROUND TRACK · 地面轨迹</span>
        <span className="text-[9px] font-mono text-cyan-300/70">EQUIRECTANGULAR</span>
      </div>
      <div className="flex-1 relative border border-cyan-500/15 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main modal                                                         */
/* ------------------------------------------------------------------ */
export default function ControlPanel() {
  const show = useOrbStore((s) => s.showControlPanel);
  const setShow = useOrbStore((s) => s.setShowControlPanel);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={() => setShow(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-[min(1100px,94vw)] h-[min(720px,88vh)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(8,12,28,0.95), rgba(5,8,20,0.98))',
              border: '1px solid rgba(34,211,238,0.2)',
              boxShadow:
                '0 0 60px rgba(0,0,0,0.7), 0 0 40px rgba(34,211,238,0.08)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/15">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 8px #22d3ee' }} />
                <span className="text-xs font-mono text-cyan-300 tracking-widest">
                  SATELLITE CONTROL · 卫星控制台
                </span>
                <span className="text-[9px] font-mono text-gray-500">
                  ORB-CORE v2.1 · UPLINK 150 Mbps
                </span>
              </div>
              <button
                onClick={() => setShow(false)}
                className="px-3 py-1 text-[10px] font-mono text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                CLOSE ✕
              </button>
            </div>

            {/* 2x2 Grid */}
            <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 p-3 min-h-0">
              <div className="border border-cyan-500/15 bg-black/30 p-3 min-h-0">
                <SimDataPanel />
              </div>
              <div className="border border-cyan-500/15 bg-black/30 p-3 min-h-0">
                <AttitudePanel />
              </div>
              <div className="border border-cyan-500/15 bg-black/30 p-3 min-h-0">
                <VideoPanel />
              </div>
              <div className="border border-cyan-500/15 bg-black/30 p-3 min-h-0">
                <GroundTrackPanel />
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-cyan-500/15 flex items-center justify-between text-[9px] font-mono text-gray-500">
              <span>ESC / 点击空白处关闭</span>
              <span>POWERED BY ORB CORE</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
