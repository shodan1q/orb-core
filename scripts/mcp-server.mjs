#!/usr/bin/env node
// mcp-server.mjs
// ----------------------------------------------------------------------------
// MCP Server for OpenClaw / 小艺 voice control.
//
// Exposes satellite control tools via MCP Streamable HTTP transport.
// OpenClaw connects here as MCP client, calls tools, this server forwards
// commands to the web dashboard through the WebSocket relay.
//
// Usage:
//   node scripts/mcp-server.mjs                    # default port 8883
//   MCP_PORT=9000 node scripts/mcp-server.mjs      # custom port
//
// OpenClaw MCP endpoint:  http://<your-ip>:8883/mcp

import http from 'http';
import { WebSocket } from 'ws';
import { networkInterfaces } from 'os';
import crypto from 'crypto';

const MCP_PORT = Number(process.env.MCP_PORT ?? 8883);
const RELAY_URL = process.env.RELAY_URL ?? 'ws://localhost:8882';

// ── Relay Connection ─────────────────────────────────────────────────
let relayWs = null;
let pendingStatus = null; // { resolve, timer }

function connectRelay() {
  try {
    relayWs = new WebSocket(RELAY_URL);
  } catch {
    setTimeout(connectRelay, 3000);
    return;
  }

  relayWs.on('open', () => {
    console.log(`  [relay] connected → ${RELAY_URL}`);
  });

  relayWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'status_response' && pendingStatus) {
        clearTimeout(pendingStatus.timer);
        pendingStatus.resolve(msg);
        pendingStatus = null;
      }
    } catch { /* ignore */ }
  });

  relayWs.on('close', () => {
    relayWs = null;
    setTimeout(connectRelay, 3000);
  });

  relayWs.on('error', () => {});
}

function sendRelay(obj) {
  if (relayWs && relayWs.readyState === WebSocket.OPEN) {
    relayWs.send(JSON.stringify(obj));
  }
}

function requestStatus() {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      if (pendingStatus) {
        pendingStatus = null;
        resolve(null);
      }
    }, 3000);
    pendingStatus = { resolve, timer };
    sendRelay({ type: 'status_request', id, origin: 'mcp-server' });
  });
}

connectRelay();

// ── MCP Tools ────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'take_photo',
    description: '命令卫星拍照。Web界面会自动进入拍照模式。可选传入目标坐标。',
    inputSchema: {
      type: 'object',
      properties: {
        target_lat: { type: 'number', description: '目标纬度' },
        target_lng: { type: 'number', description: '目标经度' },
      },
    },
  },
  {
    name: 'reflect_sunlight',
    description: '启动卫星太阳光反射模式，持续15秒。Web界面显示反射光束效果。',
    inputSchema: {
      type: 'object',
      properties: {
        intensity: { type: 'number', description: '反射强度 0-1，默认 0.8' },
        target_lat: { type: 'number', description: '目标纬度' },
        target_lng: { type: 'number', description: '目标经度' },
      },
    },
  },
  {
    name: 'set_attitude',
    description: '设置卫星姿态角度。Web界面上的卫星3D模型会实时旋转。',
    inputSchema: {
      type: 'object',
      properties: {
        pitch: { type: 'number', description: '俯仰角 -180~180' },
        roll: { type: 'number', description: '横滚角 -180~180' },
        yaw: { type: 'number', description: '偏航角 0~360' },
      },
      required: ['pitch', 'roll', 'yaw'],
    },
  },
  {
    name: 'point_to_sun',
    description: '命令卫星对准太阳方向，用于太阳能充电或阳光反射准备。',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_satellite_status',
    description: '获取卫星完整状态：位置、速度、能量、姿态等遥测数据。',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'navigate_page',
    description: '导航到星核平台的不同页面。可选：dashboard(主控台), pov(第一视角), tracker(卫星追踪), control(控制台), peak(能源系统)',
    inputSchema: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          enum: ['dashboard', 'pov', 'tracker', 'control', 'peak'],
          description: '目标页面',
        },
      },
      required: ['page'],
    },
  },
];

