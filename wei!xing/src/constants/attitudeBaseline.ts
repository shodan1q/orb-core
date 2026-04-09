/**
 * 卫星「零姿态」在三维里的基准欧拉角（度），与 UI 上 0°/0°/0° 对应。
 * 此前由用户确认的展示姿态固化在此，滑块读数为零时即为此朝向。
 */
export const ATTITUDE_ZERO_REFERENCE_DEG = {
  pitch: 31.9,
  roll: -45,
  yaw: 278.3,
} as const
