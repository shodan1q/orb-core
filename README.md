# 星核 · Orb Core

> **每个人都能拥有一颗私人卫星 —— 它是你的太空 AI 伙伴、你的太空相机、你的永恒太阳。**

`#小红书巅峰赛` 参赛作品。一个可交互的太空 CG Demo：用户拥有一颗运行在真实 LEO 轨道上的虚拟私人卫星「星核」，通过自然语言指挥它拍照、反射阳光、生成影像。

---

## 产品概念

星核是一颗搭载边缘 AI 的小型卫星，围绕三大核心能力构建：

| 能力 | 描述 | 用户感知 |
|------|------|----------|
| 🧠 **太空算力** | 卫星搭载边缘 AI，太阳能 0 损耗供电，24h 运转 | 你的 AI Buddy 住在卫星上，算力永不停歇 |
| 📷 **太空相机** | 高分辨率对地拍摄，用户指定坐标拍照 | "帮我拍一张深圳南山上空的照片" |
| ☀️ **24 小时太阳** | 反射镜阵列，把太阳光定向反射到地面指定位置 | "今晚帮我照亮南山公园" |

**卫星经济系统：** 太阳能发电 → 算力积分（⚡ Energy Points）→ 执行任务消耗（拍照 50⚡、反射 100⚡、AI 对话 1⚡/轮）。

**现实依据：**
- 太空算力：ESA OPS-SAT 已在 ISS 实测边缘 AI；SpaceX 2026 年申请部署太空数据中心
- 太空相机：Planet Labs 200+ 颗卫星每日全球拍摄，完全商用成熟
- 24h 太阳：1993 年 Znamya 2 实验成功反射满月亮度；Reflect Orbital 2026 年 4 月发射测试卫星

---

## 页面总览

项目由三个独立页面组成，每个页面承担不同叙事角色：

### `/` — 主控台 Dashboard

核心交互页面。

- **全屏 3D 地球场景**：真实 NASA 日/夜贴图，自定义 shader 做昼夜过渡、大气辉光、海洋镜面反射
- **真实 LEO 轨道卫星**：六棱柱金箔主体 + 三段式太阳能板 + 反射镜 + 相机镜头 + 天线，沿 51.6° 倾角轨道运行
- **视觉效果层**：
  - 轨道光晕尾迹（渐变色 LineBasicMaterial + 加性混合）
  - 能量粒子流（太阳 → 卫星）
  - 反射光束、扫描锥、瞄准圆环
  - 流星、星云、银河带
- **UI 组件**：
  - `TopBar` — 星核 Logo / 连接状态 / 滚动遥测 tape / 模式 / 能量 / UTC 时钟
  - `StatusPanel` — 遥测数据、能量环、子系统状态面板
  - `ChatPanel` — 与星核 AI Buddy 对话（CAM 拍照、SUN 反射、SYS 状态快捷指令）
  - `LaunchOverlay` — 首次加载的发射动画
  - `PhotoViewer` — 模拟卫星照片查看器（带 HUD、扫描线、噪点）
  - `ControlPanel` — **卫星控制台（新）**

### `/peak` — 小红书巅峰赛视觉

致敬比赛主视觉的全屏动画：

- **不规则数字山峰**：4 层多频段正弦噪声叠加生成不规则轮廓，Box blur 平滑突刺
- **数字气泡点阵**：山体内部 16px 网格填充，每个格子随机在 6 种元素间切换（实心点 / 圆环 / ⊙ / 纯数字 / 数字气泡 / 空），每 0.15~1.85s 独立刷新
- **矩阵雨背景**：`01#/*@=.$%` 字符流，列式垂直下落
- **山顶高光**：radial gradient + lighter 合成
- **CRT 扫描线 + vignette**

### `/xiaozhi` — 小智 MCP 桥

把对话同步到网页的 MCP server：

- 通过 WebSocket 连接 `wss://api.xiaozhi.me/mcp/`
- 实现 MCP 2024-11-05 协议握手：`initialize` / `tools/list` / `tools/call`
- 暴露两个工具给小智调用：
  - `push_message(role, text)` — 把对话推到网页展示
  - `clear_messages()` — 清屏
- 实时显示 JSON-RPC 收发日志（IN/OUT 分色）
- 自动重连，可手动断开

---

## 卫星控制台 (Satellite Control Console)

从主页面左上角 **SAT CTRL** 按钮打开的 2×2 面板：

```
┌────────────────────────┬────────────────────────┐
│  TELEMETRY             │  ATTITUDE CTRL         │
│  实时遥测数据            │  姿态控制 + 3D 卫星     │
├────────────────────────┼────────────────────────┤
│  LIVE FEED             │  GROUND TRACK          │
│  视频直播               │  地面星轨图             │
└────────────────────────┴────────────────────────┘
```

