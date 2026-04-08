'use client';

// RemoteLinkBadge
// ----------------------------------------------------------------------------
// Compact HUD element announcing the status of the HarmonyOS ground-station
// uplink. Sits alongside the other TopBar-adjacent controls on the main
// dashboard. Matches the CornerBracket / cyan-glow vocabulary of the rest of
// the UI.

import { motion, AnimatePresence } from 'framer-motion';
import { useOrbStore } from '@/stores/useOrbStore';

const STATE_LABEL: Record<string, string> = {
  idle: 'STANDBY',
  connecting: 'LINKING',
  connected: 'ONLINE',
  error: 'FAULT',
};

const STATE_COLOR: Record<string, string> = {
  idle: 'text-gray-500 border-gray-600/40',
  connecting: 'text-amber-300 border-amber-400/50',
  connected: 'text-emerald-300 border-emerald-400/60',
  error: 'text-rose-300 border-rose-400/60',
};

export default function RemoteLinkBadge() {
  const state = useOrbStore((s) => s.remoteLinkState);
  const detail = useOrbStore((s) => s.remoteLinkDetail);
  const pitch = useOrbStore((s) => s.attitudePitch);
  const roll = useOrbStore((s) => s.attitudeRoll);
  const yaw = useOrbStore((s) => s.attitudeYaw);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.9, duration: 0.5 }}
      className="absolute top-[172px] left-5 z-20 w-[155px]"
    >
      <div
        className={`border bg-black/40 backdrop-blur-sm px-3 py-2 ${STATE_COLOR[state] ?? STATE_COLOR.idle}`}
        style={{ boxShadow: '0 0 20px rgba(34,211,238,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              state === 'connected'
                ? 'bg-emerald-400'
                : state === 'connecting'
                ? 'bg-amber-400 animate-pulse'
                : state === 'error'
                ? 'bg-rose-400'
                : 'bg-gray-500'
            }`}
          />
          <div className="text-[10px] font-mono tracking-widest">
            HM REMOTE · {STATE_LABEL[state] ?? 'STANDBY'}
          </div>
        </div>
        <div className="text-[8px] font-mono text-gray-500 tracking-wider mt-1 truncate">
          {detail || 'waiting for handset'}
        </div>
        <AnimatePresence>
          {state === 'connected' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 grid grid-cols-3 gap-1 text-[8px] font-mono text-cyan-300"
            >
              <div>P{pitch.toFixed(0).padStart(3, ' ')}</div>
              <div>R{roll.toFixed(0).padStart(3, ' ')}</div>
              <div>Y{yaw.toFixed(0).padStart(3, ' ')}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
