type Row = { label: string; value: string }
type Group = { title: string; rows: Row[] }

const GROUPS: Group[] = [
  {
    title: '机身',
    rows: [
      { label: '直径', value: '100 mm' },
      { label: '总重', value: '< 130 g' },
      { label: '材质', value: 'PLA 注塑外壳 · 铝合金底座' },
      { label: '装配公差', value: '±0.2 mm' },
    ],
  },
  {
    title: '悬浮 & 姿态',
    rows: [
      { label: '气隙', value: '12 mm' },
      { label: '电磁铁', value: '4 路 · 1 kHz 闭环' },
      { label: '霍尔传感器', value: '4 路 · TLE493D 系列' },
      { label: '飞轮', value: '35 000 rpm 空心杯电机 + 铜配重' },
      { label: 'IMU', value: '6 轴 BMI270' },
    ],
  },
  {
    title: '能源',
    rows: [
      { label: '电池', value: '600 mAh LiPo' },
      { label: '续航', value: '3 小时（典型）' },
      { label: '充电', value: 'Qi 5 W 隔空' },
      { label: '平均功耗', value: '180 mA @ 3.7 V' },
    ],
  },
  {
    title: '通信 & 控制',
    rows: [
      { label: '主控', value: 'Hi3863 · OpenHarmony 原生' },
      { label: '无线', value: '星闪 NearLink + Wi-Fi 6 + BLE 5.4' },
      { label: '端到端延迟', value: '30 ms' },
      { label: '配对', value: 'NFC 碰一碰 · 服务卡片' },
    ],
  },
  {
    title: '光环',
    rows: [
      { label: '腰部 LED', value: '12 颗 WS2812-1515' },
      { label: '底盘 LED', value: '24 颗' },
      { label: '场景模式', value: '呼吸 / 扫描 / 任务三档' },
    ],
  },
  {
    title: '出厂',
    rows: [
      { label: '生产批次', value: 'v1 · 限量 200 台' },
      { label: '产地', value: '深圳手装' },
      { label: '保修', value: '12 个月 · 30 天无理由' },
      { label: '附件', value: '定制底座 · USB-C 适配器 · 收纳盒' },
    ],
  },
]

export function SpecBand() {
  return (
    <section id="specs" className="relative bg-black py-24 md:py-36 lg:py-44">
      <div className="mx-auto max-w-[980px] px-5 md:px-8">
        <div className="text-center">
          <p className="text-[14px] font-medium text-[#ffb47a] md:text-[15px]">技术规格</p>
          <h2 className="mt-3 text-[clamp(1.6rem,5.4vw,4rem)] font-semibold leading-[1.12] tracking-tight text-white md:mt-4">
            一份，写得清清楚楚
            <br className="md:hidden" />
            的规格表。
          </h2>
        </div>

        <div className="mt-14 md:mt-20">
          {GROUPS.map((g, i) => (
            <div
              key={g.title}
              className={`grid grid-cols-1 gap-x-12 py-7 md:grid-cols-[200px_1fr] md:gap-x-16 md:py-9 ${
                i === 0 ? 'border-t border-white/10' : ''
              } border-b border-white/10`}
            >
              <h3 className="text-[16px] font-semibold leading-[1.4] tracking-tight text-white md:text-[17px]">
                {g.title}
              </h3>
              <dl className="mt-3 md:mt-0">
                {g.rows.map((r, j) => (
                  <div
                    key={r.label}
                    className={`grid grid-cols-[88px_1fr] items-baseline gap-4 py-2 text-[13.5px] md:grid-cols-[1fr_2fr] md:text-[15px] ${
                      j === 0 ? '' : 'border-t border-white/[0.06]'
                    }`}
                  >
                    <dt className="text-[#86868b]">{r.label}</dt>
                    <dd className="text-[#f5f5f7] [overflow-wrap:anywhere]">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-[12px] text-[#86868b] md:text-[13px]">
          上述参数为标称值，生产批次 v1。最终交付以发货页注明的批次参数为准。
        </p>
      </div>
    </section>
  )
}
