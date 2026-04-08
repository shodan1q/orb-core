'use client';

import dynamic from 'next/dynamic';
import TopBar from '@/components/ui/TopBar';
import StatusPanel from '@/components/ui/StatusPanel';
import ChatPanel from '@/components/ui/ChatPanel';
import LaunchOverlay from '@/components/ui/LaunchOverlay';
import PhotoViewer from '@/components/ui/PhotoViewer';

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

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#000005]">
      {/* 3D Scene (full screen background) */}
      <OrbScene />

      {/* Launch Animation Overlay */}
      <LaunchOverlay />

      {/* UI Overlay */}
      <TopBar />
      <StatusPanel />
      <ChatPanel />
      <PhotoViewer />

      {/* Bottom attribution */}
      <div className="absolute bottom-2 right-4 z-10 text-[9px] font-mono text-gray-700">
        POWERED BY ORB CORE SATELLITE SYSTEM
      </div>
    </main>
  );
}
