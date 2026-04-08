'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const XIAOZHI_WS_URL =
  'wss://api.xiaozhi.me/mcp/?token=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEzOTEzMiwiYWdlbnRJZCI6MTY4NTY1NywiZW5kcG9pbnRJZCI6ImFnZW50XzE2ODU2NTciLCJwdXJwb3NlIjoibWNwLWVuZHBvaW50IiwiaWF0IjoxNzc1NTc4NjMyLCJleHAiOjE4MDcxMzYyMzJ9.DF8QMXrUZho08bDKKeRpane2K8y3HhrcoDYMR73E5tJ21NN3qnnH4erBYLCaEGYbJVA9mx_IDvR9--oCyDJTWQ';

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
      '把一段对话消息推送到网页上展示。每当用户与小智对话或小智产生回复时调用此工具，把内容同步给网页。',
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
] as const;

export default function XiaoZhiPage() {
  const [state, setState] = useState<ConnState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
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
            serverInfo: { name: 'orb-core-xiaozhi-bridge', version: '0.1.0' },
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

        if (name === 'push_message') {
          const role = (args.role === 'assistant' ? 'assistant' : 'user') as
            | 'user'
            | 'assistant';
          const text = String(args.text ?? '');
          setMessages((m) => [
            ...m,
            { id: uid(), role, text, ts: Date.now() },
          ]);
          send({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: 'ok' }],
              isError: false,
            },
          });
          return;
        }

        if (name === 'clear_messages') {
          setMessages([]);
          send({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: 'cleared' }],
              isError: false,
            },
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
    [send]
  );

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;
    manualCloseRef.current = false;
    setState('connecting');
    log('info', 'connecting...');
    let ws: WebSocket;
    try {
      ws = new WebSocket(XIAOZHI_WS_URL);
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
        } else {
          // notification — nothing to reply, but log e.g. notifications/initialized
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
              XIAOZHI · MCP BRIDGE
            </h1>
            <p className="text-[11px] text-zinc-500 mt-1">
              小智 MCP 端点桥 — 通过 push_message 工具把对话同步到网页
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
                等待小智推送消息…
                <br />
                <span className="text-zinc-700">
                  对小智说点什么，看看是否会调用 push_message 工具
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
                    {m.role === 'user' ? 'USER' : 'XIAOZHI'} ·{' '}
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
