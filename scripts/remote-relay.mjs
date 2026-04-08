#!/usr/bin/env node
// remote-relay.mjs
// ----------------------------------------------------------------------------
// Minimal fan-out WebSocket relay for the HarmonyOS ground-station demo.
//
//   HarmonyOS phone (orbcore-app) ──┐
//                                   ├──►  this relay  ──►  orb-core web dashboard
//   future devices (小智 etc.) ─────┘
//
// Anything one client sends is broadcast to every other connected client. The
// phone streams attitude frames; the web dashboard streams nothing back yet,
// but could (e.g. status pings) without code changes. No auth, no persistence
// — hackathon-grade, meant to run on the presenter's laptop over the LAN.
//
// Usage:
//   npm install ws           # once, inside orb-core/
//   node scripts/remote-relay.mjs           # defaults to 0.0.0.0:3001
//   PORT=4000 node scripts/remote-relay.mjs # custom port
//
// On the phone, enter:   ws://<your-laptop-ip>:3001
// On the web dashboard:  NEXT_PUBLIC_REMOTE_WS_URL=ws://localhost:3001

import { WebSocketServer } from 'ws';
import { networkInterfaces } from 'os';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';

const wss = new WebSocketServer({ host: HOST, port: PORT });

function ts() {
  return new Date().toISOString().substring(11, 23);
}

function localIps() {
  const ifaces = networkInterfaces();
  const out = [];
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] ?? []) {
      if (info.family === 'IPv4' && !info.internal) {
        out.push(`${info.address}  (${name})`);
      }
    }
  }
  return out;
}

let nextId = 1;

wss.on('connection', (ws, req) => {
  const id = nextId++;
  const peer = req.socket.remoteAddress;
  console.log(`[${ts()}] + client #${id} from ${peer}`);
  ws.isAlive = true;
  ws.clientId = id;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data, isBinary) => {
    // Broadcast to every other connected client.
    for (const peer of wss.clients) {
      if (peer !== ws && peer.readyState === 1) {
        peer.send(data, { binary: isBinary });
      }
    }

    // Very light tracing: only print JSON control frames, not the attitude
    // firehose (30 Hz would flood the terminal).
    if (!isBinary) {
      try {
        const text = data.toString();
        const parsed = JSON.parse(text);
        if (parsed.type !== 'attitude') {
          console.log(`[${ts()}] #${id} -> ${text}`);
        }
      } catch {
        // non-JSON, ignore
      }
    }
  });

  ws.on('close', () => {
    console.log(`[${ts()}] - client #${id} disconnected`);
  });

  ws.on('error', (err) => {
    console.log(`[${ts()}] ! client #${id} error: ${err.message}`);
  });
});

// Heartbeat — drop zombie sockets.
const interval = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      // ignore
    }
  }
}, 15_000);

wss.on('close', () => clearInterval(interval));

console.log('');
console.log('  ORB CORE · Remote Relay');
console.log('  ────────────────────────');
console.log(`  Listening on ws://${HOST}:${PORT}`);
console.log('  LAN endpoints:');
for (const ip of localIps()) {
  console.log(`    ws://${ip.split('  ')[0]}:${PORT}   ${ip.split('  ')[1]}`);
}
console.log('');
console.log('  Phone  → type this URL on the orbcore-app landing screen');
console.log('  Web    → NEXT_PUBLIC_REMOTE_WS_URL=ws://localhost:' + PORT);
console.log('');
