'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const OPENCLAW_WS_URL =
  'wss://api.xiaozhi.me/mcp/?token=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEzOTEzMiwiYWdlbnRJZCI6MTY4NTY1NywiZW5kcG9pbnRJZCI6ImFnZW50XzE2ODU2NTciLCJwdXJwb3NlIjoibWNwLWVuZHBvaW50IiwiaWF0IjoxNzc1NTc4NjMyLCJleHAiOjE4MDcxMzYyMzJ9.DF8QMXrUZho08bDKKeRpane2K8y3HhrcoDYMR73E5tJ21NN3qnnH4erBYLCaEGYbJVA9mx_IDvR9--oCyDJTWQ';

const RELAY_WS_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_REMOTE_WS_URL) ||
  'ws://localhost:8882';

const PROTOCOL_VERSION = '2024-11-05';

let _uidSeq = 0;
const uid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  _uidSeq += 1;
  return `id-${Date.now().toString(36)}-${_uidSeq}`;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  ts: number;
};

type LogEntry = {
  id: string;
  dir: 'in' | 'out' | 'info' | 'error';
  text: string;
  ts: number;
};

type ConnState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

// MCP tools we expose. XiaoZhi (acting as MCP client) will discover and call these.
const TOOLS = [
  {
    name: 'push_message',
    description:
      '把一段对话消息推送到网页上展示。每当用户对话或产生回复时调用此工具，把内容同步给网页。',
    inputSchema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: ['user', 'assistant'],
          description: '消息来源：user 表示用户说的话，assistant 表示小智回复',
        },
        text: {
          type: 'string',
          description: '消息文本内容',
        },
      },
      required: ['role', 'text'],
    },
  },
  {
    name: 'clear_messages',
    description: '清空网页上的所有对话消息。',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'take_photo',
    description:
      '命令卫星拍照。卫星会调整姿态对准目标并拍摄一张太空照片，Web界面会自动进入拍照模式并展示结果。',
    inputSchema: {
      type: 'object',
      properties: {
        target_lat: {
          type: 'number',
          description: '目标纬度（可选），例如 39.9 表示北京',
        },
        target_lng: {
          type: 'number',
          description: '目标经度（可选），例如 116.4 表示北京',
        },
      },
    },
  },
  {
    name: 'reflect_sunlight',
    description:
      '启动卫星太阳光反射模式，持续15秒。反射镜会将阳光定向反射到地面指定位置。Web界面会自动显示反射光束效果。',
    inputSchema: {
      type: 'object',
      properties: {
        intensity: {
          type: 'number',
          description: '反射强度 0-1，默认 0.8',
        },
        target_lat: {
          type: 'number',
          description: '目标纬度（可选）',
        },
        target_lng: {
          type: 'number',
          description: '目标经度（可选）',
        },
      },
    },
  },
  {
    name: 'set_attitude',
    description:
      '设置卫星姿态角度。控制卫星的俯仰(pitch)、横滚(roll)和偏航(yaw)，Web界面上的卫星3D模型会实时旋转到对应角度。',
    inputSchema: {
      type: 'object',
      properties: {
        pitch: {
          type: 'number',
          description: '俯仰角，范围 -180 到 180 度',
        },
        roll: {
          type: 'number',
          description: '横滚角，范围 -180 到 180 度',
        },
        yaw: {
          type: 'number',
          description: '偏航角，范围 0 到 360 度',
        },
      },
      required: ['pitch', 'roll', 'yaw'],
    },
  },
  {
    name: 'get_satellite_status',
    description:
      '获取卫星完整状态，包括当前位置（经纬度、海拔）、速度、能量、姿态角度等全部遥测数据。',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'navigate_page',
    description:
      '导航到星核控制平台的不同页面。可用页面：dashboard（主控台）、pov（卫星第一视角）、tracker（卫星追踪地图）、control（卫星控制台面板）、peak（地空能源系统）。',
    inputSchema: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          enum: ['dashboard', 'pov', 'tracker', 'control', 'peak'],
          description: '要导航到的页面',
        },
      },
      required: ['page'],
    },
  },
  {
    name: 'point_to_sun',
    description:
      '命令卫星对准太阳方向。卫星会自动调整姿态朝向太阳，用于太阳能充电或阳光反射准备。Web界面上的卫星会转向太阳。',
    inputSchema: { type: 'object', properties: {} },
  },
] as const;