const PAGE_NAMES = {
  dashboard: '主控台',
  pov: '卫星第一视角',
  tracker: '卫星追踪地图',
  control: '卫星控制台',
  peak: '地空能源系统',
};

// ── Tool Handlers ────────────────────────────────────────────────────
async function handleToolCall(name, args) {
  switch (name) {
    case 'take_photo': {
      const { target_lat, target_lng } = args;
      sendRelay({
        type: 'command', action: 'take_photo',
        ...(target_lat != null && target_lng != null ? { lat: target_lat, lng: target_lng } : {}),
        origin: 'mcp-server',
      });
      sendRelay({
        type: 'capture_request', id: crypto.randomUUID(), origin: 'mcp-server',
        ...(target_lat != null && target_lng != null ? { target_lat, target_lng } : {}),
      });
      const pos = target_lat != null ? `目标: ${target_lat}, ${target_lng}` : '当前视角';
      return `拍照指令已发送。${pos}。`;
    }

    case 'reflect_sunlight': {
      const intensity = args.intensity ?? 0.8;
      sendRelay({
        type: 'command', action: 'reflect', intensity,
        ...(args.target_lat != null ? { lat: args.target_lat, lng: args.target_lng } : {}),
        origin: 'mcp-server',
      });
      return `太阳光反射已启动，强度 ${(intensity * 100).toFixed(0)}%，持续15秒。`;
    }

    case 'set_attitude': {
      const { pitch = 0, roll = 0, yaw = 0 } = args;
      sendRelay({ type: 'attitude', pitch, roll, yaw, ts: Date.now(), origin: 'mcp-server' });
      return `卫星姿态已调整: Pitch=${pitch}, Roll=${roll}, Yaw=${yaw}`;
    }

    case 'point_to_sun': {
      sendRelay({ type: 'command', action: 'point_to_sun', origin: 'mcp-server' });
      return '卫星正在调整姿态对准太阳方向。';
    }

    case 'get_satellite_status': {
      const status = await requestStatus();
      if (status) return JSON.stringify(status);
      return '状态请求超时，Dashboard 可能未连接。';
    }

    case 'navigate_page': {
      const { page } = args;
      sendRelay({ type: 'command', action: 'navigate', page, origin: 'mcp-server' });
      return `已导航到${PAGE_NAMES[page] || page}。`;
    }

    default:
      return `未知工具: ${name}`;
  }
}

// ── SSE Sessions ─────────────────────────────────────────────────────
const sessions = new Map(); // sessionId -> { res, alive }

