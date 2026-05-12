/**
 * 磁悬卫星摆件 · 生产级 BOM
 * 方案一：Qi 充电 + 反作用飞轮姿控 + 星闪通信
 *
 * 价格单位 ¥（CNY），重量 g。
 * `decision` 字段标记可选项分支（互斥），`recommended` 是默认推荐。
 */

export type DecisionKey = 'mcu' | 'flywheel' | 'imu'
export type DecisionValue =
  | 'hi3863'
  | 'esp32c6'
  | 'hollowcup'
  | 'brushless'
  | 'n20'
  | 'mpu6050'
  | 'bmi270'

export type BomLine = {
  id: string
  name: string
  spec: string
  qty: number
  weight: number
  unitPrice: number
  note?: string
  decision?: { key: DecisionKey; value: DecisionValue }
}

export type Subsystem = {
  id: string
  side: 'satellite' | 'base'
  title: string
  caption: string
  lines: BomLine[]
}

export const SATELLITE_SUBSYSTEMS: Subsystem[] = [
  {
    id: 'sat-mcu',
    side: 'satellite',
    title: '主控 + 通信',
    caption: 'Hi3863 模组（星闪 NearLink + Wi-Fi 6 + BLE 5.4），需先确认供货周期',
    lines: [
      {
        id: 'sat-mcu-hi3863',
        name: '主控模组',
        spec: 'Hi3863 模组（BearPi 同款核心板）',
        qty: 1,
        weight: 3,
        unitPrice: 38,
        note: 'OpenHarmony 原生，星闪叙事核心',
        decision: { key: 'mcu', value: 'hi3863' },
      },
      {
        id: 'sat-mcu-esp32c6',
        name: '主控备选',
        spec: 'ESP32-C6 模组',
        qty: 1,
        weight: 3,
        unitPrice: 18,
        note: '牺牲星闪保留 Wi-Fi 6 + BLE，社区生态完整',
        decision: { key: 'mcu', value: 'esp32c6' },
      },
      {
        id: 'sat-ant-pcb',
        name: '板载/PCB 天线',
        spec: '2.4 GHz PCB 天线',
        qty: 1,
        weight: 0,
        unitPrice: 0,
        note: '模组自带，需在金属外壳开无金属窗口',
      },
    ],
  },
  {
    id: 'sat-imu',
    side: 'satellite',
    title: '姿态感知 · IMU',
    caption: '6 轴跑通，9 轴升级用于绝对航向（"指向地球某个城市"演示）',
    lines: [
      {
        id: 'sat-imu-mpu6050',
        name: '6 轴 IMU',
        spec: 'MPU6050 模组（I²C）',
        qty: 1,
        weight: 1,
        unitPrice: 6,
        note: '复用现有方案；引脚兼容 BMI270 后期可换',
        decision: { key: 'imu', value: 'mpu6050' },
      },
      {
        id: 'sat-imu-bmi270',
        name: '9 轴 IMU 升级',
        spec: 'BMI270 + BMM150（I²C）',
        qty: 1,
        weight: 1,
        unitPrice: 18,
        note: '加磁力计，能做绝对航向定位',
        decision: { key: 'imu', value: 'bmi270' },
      },
    ],
  },
  {
    id: 'sat-acs',
    side: 'satellite',
    title: '飞轮姿控',
    caption:
      '空心杯方案推荐：高转速 / 低惯量，配铜配重盘 J≈8×10⁻⁶ kg·m²，对 100 g 本体提供 ±15°/s² 角加速度',
    lines: [
      {
        id: 'sat-mot-hollow',
        name: '飞轮电机（推荐）',
        spec: '空心杯电机 1020 · 2.4 V · 35000 rpm',
        qty: 1,
        weight: 5,
        unitPrice: 15,
        note: '高转速 + 低惯量，姿控响应丝滑',
        decision: { key: 'flywheel', value: 'hollowcup' },
      },
      {
        id: 'sat-mot-n20',
        name: '飞轮电机（不推荐）',
        spec: 'N20 直驱 6 V 200 rpm',
        qty: 1,
        weight: 10,
        unitPrice: 12,
        note: '齿轮间隙会让姿控震荡，仅作备选',
        decision: { key: 'flywheel', value: 'n20' },
      },
      {
        id: 'sat-mot-bldc',
        name: '飞轮电机（豪华）',
        spec: '无刷外转子 2204 · 14T',
        qty: 1,
        weight: 25,
        unitPrice: 45,
        note: '力矩最大但需 ESC，复杂度跳一档，留给 V2.0',
        decision: { key: 'flywheel', value: 'brushless' },
      },
      {
        id: 'sat-flywheel-disc',
        name: '配重盘（飞轮本体）',
        spec: '铜配重盘 ⌀25 mm × 4 mm',
        qty: 1,
        weight: 18,
        unitPrice: 8,
        note: '加工件，淘宝代工或黄铜垫片堆叠',
      },
      {
        id: 'sat-mot-drv',
        name: '电机驱动',
        spec: 'DRV8833 双 H 桥',
        qty: 1,
        weight: 1,
        unitPrice: 4,
        note: '配 N20 / 空心杯都够用',
        decision: { key: 'flywheel', value: 'hollowcup' },
      },
      {
        id: 'sat-mot-esc',
        name: '无刷电调（如选无刷）',
        spec: '小型 6 A ESC',
        qty: 1,
        weight: 3,
        unitPrice: 25,
        note: '配无刷电机使用',
        decision: { key: 'flywheel', value: 'brushless' },
      },
    ],
  },
  {
    id: 'sat-fx',
    side: 'satellite',
    title: '视觉表现',
    caption: '腰部 LED 光环 + 状态点阵 + 太阳翼装饰',
    lines: [
      {
        id: 'sat-led-status',
        name: '状态灯',
        spec: 'WS2812B-Mini 2020 封装',
        qty: 6,
        weight: 1 / 6,
        unitPrice: 0.5,
        note: '比 5050 小一半，适合卫星侧贴 · 共 1 g / ¥3',
      },
      {
        id: 'sat-led-ring',
        name: '主灯（扫描光环）',
        spec: 'WS2812B-1515 微型封装',
        qty: 12,
        weight: 2 / 12,
        unitPrice: 0.5,
        note: '卫星腰部一圈，做"扫描光环" · 共 2 g / ¥6',
      },
      {
        id: 'sat-pv-deco',
        name: '太阳能板装饰',
        spec: '仿真 PV 贴片（PVC 印刷）',
        qty: 2,
        weight: 2,
        unitPrice: 1.5,
        note: '左右两翼，纯造型 · 共 4 g / ¥3',
      },
    ],
  },
  {
    id: 'sat-pwr',
    side: 'satellite',
    title: '电源系统',
    caption: 'LiPo + Qi 无线接收 + TP4056 三件套保护，含温度监测',
    lines: [
      {
        id: 'sat-batt',
        name: '电池',
        spec: 'LiPo 502535 · 600 mAh · 3.7 V 软包',
        qty: 1,
        weight: 12,
        unitPrice: 18,
        note: '必须带保护板，方形适合卫星仓',
      },
      {
        id: 'sat-qi-rx',
        name: 'Qi 接收线圈 + 模组',
        spec: '5 W Qi RX · 含整流稳压',
        qty: 1,
        weight: 8,
        unitPrice: 15,
        note: '输出 5 V，给充电管理',
      },
      {
        id: 'sat-charge-ic',
        name: '充电管理 IC',
        spec: 'TP4056 + DW01 + FS8205A 三件套',
        qty: 1,
        weight: 1,
        unitPrice: 3,
        note: '1 A 充电 + 过充过放过流保护',
      },
      {
        id: 'sat-boost',
        name: '升压模块',
        spec: 'MT3608 Boost · 3.7 V → 5 V',
        qty: 1,
        weight: 1,
        unitPrice: 3,
        note: '给电机驱动供电',
      },
      {
        id: 'sat-ldo',
        name: 'LDO',
        spec: 'AMS1117-3.3',
        qty: 1,
        weight: 0.5,
        unitPrice: 1,
        note: '给 Hi3863 + IMU 供电',
      },
      {
        id: 'sat-ntc',
        name: 'NTC 热敏电阻',
        spec: '10 kΩ NTC',
        qty: 1,
        weight: 0.1,
        unitPrice: 0.5,
        note: '贴电池表面，温度保护',
      },
      {
        id: 'sat-pwr-bom',
        name: '电源管理小料',
        spec: '电感 / 电容 / 电阻 / 肖特基',
        qty: 1,
        weight: 2,
        unitPrice: 5,
        note: '焊接打样含',
      },
    ],
  },
  {
    id: 'sat-mech',
    side: 'satellite',
    title: '结构与装配',
    caption: 'PLA 上下两半 + PETG 内支架 + 配平铁砂 + 永磁定位钉',
    lines: [
      {
        id: 'sat-shell',
        name: '卫星外壳',
        spec: 'PLA 3D 打印 上下两半',
        qty: 1,
        weight: 30,
        unitPrice: 15,
        note: '本机打印，材料成本即可',
      },
      {
        id: 'sat-frame',
        name: '内部支架',
        spec: 'PETG 3D 打印 · 电池仓 + 飞轮架',
        qty: 1,
        weight: 8,
        unitPrice: 3,
        note: 'PETG 比 PLA 抗冲击',
      },
      {
        id: 'sat-ballast',
        name: '配重铁块',
        spec: '铁砂袋 0.5 g/包 × 10',
        qty: 1,
        weight: 5,
        unitPrice: 2,
        note: '装配后做重心配平',
      },
      {
        id: 'sat-mag-pin',
        name: '永磁定位钉',
        spec: 'N52 钕磁铁 ⌀5 × 3 mm',
        qty: 3,
        weight: 1,
        unitPrice: 1,
        note: '卫星底部，对接底座用 · 共 3 g / ¥3',
      },
      {
        id: 'sat-mica',
        name: '防火隔离',
        spec: '云母片 0.3 mm 电池仓内衬',
        qty: 1,
        weight: 0.5,
        unitPrice: 1,
        note: '电池起火防扩散',
      },
      {
        id: 'sat-fasten',
        name: '螺丝 / 装配件',
        spec: 'M2 自攻 × 8 + 双面胶',
        qty: 1,
        weight: 1,
        unitPrice: 1,
      },
    ],
  },
]