export default function XiaoYiPage() {
  const [state, setState] = useState<ConnState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const relayWsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const manualCloseRef = useRef(false);

  const log = useCallback((dir: LogEntry['dir'], text: string) => {
    setLogs((l) => {
      const next = [
        ...l,
        { id: uid(), dir, text, ts: Date.now() },
      ];
      return next.length > 300 ? next.slice(-300) : next;
    });
  }, []);

  // ── Relay WebSocket (to dashboard) ──────────────────────────────────
  const sendToRelay = useCallback((obj: unknown) => {
    const ws = relayWsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(obj));
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;
    let retryHandle: number | null = null;

    const connectRelay = () => {
      if (cancelled) return;
      try {
        ws = new WebSocket(RELAY_WS_URL);
      } catch {
        return;
      }
      relayWsRef.current = ws;

      ws.onopen = () => log('info', `relay connected → ${RELAY_WS_URL}`);
      ws.onclose = () => {
        relayWsRef.current = null;
        if (!cancelled) retryHandle = window.setTimeout(connectRelay, 3000);
      };
      ws.onmessage = (ev) => {
        // Listen for status_response from the dashboard
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'status_response') {
            // Store temporarily for pending status request
            pendingStatusResolve.current?.(msg);
            pendingStatusResolve.current = null;
          }
        } catch { /* ignore */ }
      };
    };

    connectRelay();
    return () => {
      cancelled = true;
      if (retryHandle) window.clearTimeout(retryHandle);
      ws?.close();
    };
  }, [log]);

  const pendingStatusResolve = useRef<((value: unknown) => void) | null>(null);

  const requestStatus = useCallback((): Promise<unknown> => {
    return new Promise((resolve) => {
      pendingStatusResolve.current = resolve;
      const reqId = uid();
      sendToRelay({ type: 'status_request', id: reqId, origin: 'openclaw-mcp' });
      // Timeout after 3s
      setTimeout(() => {
        if (pendingStatusResolve.current === resolve) {
          pendingStatusResolve.current = null;
          resolve(null);
        }
      }, 3000);
    });
  }, [sendToRelay]);

  // ── XiaoZhi MCP WebSocket ──────────────────────────────────────────
  const send = useCallback(
    (obj: unknown) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const text = JSON.stringify(obj);
      ws.send(text);
      log('out', text);
    },
    [log]
  );

  const handleRequest = useCallback(
    (msg: { id: number | string; method: string; params?: Record<string, unknown> }) => {
      const { id, method, params } = msg;

      if (method === 'initialize') {
        send({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: { name: 'orb-core-openclaw-bridge', version: '0.2.0' },
          },
        });
        return;
      }

      if (method === 'ping') {
        send({ jsonrpc: '2.0', id, result: {} });
        return;
      }

      if (method === 'tools/list') {
        send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
        return;
      }

      if (method === 'tools/call') {
        const name = params?.name as string;
        const args = (params?.arguments ?? {}) as Record<string, unknown>;

        // ── push_message ──
        if (name === 'push_message') {
          const role = (args.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant';
          const text = String(args.text ?? '');
          setMessages((m) => [...m, { id: uid(), role, text, ts: Date.now() }]);
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'ok' }], isError: false } });
          return;
        }

        // ── clear_messages ──
        if (name === 'clear_messages') {
          setMessages([]);
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'cleared' }], isError: false } });
          return;
        }

        // ── take_photo ──
        if (name === 'take_photo') {
          const lat = args.target_lat as number | undefined;
          const lng = args.target_lng as number | undefined;
          // Send command through relay to dashboard
          sendToRelay({
            type: 'command',
            action: 'take_photo',
            ...(lat != null && lng != null ? { lat, lng } : {}),
            origin: 'openclaw-mcp',
          });
          // Also request a capture
          sendToRelay({
            type: 'capture_request',
            id: uid(),
            origin: 'openclaw-mcp',
            ...(lat != null && lng != null ? { target_lat: lat, target_lng: lng } : {}),
          });
          const posInfo = lat != null && lng != null ? `目标坐标: ${lat}, ${lng}` : '当前视角';
          send({
            jsonrpc: '2.0', id,
            result: { content: [{ type: 'text', text: `拍照指令已发送。${posInfo}。Web界面已进入拍照模式。` }], isError: false },
          });
          return;
        }

        // ── reflect_sunlight ──
        if (name === 'reflect_sunlight') {
          const intensity = (args.intensity as number) ?? 0.8;
          const lat = args.target_lat as number | undefined;
          const lng = args.target_lng as number | undefined;
          sendToRelay({
            type: 'command',
            action: 'reflect',
            intensity,
            ...(lat != null && lng != null ? { lat, lng } : {}),
            origin: 'openclaw-mcp',
          });
          send({
            jsonrpc: '2.0', id,
            result: { content: [{ type: 'text', text: `太阳光反射已启动，强度 ${(intensity * 100).toFixed(0)}%，持续15秒。Web界面已显示反射光束。` }], isError: false },
          });
          return;
        }

        // ── set_attitude ──
        if (name === 'set_attitude') {
          const pitch = (args.pitch as number) ?? 0;
          const roll = (args.roll as number) ?? 0;
          const yaw = (args.yaw as number) ?? 0;
          sendToRelay({
            type: 'attitude',
            pitch,
            roll,
            yaw,
            ts: Date.now(),
            origin: 'openclaw-mcp',
          });
          send({
            jsonrpc: '2.0', id,
            result: { content: [{ type: 'text', text: `卫星姿态已调整: Pitch=${pitch.toFixed(1)}, Roll=${roll.toFixed(1)}, Yaw=${yaw.toFixed(1)}` }], isError: false },
          });
          return;
        }

        // ── get_satellite_status ──
        if (name === 'get_satellite_status') {
          requestStatus().then((statusData) => {
            if (statusData) {
              send({
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: JSON.stringify(statusData) }], isError: false },
              });
            } else {
              send({
                jsonrpc: '2.0', id,
                result: { content: [{ type: 'text', text: '状态请求超时，Dashboard 可能未连接。' }], isError: false },
              });
            }
          });
          return;
        }

        // ── navigate_page ──
        if (name === 'navigate_page') {
          const page = args.page as string;
          sendToRelay({
            type: 'command',
            action: 'navigate',
            page,
            origin: 'openclaw-mcp',
          } as unknown);
          const pageNames: Record<string, string> = {
            dashboard: '主控台',
            pov: '卫星第一视角',
            tracker: '卫星追踪地图',
            control: '卫星控制台',
            peak: '地空能源系统',
          };
          send({
            jsonrpc: '2.0', id,
            result: { content: [{ type: 'text', text: `已导航到${pageNames[page] || page}页面。` }], isError: false },
          });
          return;
        }

        // ── point_to_sun ──
        if (name === 'point_to_sun') {
          sendToRelay({
            type: 'command',
            action: 'point_to_sun',
            origin: 'openclaw-mcp',
          });
          send({
            jsonrpc: '2.0', id,
            result: { content: [{ type: 'text', text: '卫星正在调整姿态对准太阳方向。' }], isError: false },
          });
          return;
        }

        send({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        });
        return;
      }

      // Unknown method
      send({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
    },
    [send, sendToRelay, requestStatus]
  );

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;
    manualCloseRef.current = false;
    setState('connecting');
    log('info', 'connecting...');
    let ws: WebSocket;
    try {
      ws = new WebSocket(OPENCLAW_WS_URL);
    } catch (e) {
      log('error', `WebSocket ctor failed: ${(e as Error).message}`);
      setState('error');
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      setState('open');
      log('info', 'connected');
    };

    ws.onmessage = (ev) => {
      const raw = typeof ev.data === 'string' ? ev.data : '';
      log('in', raw);
      let msg: { jsonrpc?: string; id?: number | string; method?: string; params?: Record<string, unknown> };
      try {
        msg = JSON.parse(raw);
      } catch {
        log('error', 'invalid JSON');
        return;
      }
      if (msg.method) {
        if (msg.id !== undefined) {
          handleRequest(msg as Required<typeof msg>);
        }
      }
    };

    ws.onerror = () => {
      log('error', 'socket error');
      setState('error');
    };

    ws.onclose = (ev) => {
      setState('closed');
      log('info', `closed (code=${ev.code} reason=${ev.reason || '-'})`);
      if (!manualCloseRef.current) {
        if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
        reconnectRef.current = window.setTimeout(() => connect(), 3000);
      }
    };
  }, [handleRequest, log]);

  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    if (reconnectRef.current) {
      window.clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    wsRef.current?.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      manualCloseRef.current = true;
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const stateColor =
    state === 'open'
      ? 'bg-emerald-400'
      : state === 'connecting'
        ? 'bg-amber-400 animate-pulse'
        : state === 'error'
          ? 'bg-rose-500'
          : 'bg-zinc-500';

  return (
    <div className="min-h-screen bg-[#000005] text-zinc-200 font-mono">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl tracking-widest text-cyan-300">
              OPENCLAW · MCP BRIDGE
            </h1>
            <p className="text-[11px] text-zinc-500 mt-1">
              OpenClaw MCP 端点桥 — 语音控制卫星姿态、拍照、反射阳光、页面导航
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className={`w-2 h-2 rounded-full ${stateColor}`} />
              <span className="uppercase tracking-widest">{state}</span>
            </div>
            {state === 'open' ? (
              <button
                onClick={disconnect}
                className="text-[11px] px-3 py-1 border border-zinc-700 hover:border-rose-500 hover:text-rose-400 transition-colors"
              >
                DISCONNECT
              </button>
            ) : (
              <button
                onClick={connect}
                className="text-[11px] px-3 py-1 border border-zinc-700 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
              >
                CONNECT
              </button>
            )}
            <button
              onClick={() => setMessages([])}
              className="text-[11px] px-3 py-1 border border-zinc-700 hover:border-amber-500 hover:text-amber-400 transition-colors"
            >
              CLEAR
            </button>
            <button
              onClick={() => setShowLogs((s) => !s)}
              className="text-[11px] px-3 py-1 border border-zinc-700 hover:border-zinc-400 transition-colors"
            >
              {showLogs ? 'HIDE LOGS' : 'SHOW LOGS'}
            </button>
          </div>
        </header>

        <section className="border border-zinc-800 bg-zinc-950/40 mb-6">
          <div className="px-4 py-2 border-b border-zinc-800 text-[10px] tracking-widest text-zinc-500">
            CONVERSATION · {messages.length}
          </div>
          <div className="p-4 max-h-[55vh] overflow-y-auto space-y-3">
            {messages.length === 0 && (
              <div className="text-[11px] text-zinc-600 text-center py-12">
                等待 OpenClaw 推送消息…
                <br />
                <span className="text-zinc-700">
                  通过小艺语音说"帮我拍张照片"、"打开卫星追踪"、"调整卫星姿态"试试
                </span>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-100'
                      : 'bg-zinc-800/40 border border-zinc-700 text-zinc-100'
                  }`}
                >
                  <div className="text-[9px] tracking-widest opacity-60 mb-1">
                    {m.role === 'user' ? 'USER' : 'OPENCLAW'} ·{' '}
                    {new Date(m.ts).toLocaleTimeString()}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {showLogs && (
          <section className="border border-zinc-800 bg-zinc-950/40">
            <div className="px-4 py-2 border-b border-zinc-800 text-[10px] tracking-widest text-zinc-500 flex justify-between">
              <span>JSON-RPC LOG · {logs.length}</span>
              <button
                onClick={() => setLogs([])}
                className="hover:text-zinc-300"
              >
                clear
              </button>
            </div>
            <div className="p-3 max-h-[40vh] overflow-y-auto space-y-1 text-[10px] leading-relaxed">
              {logs.map((l) => (
                <div key={l.id} className="flex gap-2">
                  <span className="text-zinc-600 shrink-0">
                    {new Date(l.ts).toLocaleTimeString()}
                  </span>
                  <span
                    className={`shrink-0 w-10 ${
                      l.dir === 'in'
                        ? 'text-emerald-400'
                        : l.dir === 'out'
                          ? 'text-cyan-400'
                          : l.dir === 'error'
                            ? 'text-rose-400'
                            : 'text-zinc-500'
                    }`}
                  >
                    {l.dir.toUpperCase()}
                  </span>
                  <span className="text-zinc-400 break-all whitespace-pre-wrap">
                    {l.text}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
