'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrbStore } from '@/stores/useOrbStore';

const MOCK_RESPONSES: Record<string, { reply: string; action?: () => void }> = {};

function getMockResponse(input: string, store: ReturnType<typeof useOrbStore.getState>) {
  const lower = input.toLowerCase();

  if (lower.includes('拍') || lower.includes('photo') || lower.includes('照片')) {
    return {
      reply: '[CAM] 收到拍摄指令！正在调整卫星姿态，ORB-CAM 对焦中...\n\n目标：深圳南山区 (22.53N, 113.93E)\n分辨率：0.5m\n消耗：-50 EP',
      action: () => {
        store.setTarget(22.53, 113.93);
        store.setPhase('photo-sequence');
        store.consumeEnergy(50);
        setTimeout(() => {
          store.setPhase('orbiting');
          store.setShowPhotoViewer(true);
        }, 8000);
      },
    };
  }

  if (lower.includes('照亮') || lower.includes('反射') || lower.includes('太阳') || lower.includes('light') || lower.includes('reflect')) {
    return {
      reply: '[SUN] 启动太阳光反射模式！\n\n正在计算反射镜角度...\n目标：南山公园 (22.53N, 113.93E)\n反射强度：满月亮度 x8\n消耗：-100 EP\n\n反射镜到位，光束已锁定目标区域。',
      action: () => {
        store.setTarget(22.53, 113.93);
        store.setReflection(true, 0.8);
        store.setPhase('reflection-sequence');
        store.consumeEnergy(100);
        setTimeout(() => {
          store.setReflection(false);
          store.setPhase('orbiting');
        }, 15000);
      },
    };
  }

  if (lower.includes('状态') || lower.includes('status')) {
    return {
      reply: `[SAT] 星核状态报告：\n\n- 轨道高度：${store.satelliteAlt.toFixed(0)}km (LEO)\n- 速度：${store.velocity.toFixed(2)} km/s\n- 能量：${store.energy} EP / ${store.maxEnergy} EP\n- 太阳能输入：2.4kW\n- 所有子系统正常运行\n- 下次过境深圳：约 47 分钟后`,
      action: () => {
        store.setPhase('satellite-closeup');
        setTimeout(() => store.setPhase('orbiting'), 5000);
      },
    };
  }

  if (lower.includes('你好') || lower.includes('hello') || lower.includes('hi')) {
    return {
      reply: '你好！我是星核 AI，你的私人卫星助手。\n\n我可以帮你：\n- [CAM] 太空拍照 -- "帮我拍一张深圳的照片"\n- [SUN] 反射阳光 -- "今晚照亮南山公园"\n- [SYS] 查看状态 -- "卫星状态"\n\n试试对我说些什么吧！',
    };
  }

  return {
    reply: '收到指令。星核 AI 正在处理中...\n\n当前可执行的任务：\n- [CAM] 太空拍照\n- [SUN] 太阳光反射\n- [SYS] 状态查询\n\n请尝试更具体的指令，例如"帮我拍一张上海的照片"。',
  };
}

export default function ChatPanel() {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useOrbStore((s) => s.messages);
  const addMessage = useOrbStore((s) => s.addMessage);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userInput = input.trim();
    setInput('');

    addMessage({ role: 'user', content: userInput });

    setIsTyping(true);
    const store = useOrbStore.getState();
    const { reply, action } = getMockResponse(userInput, store);

    // Simulate typing delay
    setTimeout(() => {
      setIsTyping(false);
      addMessage({ role: 'assistant', content: reply });
      action?.();
    }, 1200 + Math.random() * 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.8 }}
      className="absolute bottom-4 left-4 w-96 z-20"
    >
      <div className="glass-panel flex flex-col h-[420px]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-[10px]">
              AI
            </div>
            <div>
              <p className="text-xs font-semibold text-white">星核 AI Buddy</p>
              <p className="text-[10px] text-cyan-400/60 font-mono">UPLINK ACTIVE · 150Mbps</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/20'
                      : msg.role === 'system'
                      ? 'bg-yellow-500/10 text-yellow-200/80 border border-yellow-500/10'
                      : 'bg-white/5 text-gray-200 border border-white/5'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-1 px-3 py-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-white/5">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="对星核说些什么..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
            />
            <button
              onClick={handleSend}
              className="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs font-mono transition-all hover:shadow-[0_0_15px_rgba(0,200,255,0.2)]"
            >
              发送
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex gap-1.5 mt-2">
            {[
              { label: 'CAM 拍照', cmd: '帮我拍一张深圳南山的照片' },
              { label: 'SUN 反射', cmd: '今晚帮我照亮南山公园' },
              { label: 'SYS 状态', cmd: '卫星状态' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  setInput(action.cmd);
                  setTimeout(() => {
                    addMessage({ role: 'user', content: action.cmd });
                    setIsTyping(true);
                    const store = useOrbStore.getState();
                    const { reply, action: act } = getMockResponse(action.cmd, store);
                    setTimeout(() => {
                      setIsTyping(false);
                      addMessage({ role: 'assistant', content: reply });
                      act?.();
                    }, 1200);
                  }, 100);
                  setInput('');
                }}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] text-gray-400 hover:text-white transition-all"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
