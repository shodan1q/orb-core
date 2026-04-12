'use client';

import { useEffect, useState, useCallback } from 'react';

type LogEntry = {
  id: string;
  text: string;
  ts: number;
};

let _seq = 0;
const uid = () => `log-${Date.now()}-${++_seq}`;

export default function XiaoYiPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const mcpUrl =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MCP_URL) ||
    'http://localhost:8883';

  const addLog = useCallback((text: string) => {
    setLogs((l) => {
      const next = [...l, { id: uid(), text, ts: Date.now() }];
      return next.length > 100 ? next.slice(-100) : next;
    });
  }, []);

  // Poll health endpoint
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${mcpUrl}/`);
        const data = await res.json();
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) setHealth(null);
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [mcpUrl]);

  // Quick test buttons
  const callTool = async (name: string, args: Record<string, unknown> = {}) => {
    addLog(`→ tools/call: ${name}(${JSON.stringify(args)})`);
    try {
      const res = await fetch(`${mcpUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: { name, arguments: args },
        }),
      });
      const data = await res.json();
      const text = data.result?.content?.[0]?.text ?? JSON.stringify(data);
      addLog(`← ${text}`);
    } catch (err) {
      addLog(`! error: ${(err as Error).message}`);
    }
  };

  const relayOk = health && (health as { relay?: string }).relay === 'connected';
  const serverOk = health !== null;

  return (
    <div className="min-h-screen bg-[#000005] text-zinc-200 font-mono">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="mb-6">
          <h1 className="text-xl tracking-widest text-cyan-300">
            OPENCLAW · MCP SERVER MONITOR
          </h1>
          <p className="text-[11px] text-zinc-500 mt-1">
            MCP Server 状态监控 — OpenClaw / 小艺通过 SSE 或 HTTP 连接此端点控制卫星
          </p>
        </header>

        {/* Status */}
        <section className="border border-zinc-800 bg-zinc-950/40 mb-6 p-4">
          <div className="text-[10px] tracking-widest text-zinc-500 mb-3">SERVER STATUS</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${serverOk ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                <span className="text-zinc-400">MCP Server</span>
              </div>
              <div className="text-[11px] text-zinc-600 mt-1">{mcpUrl}</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${relayOk ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-zinc-400">WebSocket Relay</span>
              </div>
              <div className="text-[11px] text-zinc-600 mt-1">
                {relayOk ? 'connected' : 'disconnected'}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-zinc-400">SSE Sessions</span>
              </div>
              <div className="text-[11px] text-zinc-600 mt-1">
                {(health as { sessions?: number })?.sessions ?? 0}
              </div>
            </div>
          </div>

          {health && (
            <div className="mt-4 text-[10px] text-zinc-600">
              Tools: {((health as { tools?: string[] }).tools ?? []).join(' / ')}
            </div>
          )}

          <div className="mt-4 text-[10px] text-zinc-500">
            <div>SSE endpoint: <span className="text-cyan-400">{mcpUrl}/sse</span></div>
            <div>HTTP endpoint: <span className="text-cyan-400">{mcpUrl}/mcp</span></div>
          </div>
        </section>

        {/* Quick Test */}
        <section className="border border-zinc-800 bg-zinc-950/40 mb-6 p-4">
          <div className="text-[10px] tracking-widest text-zinc-500 mb-3">QUICK TEST</div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'take_photo', fn: () => callTool('take_photo', { target_lat: 22.53, target_lng: 113.93 }) },
              { label: 'reflect_sunlight', fn: () => callTool('reflect_sunlight', { intensity: 0.8 }) },
              { label: 'set_attitude (yaw=90)', fn: () => callTool('set_attitude', { pitch: 0, roll: 0, yaw: 90 }) },
              { label: 'point_to_sun', fn: () => callTool('point_to_sun') },
              { label: 'get_status', fn: () => callTool('get_satellite_status') },
              { label: 'nav → tracker', fn: () => callTool('navigate_page', { page: 'tracker' }) },
              { label: 'nav → pov', fn: () => callTool('navigate_page', { page: 'pov' }) },
              { label: 'nav → dashboard', fn: () => callTool('navigate_page', { page: 'dashboard' }) },
              { label: 'nav → control', fn: () => callTool('navigate_page', { page: 'control' }) },
              { label: 'nav → peak', fn: () => callTool('navigate_page', { page: 'peak' }) },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.fn}
                disabled={!serverOk}
                className="text-[11px] px-3 py-1.5 border border-zinc-700 hover:border-cyan-500 hover:text-cyan-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </section>

        {/* Logs */}
        <section className="border border-zinc-800 bg-zinc-950/40">
          <div className="px-4 py-2 border-b border-zinc-800 text-[10px] tracking-widest text-zinc-500 flex justify-between">
            <span>LOG · {logs.length}</span>
            <button onClick={() => setLogs([])} className="hover:text-zinc-300">clear</button>
          </div>
          <div className="p-3 max-h-[40vh] overflow-y-auto space-y-1 text-[10px] leading-relaxed">
            {logs.length === 0 && (
              <div className="text-zinc-600 text-center py-8">
                点击上方按钮测试 MCP 工具调用
              </div>
            )}
            {logs.map((l) => (
              <div key={l.id} className="flex gap-2">
                <span className="text-zinc-600 shrink-0">
                  {new Date(l.ts).toLocaleTimeString()}
                </span>
                <span className={`break-all whitespace-pre-wrap ${
                  l.text.startsWith('→') ? 'text-cyan-400' : l.text.startsWith('!') ? 'text-rose-400' : 'text-zinc-400'
                }`}>
                  {l.text}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
