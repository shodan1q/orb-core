/**
 * 卫星数据类别与产品功能映射（参考测控/导航/任务/科学体系，按面板能力取舍）。
 * 实际接入时：原始层 → 处理层（星历/TM/姿态等）→ 面板展示。
 */

export type ProductFeature =
  | 'overview'
  | 'orbit'
  | 'motion'
  | 'video'
  | 'energy'

export type DataLayer = 'raw_downlink' | 'raw_ground' | 'raw_third_party' | 'processing'

export type DataCategoryId =
  | 'ttc_tm_tc'
  | 'nav_orbit'
  | 'mission_rs'
  | 'science_space'
  | 'comm_nav_signals'

export type CatalogItem = {
  id: string
  name: string
  /** 数据在体系中的角色 */
  role: string
  /** 与本产品哪块界面最相关 */
  primaryFeature: ProductFeature
  /** 原始/处理层归属 */
  layer: DataLayer
}

export type DataCategory = {
  id: DataCategoryId
  title: string
  summary: string
  items: CatalogItem[]
}

/** 合理取舍后的可用数据清单（非全量罗列） */
export const SATELLITE_DATA_CATALOG: DataCategory[] = [
  {
    id: 'ttc_tm_tc',
    title: '通信与测控',
    summary:
      '天地神经中枢：下行遥测 TM 报告状态，上行遥控 TC 下达动作；测距与多普勒为定轨原始量。',
    items: [
      {
        id: 'tm_eng',
        name: '遥测 TM（工程参数）',
        role: '母线电压、温度、链路余量、能源与平台状态',
        primaryFeature: 'energy',
        layer: 'processing',
      },
      {
        id: 'tc_cmd',
        name: '遥控 TC（指令）',
        role: '上行指令队列与回执，驱动姿态/载荷/热控等动作',
        primaryFeature: 'motion',
        layer: 'raw_ground',
      },
      {
        id: 'rng_dpl',
        name: '测距与多普勒',
        role: '距离与径向速度，用于精密定轨与时间同步',
        primaryFeature: 'orbit',
        layer: 'raw_downlink',
      },
    ],
  },
  {
    id: 'nav_orbit',
    title: '导航与轨道',
    summary: '星历、TLE、OSV 回答“卫星在哪里、往哪飞”，支撑跟踪与任务规划。',
    items: [
      {
        id: 'eph',
        name: '星历 Ephemeris',
        role: '时间序列位置速度（与地图/轨迹一致）',
        primaryFeature: 'orbit',
        layer: 'processing',
      },
      {
        id: 'tle',
        name: 'TLE 两行根数',
        role: '第三方或内部生成的预报输入（如 SGP4）',
        primaryFeature: 'orbit',
        layer: 'raw_third_party',
      },
      {
        id: 'osv',
        name: '轨道状态向量 OSV',
        role: 'ECI/地固系下 r、v 分量或模值',
        primaryFeature: 'orbit',
        layer: 'processing',
      },
    ],
  },
  {
    id: 'mission_rs',
    title: '任务应用（有效载荷）',
    summary: '光学/SAR/红外等遥感与图传链路指标，对应“交付成果”。',
    items: [
      {
        id: 'optical',
        name: '光学影像链',
        role: '全色/多光谱积分码率、云掩膜、几何定位残差',
        primaryFeature: 'video',
        layer: 'processing',
      },
      {
        id: 'sar',
        name: 'SAR',
        role: '工作模式、数据量、成像条带状态',
        primaryFeature: 'video',
        layer: 'processing',
      },
      {
        id: 'ir',
        name: '红外',
        role: '亮温、热点检测（火灾/海温等场景）',
        primaryFeature: 'video',
        layer: 'processing',
      },
    ],
  },
  {
    id: 'science_space',
    title: '科学探测',
    summary: '等离子体、粒子、磁场等，用于空间环境监视与科研。',
    items: [
      {
        id: 'plasma',
        name: '等离子体/电子密度',
        role: '电离层与近地空间环境',
        primaryFeature: 'overview',
        layer: 'processing',
      },
      {
        id: 'particles',
        name: '高能粒子',
        role: '辐射剂量与太阳事件监测',
        primaryFeature: 'overview',
        layer: 'raw_downlink',
      },
      {
        id: 'bfield',
        name: '磁场',
        role: '矢量或标量分量',
        primaryFeature: 'overview',
        layer: 'raw_downlink',
      },
    ],
  },
  {
    id: 'comm_nav_signals',
    title: '通信与导航信号',
    summary: '转发器与导航电文类指标，用于链路质量评估。',
    items: [
      {
        id: 'transponder',
        name: '转发器状态',
        role: 'EIRP、频率稳定度、CNR/SNR',
        primaryFeature: 'video',
        layer: 'processing',
      },
      {
        id: 'nav_msg',
        name: '导航电文/测距码',
        role: '与授时、定位增强相关（示意）',
        primaryFeature: 'orbit',
        layer: 'raw_third_party',
      },
    ],
  },
]

/** 处理流水线（与架构图一致，用于 UI 提示条） */
export const DATA_PIPELINE_STEPS = [
  { id: 'rf', label: '射频解码', layer: 'raw_downlink' as const },
  { id: 'tm', label: 'TM 解析', layer: 'processing' as const },
  { id: 'sgp4', label: '星历/SGP4', layer: 'processing' as const },
  { id: 'att', label: '姿态解算', layer: 'processing' as const },
  { id: 'fdir', label: 'FDIR 趋势', layer: 'processing' as const },
  { id: 'tle3', label: '第三方 TLE', layer: 'raw_third_party' as const },
]