export const BASE_SUBSYSTEMS: Subsystem[] = [
  {
    id: 'base-mcu',
    side: 'base',
    title: '主控（底座）',
    caption: '与卫星端配对，星闪互联；备选 Hi3861 仅 Wi-Fi',
    lines: [
      {
        id: 'base-mcu-hi3863',
        name: '主控',
        spec: 'Hi3863 模组',
        qty: 1,
        weight: 3,
        unitPrice: 38,
        note: '与卫星端配对',
        decision: { key: 'mcu', value: 'hi3863' },
      },
      {
        id: 'base-mcu-hi3861',
        name: '主控备选',
        spec: 'Hi3861V100',
        qty: 1,
        weight: 3,
        unitPrice: 25,
        note: '仅 Wi-Fi，无星闪',
        decision: { key: 'mcu', value: 'esp32c6' },
      },
    ],
  },
  {
    id: 'base-maglev',
    side: 'base',
    title: '悬浮系统',
    caption: '沿用淘宝 MagLev 成品组：电磁铁 ×4 + 霍尔 ×4 + 控制板',
    lines: [
      {
        id: 'base-maglev-kit',
        name: '磁悬浮模组',
        spec: '成品磁悬浮组（4 路电磁铁 + 4 路霍尔 + MCU）',
        qty: 1,
        weight: 0,
        unitPrice: 180,
        note: '复用既有方案',
      },
      {
        id: 'base-maglev-psu',
        name: '磁悬浮电源',
        spec: 'DC 12 V · 3 A 适配器',
        qty: 1,
        weight: 0,
        unitPrice: 22,
        note: '含 DC-DC',
      },
    ],
  },
  {
    id: 'base-qi',
    side: 'base',
    title: 'Qi 充电发射',
    caption:
      'Qi 100–200 kHz 与悬浮 30–50 kHz 频率不冲突，但磁场必须用铁氧体片屏蔽，防止干扰悬浮霍尔读数',
    lines: [
      {
        id: 'base-qi-tx',
        name: 'Qi 发射模组',
        spec: '5 W Qi TX · 含发射线圈',
        qty: 1,
        weight: 0,
        unitPrice: 30,
        note: '嵌入底座中央',
      },
      {
        id: 'base-qi-shield',
        name: 'TX 隔磁片',
        spec: '铁氧体片 60 × 60 × 0.5 mm',
        qty: 1,
        weight: 0,
        unitPrice: 4,
        note: '防 Qi 磁场干扰悬浮线圈',
      },
    ],
  },
  {
    id: 'base-fx',
    side: 'base',
    title: '视觉与交互',
    caption: 'LED 灯环 + NFC 碰一碰 + 触摸唤醒',
    lines: [
      {
        id: 'base-led-ring',
        name: '灯带',
        spec: 'WS2812B 5050 × 24',
        qty: 1,
        weight: 0,
        unitPrice: 12,
        note: '环形排布',
      },
      {
        id: 'base-nfc',
        name: 'NFC 标签',
        spec: 'NFC215',
        qty: 1,
        weight: 0,
        unitPrice: 2,
        note: '鸿蒙碰一碰连接',
      },
      {
        id: 'base-touch',
        name: '触摸感应',
        spec: 'TTP223 + 铜片',
        qty: 1,
        weight: 0,
        unitPrice: 3,
        note: '拍底座唤醒卫星',
      },
    ],
  },
  {
    id: 'base-dock',
    side: 'base',
    title: '对接定位结构',
    caption: '与卫星底磁钉配对，浅锥引导归位',
    lines: [
      {
        id: 'base-mag',
        name: '对接磁铁',
        spec: 'N52 钕磁铁 ⌀8 × 3 mm',
        qty: 3,
        weight: 0,
        unitPrice: 1,
        note: '对应卫星定位钉',
      },
      {
        id: 'base-dock-print',
        name: '对接凹槽',
        spec: '3D 打印 PETG 一体化',
        qty: 1,
        weight: 0,
        unitPrice: 5,
        note: '浅锥形，引导归位',
      },
    ],
  },
  {
    id: 'base-mech',
    side: 'base',
    title: '结构',
    caption: '15 × 15 × 4 cm 底座外壳 · PETG 整体',
    lines: [
      {
        id: 'base-shell',
        name: '底座外壳',
        spec: 'PETG 3D 打印',
        qty: 1,
        weight: 0,
        unitPrice: 40,
      },
      {
        id: 'base-misc',
        name: '底座小料',
        spec: '螺丝 / 走线 / 连接器',
        qty: 1,
        weight: 0,
        unitPrice: 10,
      },
    ],
  },
]

