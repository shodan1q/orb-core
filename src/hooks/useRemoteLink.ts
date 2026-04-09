'use client';

// useRemoteLink
// ----------------------------------------------------------------------------
// Client hook that connects the dashboard to the HarmonyOS orbcore-app over a
// WebSocket relay. The phone streams messages of the form
//   { type: "attitude", pitch, roll, yaw, ts }
// at ~30 Hz; this hook pipes them into the zustand store after a light
// smoothing pass so the 3D satellite can rotate in lockstep with the handset.
// Command messages from the phone
//   { type: "command", action: "take_photo" | "reflect" | "status" }
// are forwarded via the optional onCommand callback.
//
// The relay URL is read from NEXT_PUBLIC_REMOTE_WS_URL, with a localhost
// fallback for on-desk development. During the hackathon demo we run a small
// ws relay on port 8882 so the phone and the dashboard can meet on the same
// LAN without a Next.js server route.

import { useEffect, useRef, useCallback } from 'react';
import { useOrbStore } from '@/stores/useOrbStore';

// Module-level WS ref so sendRemoteAttitude can reach the live socket
// without requiring the hook caller to thread it through props.
let activeWs: WebSocket | null = null;

type AttitudeMessage = {
  type: 'attitude';
  pitch: number;
  roll: number;
  yaw: number;
  ts?: number;
};

type CommandMessage = {
  type: 'command';
  action: 'take_photo' | 'reflect' | 'status';
};

type RemoteMessage = AttitudeMessage | CommandMessage;

export type RemoteCommand = CommandMessage['action'];

interface Options {
  url?: string;
  enabled?: boolean;
  onCommand?: (action: RemoteCommand) => void;
}

const DEFAULT_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_REMOTE_WS_URL) ||
  'ws://localhost:8882';

export function useRemoteLink({ url, enabled = true, onCommand }: Options = {}) {
  const setAttitude = useOrbStore((s) => s.setAttitude);
  const setRemoteLink = useOrbStore((s) => s.setRemoteLink);

  // Keep a ref so smoothing state survives re-renders without re-subscribing.
  const smoothed = useRef({ pitch: 0, roll: 0, yaw: 0 });
  const lastStoreUpdate = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const endpoint = url ?? DEFAULT_URL;
    let ws: WebSocket | null = null;
    let cancelled = false;
    let retryHandle: number | null = null;

    const connect = () => {
      if (cancelled) return;
      setRemoteLink('connecting', endpoint);
      try {
        ws = new WebSocket(endpoint);
      } catch (err) {
        setRemoteLink('error', (err as Error).message);
        scheduleRetry();
        return;
      }

      ws.onopen = () => {
        activeWs = ws;
        setRemoteLink('connected', 'link established');
      };
      ws.onclose = () => {
        activeWs = null;
        setRemoteLink('idle', 'link closed');
        scheduleRetry();
      };
      ws.onerror = () => setRemoteLink('error', 'socket error');
      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        let msg: RemoteMessage;
        try {
          msg = JSON.parse(event.data) as RemoteMessage;
        } catch {
          return;
        }
        if (msg.type === 'attitude') {
          // Lerp towards the incoming sample for butter-smooth 3D rotation.
          const t = 0.25;
          smoothed.current.pitch += (msg.pitch - smoothed.current.pitch) * t;
          smoothed.current.roll += (msg.roll - smoothed.current.roll) * t;
          // yaw wraps — shortest-path lerp.
          let diff = msg.yaw - smoothed.current.yaw;
          while (diff > 180) diff -= 360;
          while (diff < -180) diff += 360;
          smoothed.current.yaw = (smoothed.current.yaw + diff * t + 360) % 360;
          // Throttle store updates to ~10 Hz to avoid re-rendering the
          // entire component tree 30 times per second.
          const now = performance.now();
          if (now - lastStoreUpdate.current < 100) return;
          lastStoreUpdate.current = now;
          setAttitude(
            smoothed.current.pitch,
            smoothed.current.roll,
            smoothed.current.yaw
          );
        } else if (msg.type === 'command') {
          onCommand?.(msg.action);
        }
      };
    };

    const scheduleRetry = () => {
      if (cancelled || retryHandle !== null) return;
      retryHandle = window.setTimeout(() => {
        retryHandle = null;
        connect();
      }, 2500);
    };

    connect();

    return () => {
      cancelled = true;
      if (retryHandle !== null) window.clearTimeout(retryHandle);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      activeWs = null;
      setRemoteLink('idle', 'disposed');
    };
  }, [url, enabled, onCommand, setAttitude, setRemoteLink]);
}

/**
 * Send an attitude frame from the web dashboard back through the relay
 * so connected phones can mirror the control-panel state.
 */
export function sendRemoteAttitude(pitch: number, roll: number, yaw: number): void {
  if (!activeWs || activeWs.readyState !== WebSocket.OPEN) return;
  const msg = JSON.stringify({
    type: 'attitude',
    pitch: +pitch.toFixed(2),
    roll: +roll.toFixed(2),
    yaw: +yaw.toFixed(2),
    ts: Date.now(),
    origin: 'web',
  });
  activeWs.send(msg);
}
