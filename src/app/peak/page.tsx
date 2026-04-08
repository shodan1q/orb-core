'use client';

import { useEffect, useRef } from 'react';

// 颜色参考原图
const COLOR_BG = '#071a13';
const COLOR_DOT_CORE = '#caffef';
const COLOR_DOT_RING = '#6ff8ff';
const COLOR_DOT_FILL = '#7bff9c';
const COLOR_DIGIT = '#bdffd8';

const RAIN_CHARS = '01#/*@=.$%'.split('');

// Cell 元素类型
// 0: 空
// 1: 实心小点
// 2: 空心圆环
// 3: ⊙ (环+中心点)
// 4: 纯数字 (0-9)
// 5: 数字气泡 (圆+数字)
type CellKind = 0 | 1 | 2 | 3 | 4 | 5;

type Cell = {
  kind: CellKind;
  digit: number; // 4 和 5 使用
  nextAt: number;
  phase: number;
};

export default function PeakPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    // 山的轮廓采样：heightAtX[i] 表示 x=i 时山顶到底边的高度(像素)
    // 用多频段正弦 + 随机相位生成不规则轮廓
    let heightAtX: Float32Array = new Float32Array(0);
    let baseY = 0;

    // 点阵参数
    const CELL = 16;
    let cells: Cell[] = [];
    let cols = 0;
    let rows = 0;

    // 矩阵雨
    const RAIN_CELL = 16;
    let rainDrops: { y: number; speed: number; chars: string[] }[] = [];

    // 噪声参数：每次 resize 生成一组随机相位与振幅
    type Octave = { freq: number; amp: number; phase: number };
    let octaves: Octave[] = [];

    const rebuildSilhouette = () => {
      const cx = width / 2;
      const peakHeight = height * 0.78;
      // 山脚宽度：整屏 80% 左右
      const halfBase = width * 0.42;

      heightAtX = new Float32Array(width);
      for (let x = 0; x < width; x++) {
        const dx = (x - cx) / halfBase; // -1..1 在山脚范围内
        if (Math.abs(dx) >= 1) {
          heightAtX[x] = 0;
          continue;
        }
        // 主包络: 尖峰 + 非线性衰减, 再乘一个轻微左右不对称因子
        const envelope = Math.pow(1 - Math.abs(dx), 1.35);
        // 左右不对称 (让山看起来不是镜像对称的正三角)
        const asym = 1 + dx * 0.08;
        let h = envelope * asym;

        // 叠加多频噪声 (不规则边缘 + 局部起伏)
        let noise = 0;
        for (const o of octaves) {
          noise += Math.sin(x * o.freq + o.phase) * o.amp;
        }
        // 噪声按包络衰减, 山脚附近几乎没有波动, 越靠近山顶越明显但上限受控
        h = h * peakHeight + noise * envelope * peakHeight * 0.18;

        heightAtX[x] = Math.max(0, h);
      }

      // 让顶峰轻微"圆钝" + 去掉偶发突刺: 做一次简单 box blur
      const smoothed = new Float32Array(width);
      const k = 6;
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let n = 0;
        for (let i = -k; i <= k; i++) {
          const xi = x + i;
          if (xi < 0 || xi >= width) continue;
          sum += heightAtX[xi];
          n++;
        }
        smoothed[x] = sum / n;
      }
      heightAtX = smoothed;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      baseY = height * 0.95;

      // 生成随机 octaves
      octaves = [
        { freq: 0.004, amp: 0.25, phase: Math.random() * Math.PI * 2 },
        { freq: 0.011, amp: 0.16, phase: Math.random() * Math.PI * 2 },
        { freq: 0.028, amp: 0.09, phase: Math.random() * Math.PI * 2 },
        { freq: 0.065, amp: 0.05, phase: Math.random() * Math.PI * 2 },
      ];

      rebuildSilhouette();

      cols = Math.ceil(width / CELL);
      rows = Math.ceil(height / CELL);
      cells = new Array(cols * rows).fill(null).map(() => {
        const r = Math.random();
        const kind: CellKind =
          r < 0.32
            ? 1
            : r < 0.52
              ? 2
              : r < 0.66
                ? 3
                : r < 0.86
                  ? 4
                  : 5;
        return {
          kind,
          digit: Math.floor(Math.random() * 10),
          nextAt: Math.random() * 2000,
          phase: Math.random() * Math.PI * 2,
        };
      });

      rainDrops = new Array(Math.ceil(width / RAIN_CELL)).fill(null).map(() => ({
        y: Math.random() * height,
        speed: 40 + Math.random() * 80,
        chars: new Array(Math.ceil(height / RAIN_CELL))
          .fill(0)
          .map(() => RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)]),
      }));
    };

    // 判断 (x,y) 是否在不规则山形内
    const inMountain = (x: number, y: number) => {
      if (x < 0 || x >= width) return false;
      if (y > baseY) return false;
      const topY = baseY - heightAtX[Math.floor(x)];
      return y >= topY && y <= baseY;
    };

    // 离屏 canvas 用于山体柔光
    const glowCanvas = document.createElement('canvas');
    const glowCtx = glowCanvas.getContext('2d')!;

    // 一次性把山体轮廓压进 Path2D
    const buildMountainPath = () => {
      const p = new Path2D();
      p.moveTo(0, baseY);
      for (let x = 0; x < width; x += 2) {
        p.lineTo(x, baseY - heightAtX[x]);
      }
      p.lineTo(width - 1, baseY);
      p.closePath();
      return p;
    };

    resize();
    let mountainPath = buildMountainPath();
    window.addEventListener('resize', () => {
      resize();
      mountainPath = buildMountainPath();
    });

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;

      // 背景
      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(0, 0, width, height);

      // 背景矩阵雨
      ctx.font = '12px "JetBrains Mono", ui-monospace, monospace';
      ctx.textBaseline = 'top';
      for (let i = 0; i < rainDrops.length; i++) {
        const drop = rainDrops[i];
        drop.y += (drop.speed * dt) / 1000;
        if (drop.y > height + 40) drop.y = -40;
        const x = i * RAIN_CELL;
        for (let k = 0; k < drop.chars.length; k++) {
          const y = ((drop.y + k * RAIN_CELL) % (height + 80)) - 40;
          if (y < -20 || y > height + 20) continue;
          const alpha = Math.max(0, 1 - k / drop.chars.length) * 0.42;
          ctx.fillStyle = `rgba(140, 255, 200, ${alpha.toFixed(3)})`;
          ctx.fillText(drop.chars[k], x, y);
        }
        if (Math.random() < 0.02) {
          const idx = Math.floor(Math.random() * drop.chars.length);
          drop.chars[idx] = RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];
        }
      }

      // 山体外发光 (离屏放大模糊)
      const gw = Math.max(1, Math.floor(width / 4));
      const gh = Math.max(1, Math.floor(height / 4));
      glowCanvas.width = gw;
      glowCanvas.height = gh;
      glowCtx.clearRect(0, 0, gw, gh);
      glowCtx.save();
      glowCtx.scale(gw / width, gh / height);
      glowCtx.fillStyle = 'rgba(120, 255, 200, 0.6)';
      const gp = new Path2D();
      gp.moveTo(0, baseY + 20);
      for (let x = 0; x < width; x += 4) {
        gp.lineTo(x, baseY - heightAtX[x] - 18);
      }
      gp.lineTo(width - 1, baseY + 20);
      gp.closePath();
      glowCtx.fill(gp);
      glowCtx.restore();

      ctx.save();
      ctx.filter = 'blur(42px)';
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(glowCanvas, 0, 0, width, height);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      // 山体内填充 (半透明荧光渐变)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grd = ctx.createLinearGradient(0, baseY - height * 0.78, 0, baseY);
      grd.addColorStop(0, 'rgba(200, 255, 230, 0.22)');
      grd.addColorStop(0.55, 'rgba(100, 255, 180, 0.36)');
      grd.addColorStop(1, 'rgba(50, 220, 140, 0.42)');
      ctx.fillStyle = grd;
      ctx.fill(mountainPath);
      ctx.restore();

      // 山内点阵: 数字/气泡/圆环/⊙/点
      ctx.save();
      ctx.clip(mountainPath);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';

      for (let r = 0; r < rows; r++) {
        const cy = r * CELL + CELL / 2;
        if (cy > baseY + CELL) continue;
        for (let c = 0; c < cols; c++) {
          const cx = c * CELL + CELL / 2;
          if (!inMountain(cx, cy)) continue;

          const cell = cells[r * cols + c];
          if (now >= cell.nextAt) {
            // 随机切换类型 & 数字
            const rnd = Math.random();
            cell.kind = (
              rnd < 0.28
                ? 1
                : rnd < 0.48
                  ? 2
                  : rnd < 0.62
                    ? 3
                    : rnd < 0.84
                      ? 4
                      : 5
            ) as CellKind;
            cell.digit = Math.floor(Math.random() * 10);
            cell.nextAt = now + 150 + Math.random() * 1700;
          }

          cell.phase += dt * 0.003;
          const pulse = 0.72 + 0.28 * Math.sin(cell.phase + (cx + cy) * 0.01);

          // 距顶部山尖的归一化 (0 山顶 → 1 山脚)，越靠顶越稀疏
          const topY = baseY - heightAtX[Math.floor(cx)];
          const localDepth = (cy - topY) / Math.max(1, baseY - topY);
          if (localDepth < 0.05 && Math.random() < 0.4) continue;

          switch (cell.kind) {
            case 1: {
              ctx.fillStyle = COLOR_DOT_FILL;
              ctx.globalAlpha = 0.85 * pulse;
              ctx.beginPath();
              ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
              ctx.fill();
              break;
            }
            case 2: {
              ctx.strokeStyle = COLOR_DOT_RING;
              ctx.lineWidth = 1.1;
              ctx.globalAlpha = 0.95 * pulse;
              ctx.beginPath();
              ctx.arc(cx, cy, 3, 0, Math.PI * 2);
              ctx.stroke();
              break;
            }
            case 3: {
              ctx.strokeStyle = COLOR_DOT_RING;
              ctx.lineWidth = 1.1;
              ctx.globalAlpha = 1.0 * pulse;
              ctx.beginPath();
              ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fillStyle = COLOR_DOT_CORE;
              ctx.beginPath();
              ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
              ctx.fill();
              break;
            }
            case 4: {
              // 纯数字
              ctx.globalAlpha = 0.95 * pulse;
              ctx.fillStyle = COLOR_DIGIT;
              ctx.fillText(String(cell.digit), cx, cy + 0.5);
              break;
            }
            case 5: {
              // 数字气泡
              ctx.globalAlpha = 0.95 * pulse;
              ctx.strokeStyle = COLOR_DOT_RING;
              ctx.lineWidth = 1.1;
              ctx.beginPath();
              ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fillStyle = COLOR_DIGIT;
              ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
              ctx.fillText(String(cell.digit), cx, cy + 0.5);
              ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
              break;
            }
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // 山顶高光
      // 找出当前山的最高点位置
      let peakX = width / 2;
      let peakY = baseY;
      for (let x = 0; x < width; x++) {
        const y = baseY - heightAtX[x];
        if (y < peakY) {
          peakY = y;
          peakX = x;
        }
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const topGrad = ctx.createRadialGradient(peakX, peakY, 0, peakX, peakY, 220);
      topGrad.addColorStop(0, 'rgba(220, 255, 240, 0.85)');
      topGrad.addColorStop(0.4, 'rgba(100, 255, 200, 0.35)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(peakX - 240, peakY - 240, 480, 480);
      ctx.restore();

      // CRT 扫描线
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#000';
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }
      ctx.restore();

      // 左上角标题
      ctx.save();
      ctx.font = '600 13px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = 'rgba(200, 255, 230, 0.85)';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText('XIAOHONGSHU · PEAK CHALLENGE', 24, 24);
      ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = 'rgba(140, 255, 200, 0.55)';
      ctx.fillText('#小红书巅峰赛 · ORB CORE', 24, 42);
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
