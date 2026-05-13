import type { ComponentType } from 'react'

export type PartId =
  | 'base'
  | 'battery'
  | 'mcu'
  | 'servo'
  | 'dish'
  | 'ir'
  | 'oled'
  | 'led'
  | 'motor'

export interface PartSpec {
  id: PartId
  index: string
  name: string
  sub: string
  blurb: string
  detail: string
  accent: string
  origin: [number, number, number]
  explodeOffset: [number, number, number]
}

export const PARTS: PartSpec[] = [
  {
    id: 'base',
    index: '01',
    name: '磁悬浮底座',
    sub: 'MAGLEV BASE',
    blurb: 'Φ120 · 22mm gap · 反馈悬浮',
    detail:
      '霍尔阵列检测姿态，PID 实时调节四组电磁线圈电流，主体在 22mm 真空气隙内自旋。底座 5V 输入，无线充电模块向卫星本体感应供能。',
    accent: '#3aa6ff',
    origin: [0, -0.7, 0],
    explodeOffset: [0, -1.0, 0],
  },
  {
    id: 'battery',
    index: '02',
    name: '锂聚电池',
    sub: 'LI-PO CELL',
    blurb: '3.7V · 1200mAh · 感应充电',
    detail:
      '体内储能单元。底座感应线圈耦合到本体接收线圈后整流稳压，给电池补能；运行电流约 80mA，满电支持约 6h。',
    accent: '#7cff5f',
    origin: [-0.32, 0.28, 0.0],
    explodeOffset: [-1.6, -0.1, -0.2],
  },
  {
    id: 'mcu',
    index: '03',
    name: '海思芯片',
    sub: 'HISILICON HI3863',
    blurb: 'Wi-Fi 6 / BLE 5.4 · 实时姿态解算',
    detail:
      '主控板搭载海思 Hi3863，运行 LiteOS。负责采集 IMU 数据、I²C 驱动 OLED、PWM 驱动舵机、PWM 调节直流电机转速、移位寄存器驱动后置 LED 矩阵、GPIO 接 PIR 中断。集成 Wi-Fi 6 + BLE 5.4，RAM 512KB / Flash 4MB。',
    accent: '#ff9433',
    origin: [0.18, 0.34, -0.08],
    explodeOffset: [1.7, 0.0, -0.3],
  },
  {
    id: 'servo',
    index: '04',
    name: '舵机模块',
    sub: 'MICRO SERVO',
    blurb: 'SG90 改 · ±60° · PWM',
    detail:
      '改装版 SG90 微型舵机，金属齿轮组，安装在金属框架内部靠后位置；输出轴向上穿过框架顶部，驱动卫星锅做方位扫描。',
    accent: '#ff5f57',
    origin: [-0.04, 0.6, -0.16],
    explodeOffset: [-1.4, 0.6, -0.6],
  },
  {
    id: 'dish',
    index: '05',
    name: '抛物面卫星锅',
    sub: 'PARABOLIC DISH',
    blurb: 'Φ75 · 抛物面 · 反射体',
    detail:
      '冲压成型抛物反射面，焦点装载馈源样件。由舵机驱动做方位扫描——视觉上左右缓慢摆动，模拟搜星动作。',
    accent: '#ffd75f',
    origin: [0.0, 1.12, -0.04],
    explodeOffset: [0.0, 1.6, 0.4],
  },
  {
    id: 'ir',
    index: '06',
    name: '红外探头',
    sub: 'IR BEACON',
    blurb: 'PIR + 940nm · 接近触发',
    detail:
      '锅顶馈源支架上装 PIR 与 940nm 红外发射，靠近时唤醒卫星、点亮红色 LED 顶灯，同时切换 OLED 到欢迎画面。',
    accent: '#ff3a3a',
    origin: [0.0, 1.4, -0.04],
    explodeOffset: [0.0, 2.5, 0.6],
  },
  {
    id: 'oled',
    index: '07',
    name: 'OLED 显示',
    sub: 'OLED 0.96"',
    blurb: '128×64 · I²C · 时间 / 扫描',
    detail:
      '0.96 寸 SSD1306 OLED 屏，刷新约 30 fps。默认展示时间和扫描脉冲动画；接收红外触发可切换到 ASCII 字符画的小卫星。',
    accent: '#00d4ff',
    origin: [0.0, 0.32, 0.35],
    explodeOffset: [0.0, -0.4, 1.5],
  },
  {
    id: 'led',
    index: '08',
    name: 'LED 水流矩阵',
    sub: 'LED MATRIX · FLOW',
    blurb: '12 × 12 绿光 · 水流动画',
    detail:
      '本体背面 12×12 绿色 SMD LED 矩阵，MCU 通过移位寄存器（74HC595 级联）逐点驱动；默认显示对角线水流脉冲，可切换为雷达扫描、心电图、自定义图案等。',
    accent: '#3aff5f',
    origin: [0.0, 0.4, -0.45],
    explodeOffset: [0.0, 0.3, -1.6],
  },
  {
    id: 'motor',
    index: '09',
    name: '直流电机 · 调速',
    sub: 'DC MOTOR · PWM',
    blurb: '5V · PWM 调速 · 编码反馈',
    detail:
      '小型 DC 电机，由 MCU PWM 调节输入端电压实现转速控制；输出轴带齿盘可联动配重轮做反作用扭矩补偿；两根接线柱：电源 + GND，另接编码器反馈信号。',
    accent: '#ffb347',
    origin: [0.1, 0.2, 0.05],
    explodeOffset: [0.9, -0.6, 0.8],
  },
]

export const PART_MAP: Record<PartId, PartSpec> = Object.fromEntries(
  PARTS.map((p) => [p.id, p]),
) as Record<PartId, PartSpec>

export type PartMeshProps = {
  selected: boolean
  hovered: boolean
  onPointerOver: () => void
  onPointerOut: () => void
  onClick: () => void
}

export type PartMesh = ComponentType<PartMeshProps>
