import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '星核 Orb Core — 你的私人卫星',
  description: '每个人都能拥有一颗私人卫星 — 太空 AI、太空相机、永恒太阳',
};

/**
 * 服务器端渲染的开屏 loader：直接打包进首屏 HTML，无需等 JS 加载即可显示。
 * 当 React 接管渲染并往 <main> 里塞内容后，下方的内联脚本会把它移除。
 */
const PRELOADER_HTML = `
<style>
  @keyframes orbcoreSpin { to { transform: rotate(360deg); } }
  @keyframes orbcoreFade { 0% { opacity: 0; } 100% { opacity: 1; } }
  #orbcore-preloader {
    position: fixed;
    inset: 0;
    background: #000005;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    pointer-events: none;
    color: #6b7280;
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    animation: orbcoreFade 200ms ease-out;
  }
  #orbcore-preloader .ring {
    width: 48px;
    height: 48px;
    border: 2px solid rgba(34, 211, 238, 0.25);
    border-top-color: rgb(34, 211, 238);
    border-radius: 50%;
    animation: orbcoreSpin 1s linear infinite;
    margin: 0 auto 16px;
  }
  #orbcore-preloader .label {
    font-size: 11px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
  }
  #orbcore-preloader .sub {
    margin-top: 8px;
    font-size: 10px;
    color: #3f3f46;
    letter-spacing: 0.2em;
  }
</style>
<div id="orbcore-preloader" aria-hidden="true">
  <div style="text-align:center">
    <div class="ring"></div>
    <div class="label">INITIALIZING ORB CORE</div>
    <div class="sub">connecting · loading scene · awaiting telemetry</div>
  </div>
</div>
<script>
  (function () {
    function maybeHide() {
      var main = document.querySelector('main');
      var pre = document.getElementById('orbcore-preloader');
      if (!pre) return true;
      // React 已往 main 渲染内容 → 移除占位
      if (main && main.children.length > 0) {
        pre.style.transition = 'opacity 250ms ease-out';
        pre.style.opacity = '0';
        setTimeout(function () { pre.remove(); }, 280);
        return true;
      }
      return false;
    }
    function loop() {
      if (maybeHide()) return;
      setTimeout(loop, 120);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loop);
    } else {
      loop();
    }
  })();
</script>
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {/* SSR preloader：随首屏 HTML 直出，无需 JS；React 接管后由脚本淡出 */}
        <div dangerouslySetInnerHTML={{ __html: PRELOADER_HTML }} />
        {children}
      </body>
    </html>
  );
}
