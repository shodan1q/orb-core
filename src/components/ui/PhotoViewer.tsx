'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbStore } from '@/stores/useOrbStore';

// Map coordinates to satellite photos + location names
function getPhotoForTarget(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) {
    return { src: '/textures/sat-shenzhen.jpg', name: '深圳南山区 · Shenzhen Nanshan' };
  }
  // Simple region matching
  if (lng > 121 && lng < 122 && lat > 31 && lat < 32) {
    return { src: '/textures/sat-shanghai.jpg', name: '上海 · Shanghai' };
  }
  if (lng > 116 && lng < 117 && lat > 39 && lat < 40) {
    return { src: '/textures/sat-beijing.jpg', name: '北京 · Beijing' };
  }
  return { src: '/textures/sat-shenzhen.jpg', name: '深圳南山区 · Shenzhen Nanshan' };
}

export default function PhotoViewer() {
  const showPhotoViewer = useOrbStore((s) => s.showPhotoViewer);
  const setShowPhotoViewer = useOrbStore((s) => s.setShowPhotoViewer);
  const targetLat = useOrbStore((s) => s.targetLat);
  const targetLng = useOrbStore((s) => s.targetLng);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!showPhotoViewer) return null;

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const { src, name } = getPhotoForTarget(targetLat, targetLng);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md"
        onClick={() => setShowPhotoViewer(false)}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative max-w-3xl w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main frame */}
          <div className="rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(8,12,28,0.95), rgba(5,8,20,0.98))',
              border: '1px solid rgba(34,211,238,0.15)',
              boxShadow: '0 0 60px rgba(0,0,0,0.6), 0 0 30px rgba(34,211,238,0.05)',
            }}
          >
            {/* Image area */}
            <div className="relative aspect-[4/3] overflow-hidden bg-black">
              {/* Real satellite image */}
              <motion.img
                src={src}
                alt="Satellite capture"
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: imageLoaded ? 1 : 0 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                onLoad={() => setImageLoaded(true)}
              />

              {/* Slight color grade overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-transparent to-black/20 pointer-events-none" />

              {/* Vignette */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)' }}
              />

              {/* ── HUD Overlay ── */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner brackets */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-400/50" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-cyan-400/50" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-cyan-400/50" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-400/50" />

                {/* Top left - Camera info */}
                <div className="absolute top-5 left-5 text-[10px] font-mono leading-relaxed"
                  style={{ color: 'rgba(34,211,238,0.75)', textShadow: '0 0 10px rgba(0,0,0,0.8)' }}
                >
                  <p>ORB-CAM v2.1 / 0.5m GSD</p>
                  <p>BAND: VIS-RGB / F/2.8 / ISO 200</p>
                  <p className="mt-1 text-cyan-400/40">FRAME #00247</p>
                </div>

                {/* Top right - Coordinates */}
                <div className="absolute top-5 right-5 text-right text-[10px] font-mono leading-relaxed"
                  style={{ color: 'rgba(34,211,238,0.75)', textShadow: '0 0 10px rgba(0,0,0,0.8)' }}
                >
                  <p>{targetLat?.toFixed(4)}N  {targetLng?.toFixed(4)}E</p>
                  <p>ALT: 408km / NADIR</p>
                  <p>{timestamp} UTC</p>
                </div>

                {/* Center crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Outer circle */}
                  <div className="w-24 h-24 rounded-full border border-cyan-500/15" />
                  {/* Inner square */}
                  <div className="absolute w-12 h-12 border border-cyan-500/25" />
                  {/* Cross lines */}
                  <div className="absolute w-32 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                  <div className="absolute w-px h-32 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />
                  {/* Center dot */}
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400/40" />
                </div>

                {/* Scale bar (bottom left) */}
                <div className="absolute bottom-5 left-5 text-[9px] font-mono"
                  style={{ color: 'rgba(34,211,238,0.5)' }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-16 h-px bg-cyan-400/40" />
                    <span>500m</span>
                  </div>
                  <p className="text-green-400/70">-50 EP / CAPTURE COMPLETE</p>
                </div>

                {/* Branding (bottom right) */}
                <div className="absolute bottom-5 right-5 text-[9px] font-mono text-gray-500/50 text-right">
                  <p>ORB CORE IMAGING</p>
                  <p>SYSTEM v2.1.0</p>
                </div>

                {/* Scan line */}
                <motion.div
                  className="absolute left-0 right-0 h-px pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.15) 20%, rgba(34,211,238,0.3) 50%, rgba(34,211,238,0.15) 80%, transparent)' }}
                  animate={{ top: ['0%', '100%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />

                {/* Subtle noise overlay */}
                <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  }}
                />

                {/* "Stabilizing" effect — subtle micro-shake that settles */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ x: [1, -0.5, 0.3, 0], y: [-0.5, 0.8, -0.3, 0] }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Info bar */}
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(34,211,238,0.08)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"
                  style={{ boxShadow: '0 0 6px rgba(74,222,128,0.5)' }}
                />
                <span className="text-xs text-gray-300 font-mono">{name}</span>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-gray-300 font-mono transition-all hover:border-white/20">
                  SAVE
                </button>
                <button
                  onClick={() => setShowPhotoViewer(false)}
                  className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-[10px] text-cyan-400 font-mono transition-all hover:border-cyan-500/40 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
