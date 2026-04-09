'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'framer-motion';
import TopBar from '@/components/ui/TopBar';
import StatusPanel from '@/components/ui/StatusPanel';
import ChatPanel from '@/components/ui/ChatPanel';
import LaunchOverlay from '@/components/ui/LaunchOverlay';
import PhotoViewer from '@/components/ui/PhotoViewer';
import ControlPanel from '@/components/ui/ControlPanel';
import RemoteLinkBadge from '@/components/ui/RemoteLinkBadge';
import { useOrbStore } from '@/stores/useOrbStore';
import { useRemoteLink } from '@/hooks/useRemoteLink';

const OrbScene = dynamic(() => import('@/components/three/Scene'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[#000005] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin mx-auto mb-4" />
        <p className="text-xs text-gray-500 font-mono tracking-widest">INITIALIZING ORB CORE...</p>
      </div>
    </div>
  ),
});

function ControlButton() {
  const setShow = useOrbStore((s) => s.setShowControlPanel);
  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      onClick={() => setShow(true)}
      className="absolute top-16 left-5 z-20 group flex items-center gap-3 px-4 py-3 w-[185px] border border-cyan-500/30 bg-black/40 backdrop-blur-sm hover:border-cyan-400 hover:bg-cyan-500/10 transition-colors"
      style={{ boxShadow: '0 0 20px rgba(34,211,238,0.08)' }}
      title="卫星控制台"
    >
      {/* 小图标: 卫星 */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-cyan-300 group-hover:text-cyan-100 flex-shrink-0">
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="3" y="10" width="6" height="4" stroke="currentColor" strokeWidth="1.2" />
        <rect x="15" y="10" width="6" height="4" stroke="currentColor" strokeWidth="1.2" />
        <line x1="9" y1="12" x2="9.5" y2="12" stroke="currentColor" strokeWidth="1.2" />
        <line x1="14.5" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.2" />
        <line x1="12" y1="7" x2="12" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="12" y1="14.5" x2="12" y2="17" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <div className="text-left leading-tight">
        <div className="text-[12px] font-mono text-cyan-300 group-hover:text-cyan-100 tracking-widest">
          SAT CTRL
        </div>
        <div className="text-[9px] font-mono text-gray-500 tracking-wider">
          卫星控制台
        </div>
      </div>
    </motion.button>
  );
}

function PovButton() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.75, duration: 0.5 }}
      className="absolute top-[124px] left-5 z-20"
    >
      <Link
        href="/pov"
        className="group flex items-center gap-3 px-4 py-3 w-[185px] border border-violet-500/30 bg-black/40 backdrop-blur-sm hover:border-violet-400 hover:bg-violet-500/10 transition-colors"
        style={{ boxShadow: '0 0 20px rgba(167,139,250,0.08)' }}
        title="卫星第一视角"
      >
        {/* 小图标: 相机/眼睛 */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-violet-300 group-hover:text-violet-100 flex-shrink-0">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
        <div className="text-left leading-tight">
          <div className="text-[12px] font-mono text-violet-300 group-hover:text-violet-100 tracking-widest">
            POV VIEW
          </div>
          <div className="text-[9px] font-mono text-gray-500 tracking-wider">
            卫星第一视角
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Home() {
  const setShowPhotoViewer = useOrbStore((s) => s.setShowPhotoViewer);
  const setReflection = useOrbStore((s) => s.setReflection);
  const setShowControlPanel = useOrbStore((s) => s.setShowControlPanel);

  // Open a WebSocket uplink to the HarmonyOS orbcore-app ground station.
  // Attitude messages drive satellite rotation (see Satellite.tsx); commands
  // trigger the same UI affordances as the on-screen control panel.
  useRemoteLink({
    onCommand: (action) => {
      if (action === 'take_photo') setShowPhotoViewer(true);
      else if (action === 'reflect') setReflection(true, 0.9);
      else if (action === 'status') setShowControlPanel(true);
    },
  });

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#000005]">
      {/* 3D Scene (full screen background) */}
      <OrbScene />

      {/* Launch Animation Overlay */}
      <LaunchOverlay />

      {/* UI Overlay */}
      <TopBar />
      <ControlButton />
      <PovButton />
      <RemoteLinkBadge />
      <StatusPanel />
      <ChatPanel />
      <PhotoViewer />
      <ControlPanel />

      {/* Bottom attribution */}
      <div className="absolute bottom-2 right-4 z-10 text-[9px] font-mono text-gray-700">
        POWERED BY ORB CORE SATELLITE SYSTEM
      </div>
    </main>
  );
}