// ── HTTP Server (MCP Streamable HTTP Transport) ──────────────────────
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /sse — SSE endpoint, OpenClaw connects here
  if (req.method === 'GET' && req.url === '/sse') {
    const sessionId = crypto.randomUUID();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // First event: tell client where to POST messages
    const postUrl = `http://${req.headers.host}/message?sessionId=${sessionId}`;
    res.write(`event: endpoint\ndata: ${postUrl}\n\n`);

    sessions.set(sessionId, { res, alive: true });
    console.log(`  [mcp] SSE session ${sessionId.slice(0, 8)} opened`);

    req.on('close', () => {
      sessions.delete(sessionId);
      console.log(`  [mcp] SSE session ${sessionId.slice(0, 8)} closed`);
    });

    // Keepalive
    const keepalive = setInterval(() => {
      if (sessions.has(sessionId)) {
        res.write(': keepalive\n\n');
      } else {
        clearInterval(keepalive);
      }
    }, 15000);

    return;
  }

  // POST /message — MCP client sends JSON-RPC here
  if (req.method === 'POST' && req.url?.startsWith('/message')) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    const session = sessionId ? sessions.get(sessionId) : null;

    let body = '';
    for await (const chunk of req) body += chunk;

    let msg;
    try {
      msg = JSON.parse(body);
    } catch {
      res.writeHead(400);
      res.end('invalid JSON');
      return;
    }

    console.log(`  [mcp] ← ${JSON.stringify(msg).slice(0, 200)}`);

    const { id, method, params } = msg;

    // Handle JSON-RPC methods
    let response;

    if (method === 'initialize') {
      response = {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'orb-core-mcp-server', version: '1.0.0' },
        },
      };
    } else if (method === 'ping') {
      response = { jsonrpc: '2.0', id, result: {} };
    } else if (method === 'notifications/initialized') {
      // Client notification, no response needed
      res.writeHead(202);
      res.end();
      return;
    } else if (method === 'tools/list') {
      response = { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    } else if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments ?? {};
      const resultText = await handleToolCall(toolName, args);
      response = {
        jsonrpc: '2.0', id,
        result: {
          content: [{ type: 'text', text: resultText }],
          isError: false,
        },
      };
    } else {
      response = {
        jsonrpc: '2.0', id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
    }

    // Send response through SSE if session exists, otherwise direct HTTP response
    if (session) {
      const data = JSON.stringify(response);
      session.res.write(`event: message\ndata: ${data}\n\n`);
      console.log(`  [mcp] → (SSE) ${data.slice(0, 200)}`);
      res.writeHead(202);
      res.end();
    } else {
      // Fallback: return response directly in HTTP body
      const data = JSON.stringify(response);
      console.log(`  [mcp] → (HTTP) ${data.slice(0, 200)}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    }
    return;
  }

  // POST /mcp — Streamable HTTP (single request/response, no SSE needed)
  if (req.method === 'POST' && req.url === '/mcp') {
    let body = '';
    for await (const chunk of req) body += chunk;

    let msg;
    try {
      msg = JSON.parse(body);
    } catch {
      res.writeHead(400);
      res.end('invalid JSON');
      return;
    }

    console.log(`  [mcp] ← ${JSON.stringify(msg).slice(0, 200)}`);

    const { id, method, params } = msg;
    let response;

    if (method === 'initialize') {
      response = {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'orb-core-mcp-server', version: '1.0.0' },
        },
      };
    } else if (method === 'ping') {
      response = { jsonrpc: '2.0', id, result: {} };
    } else if (method === 'notifications/initialized') {
      res.writeHead(202);
      res.end();
      return;
    } else if (method === 'tools/list') {
      response = { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    } else if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments ?? {};
      const resultText = await handleToolCall(toolName, args);
      response = {
        jsonrpc: '2.0', id,
        result: {
          content: [{ type: 'text', text: resultText }],
          isError: false,
        },
      };
    } else {
      response = {
        jsonrpc: '2.0', id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
    }

    const data = JSON.stringify(response);
    console.log(`  [mcp] → ${data.slice(0, 200)}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(data);
    return;
  }

  // GET / — health check
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'orb-core-mcp-server',
      status: 'ok',
      relay: relayWs?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
      sessions: sessions.size,
      tools: TOOLS.map(t => t.name),
    }));
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(MCP_PORT, '0.0.0.0', () => {
  function localIps() {
    const ifaces = networkInterfaces();
    const out = [];
    for (const name of Object.keys(ifaces)) {
      for (const info of ifaces[name] ?? []) {
        if (info.family === 'IPv4' && !info.internal) out.push(`${info.address}  (${name})`);
      }
    }
    return out;
  }

  console.log('');
  console.log('  ORB CORE · MCP Server (OpenClaw)');
  console.log('  ─────────────────────────────────');
  console.log(`  SSE endpoint:        http://0.0.0.0:${MCP_PORT}/sse`);
  console.log(`  Streamable HTTP:     http://0.0.0.0:${MCP_PORT}/mcp`);
  console.log(`  Health check:        http://0.0.0.0:${MCP_PORT}/`);
  console.log(`  Relay:               ${RELAY_URL}`);
  console.log('');
  console.log('  LAN endpoints:');
  for (const ip of localIps()) {
    console.log(`    http://${ip.split('  ')[0]}:${MCP_PORT}/sse   ${ip.split('  ')[1]}`);
  }
  console.log('');
  console.log('  Tools: ' + TOOLS.map(t => t.name).join(', '));
  console.log('');
});
