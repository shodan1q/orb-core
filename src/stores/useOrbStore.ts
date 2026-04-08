import { create } from 'zustand';

export type AnimationPhase =
  | 'idle'
  | 'launch'
  | 'orbiting'
  | 'photo-sequence'
  | 'reflection-sequence'
  | 'satellite-closeup';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
};

interface OrbState {
  // Animation
  phase: AnimationPhase;
  setPhase: (phase: AnimationPhase) => void;

  // Energy
  energy: number;
  maxEnergy: number;
  consumeEnergy: (amount: number) => void;
  rechargeEnergy: (amount: number) => void;

  // Satellite
  satelliteLat: number;
  satelliteLng: number;
  satelliteAlt: number;
  velocity: number;
  updateSatellitePosition: (lat: number, lng: number, alt: number, velocity: number) => void;

  // Target
  targetLat: number | null;
  targetLng: number | null;
  setTarget: (lat: number, lng: number) => void;
  clearTarget: () => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;

  // Photo
  lastPhoto: string | null;
  setLastPhoto: (url: string | null) => void;

  // Reflection
  reflectionActive: boolean;
  reflectionIntensity: number;
  setReflection: (active: boolean, intensity?: number) => void;

  // UI
  showLaunch: boolean;
  setShowLaunch: (show: boolean) => void;
  showPhotoViewer: boolean;
  setShowPhotoViewer: (show: boolean) => void;
}

export const useOrbStore = create<OrbState>((set) => ({
  phase: 'launch',
  setPhase: (phase) => set({ phase }),

  energy: 850,
  maxEnergy: 1000,
  consumeEnergy: (amount) =>
    set((s) => ({ energy: Math.max(0, s.energy - amount) })),
  rechargeEnergy: (amount) =>
    set((s) => ({ energy: Math.min(s.maxEnergy, s.energy + amount) })),

  satelliteLat: 0,
  satelliteLng: 0,
  satelliteAlt: 408,
  velocity: 7.66,
  updateSatellitePosition: (lat, lng, alt, velocity) =>
    set({ satelliteLat: lat, satelliteLng: lng, satelliteAlt: alt, velocity }),

  targetLat: null,
  targetLng: null,
  setTarget: (lat, lng) => set({ targetLat: lat, targetLng: lng }),
  clearTarget: () => set({ targetLat: null, targetLng: null }),

  messages: [
    {
      id: '0',
      role: 'system',
      content: '[ORB CORE] 系统已上线。太阳能面板展开完毕，能量充足。等待指令...',
      timestamp: Date.now(),
    },
  ],
  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { ...msg, id: String(s.messages.length), timestamp: Date.now() },
      ],
    })),

  lastPhoto: null,
  setLastPhoto: (url) => set({ lastPhoto: url }),

  reflectionActive: false,
  reflectionIntensity: 0,
  setReflection: (active, intensity = 0.8) =>
    set({ reflectionActive: active, reflectionIntensity: intensity }),

  showLaunch: true,
  setShowLaunch: (show) => set({ showLaunch: show }),
  showPhotoViewer: false,
  setShowPhotoViewer: (show) => set({ showPhotoViewer: show }),
}));