1. **TELEMETRY** — lat/lng/alt/vel 从 zustand store 实时读取，温度 / 太阳能 / 下行带宽 / CPU / 信号做随机抖动，分色显示
2. **ATTITUDE CTRL** — 独立的 react-three-fiber Canvas 渲染真 3D 卫星模型
   - Pitch / Yaw / Roll 滑块 → Quaternion slerp 阻尼插值
   - NADIR / SUN / TARGET / FREE 四种姿态模式
   - THRUST 推力 → 底部加性混合的蓝色火焰锥
   - RGB 三轴 AxesHelper、OrbitControls 可拖动视角
3. **LIVE FEED** — sat-\*.jpg 循环模拟 4K 30fps 直播，扫描线 / REC 闪烁 / 时间轴 / 暂停控制
4. **GROUND TRACK** — 等距圆柱投影地图，绘制 3 圈带西移的地面轨迹 + 脉冲光圈卫星位置

---

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | **Next.js 16** (App Router, Turbopack) |
| 语言 | **TypeScript** + React 19 |
| 3D 渲染 | **three.js 0.183** + @react-three/fiber + @react-three/drei + @react-three/postprocessing |
| 动画 | **framer-motion** (UI 过渡) + **gsap** (时间轴编排) |
| 状态 | **zustand** (轻量全局 store) |
| 样式 | **Tailwind CSS v4** + 自定义 GLSL shader |
| 轨道计算 | **satellite.js** + **suncalc** (太阳方位) |

**自定义 shader：**
- `earth.ts` — 地球表面：昼夜混合（smoothstep 过渡带）、夜侧叠加暗淡白天贴图显露大陆轮廓、海洋镜面高光、rim glow 大气层、terminator 暖色
- `lightray.ts` — 光束、扫描锥相关效果

---

## 项目结构

```
src/
├── app/
│   ├── layout.tsx           # 根布局 + 中文字体
│   ├── page.tsx             # 主控台 Dashboard (/)
│   ├── peak/page.tsx        # 巅峰赛动画 (/peak)
│   └── xiaozhi/page.tsx     # 小智 MCP 桥 (/xiaozhi)
├── components/
│   ├── three/               # 3D 场景组件
│   │   ├── Scene.tsx            # 主场景编排 (Earth + 轨道 + 特效)
│   │   ├── Earth.tsx            # 地球壳 + 大气层 shader mesh
│   │   ├── Satellite.tsx        # 轨道中的卫星模型
│   │   ├── ControlSatellite.tsx # 控制台里的独立可控卫星
│   │   ├── LightEffects.tsx     # SunRay / ReflectionBeam / ScanCone
│   │   ├── OrbitTrail.tsx       # 渐变色轨道尾迹
│   │   ├── Particles.tsx        # 能量粒子流
│   │   └── Starfield.tsx        # 星空 / 银河带
│   └── ui/                  # 2D UI 组件
│       ├── TopBar.tsx           # 顶部状态栏
│       ├── StatusPanel.tsx      # 右侧遥测面板
│       ├── ChatPanel.tsx        # 左下 AI 对话框
│       ├── LaunchOverlay.tsx    # 发射过场动画
│       ├── PhotoViewer.tsx      # 卫星照片查看器
│       └── ControlPanel.tsx     # 卫星控制台 2x2 面板
├── shaders/
│   ├── earth.ts             # Earth vertex/fragment shader
│   └── lightray.ts          # Light ray shader
├── stores/
│   └── useOrbStore.ts       # zustand 全局状态 (phase/energy/satellite/chat/ui)
└── utils/
    └── orbital.ts           # LEO 轨道计算 / 太阳方位 / 经纬度转换
```

---

## 本地运行

```bash
npm install
npm run dev
```

默认监听 `0.0.0.0:3000`：

- 本机: http://localhost:3000
- 局域网: http://<本机 IP>:3000 （`next.config.ts` 的 `allowedDevOrigins` 已放行常见内网段）

路由：

| URL | 说明 |
|---|---|
| `/` | 主控台 Dashboard |
| `/peak` | 小红书巅峰赛数字山动画 |
| `/xiaozhi` | 小智 MCP WebSocket 桥 |

---

## 开发原则

> **动画展示就是一切。** 资源分配 **70% 动画/可视化 · 20% AI 对话 · 10% 后端逻辑**。所有技术选型和架构都服务于一个目标：**让 3D 动画流畅、酷炫、有电影感。**

> ⚠️ Next.js 16 对 API 与文件约定有 breaking change，写代码前先查 `node_modules/next/dist/docs/` 里对应的文档，别照搬训练数据里的旧 API。

---

## License

参赛 Demo 项目，暂未指定开源协议。

---

`#小红书巅峰赛` · Powered by **ORB CORE Satellite System**