export const PRODUCTION_OVERHEAD = {
  pcbAmortPerUnit: 40,
  assemblyPerUnit: 30,
  retailMultiplier: 5,
  smallBatchUnits: 50,
}

export type Decisions = Record<DecisionKey, DecisionValue>

export const DEFAULT_DECISIONS: Decisions = {
  mcu: 'hi3863',
  flywheel: 'hollowcup',
  imu: 'mpu6050',
}

export const DECISION_BRANCHES: Record<
  DecisionKey,
  { label: string; caption: string; options: { value: DecisionValue; label: string; tag: string }[] }
> = {
  mcu: {
    label: '主控芯片',
    caption: 'Hi3863 撑住星闪叙事但供货风险高 / ESP32-C6 量产无忧但失去 NearLink 卖点',
    options: [
      { value: 'hi3863', label: 'Hi3863', tag: '星闪 + Wi-Fi 6 + BLE 5.4' },
      { value: 'esp32c6', label: 'ESP32-C6', tag: 'Wi-Fi 6 + BLE，生态成熟' },
    ],
  },
  flywheel: {
    label: '飞轮电机',
    caption: '空心杯调试容易、响应中等 / 无刷性能强但需 ESC、复杂度跳一档',
    options: [
      { value: 'hollowcup', label: '空心杯 1020', tag: '5 g · 35000 rpm · ¥15' },
      { value: 'brushless', label: '无刷 2204', tag: '25 g · 力矩王 · ¥45' },
      { value: 'n20', label: 'N20 减速（不推荐）', tag: '齿轮间隙会让姿控震荡' },
    ],
  },
  imu: {
    label: '惯性测量',
    caption: 'MPU6050 跑通链路 / BMI270+BMM150 解锁绝对航向与"指向城市"演示',
    options: [
      { value: 'mpu6050', label: 'MPU6050', tag: '6 轴 · ¥6' },
      { value: 'bmi270', label: 'BMI270 + BMM150', tag: '9 轴 · ¥18 · 绝对航向' },
    ],
  },
}

export const DESIGN_TARGETS = {
  satelliteWeightLimitG: 130,
  satelliteDiameterMm: 100,
  averageCurrentMa: 180,
  averageVoltageV: 3.7,
}
