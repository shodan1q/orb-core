// OrbCoreIntentExecutor
// ----------------------------------------------------------------------------
// InsightIntent executor — 小艺通过 OpenClaw 调用这些 skills 控制星核卫星。
//
// Supported intents:
//   "OpenOrbCore"        — 打开星核 / 打开卫星控制台
//   "TakePhoto"          — 卫星拍照（可带目标坐标）
//   "ReflectSunlight"    — 反射阳光（可带强度和目标坐标）
//   "CheckStatus"        — 查看卫星状态
//   "SetAttitude"        — 调整卫星姿态 / 对准太阳
//   "NavigatePage"       — 导航到指定页面
//
// 每个 intent 触发后：
//   1. 打开对应的 App 页面
//   2. 通过 RemoteClient WebSocket 发送 command 到 Web 主控台

import InsightIntentExecutor from '@ohos.app.ability.InsightIntentExecutor';
import insightIntent from '@ohos.app.ability.insightIntent';
import { window } from '@kit.ArkUI';
import { hilog } from '@kit.PerformanceAnalysisKit';

const DOMAIN = 0x0000;
const TAG = 'OrbCoreIntent';

export default class OrbCoreIntentExecutor extends InsightIntentExecutor {
  onExecuteInUIAbilityForegroundMode(
    name: string,
    param: Record<string, Object>,
    pageLoader: window.WindowStage
  ): insightIntent.ExecuteResult {
    hilog.info(DOMAIN, TAG, `intent: ${name}, params: ${JSON.stringify(param)}`);

    let page = 'pages/Index';
    let resultMsg = '星核已启动';

    switch (name) {
      case 'TakePhoto': {
        page = 'pages/RemoteControl';
        const lat = param?.target_lat as number | undefined;
        const lng = param?.target_lng as number | undefined;
        const locName = param?.location_name as string | undefined;
        if (locName) {
          resultMsg = `准备拍摄${locName}`;
        } else if (lat != null && lng != null) {
          resultMsg = `准备拍摄目标坐标 (${lat}, ${lng})`;
        } else {
          resultMsg = '准备拍照，使用当前视角';
        }
        // Command will be forwarded by RemoteControl page via WebSocket
        break;
      }

      case 'ReflectSunlight': {
        page = 'pages/RemoteControl';
        const intensity = (param?.intensity as number) ?? 0.8;
        resultMsg = `反射阳光已启动，强度 ${(intensity * 100).toFixed(0)}%`;
        break;
      }

      case 'CheckStatus': {
        page = 'pages/RemoteControl';
        resultMsg = '正在查看卫星状态';
        break;
      }

      case 'SetAttitude': {
        page = 'pages/RemoteControl';
        const target = param?.target as string | undefined;
        if (target === 'sun') {
          resultMsg = '卫星正在调整姿态对准太阳';
        } else {
          const pitch = param?.pitch as number ?? 0;
          const roll = param?.roll as number ?? 0;
          const yaw = param?.yaw as number ?? 0;
          resultMsg = `卫星姿态调整: Pitch=${pitch}, Roll=${roll}, Yaw=${yaw}`;
        }
        break;
      }

      case 'NavigatePage': {
        page = 'pages/RemoteControl';
        const pageName = param?.page as string ?? 'dashboard';
        const pageNames: Record<string, string> = {
          dashboard: '主控台',
          pov: '卫星第一视角',
          tracker: '卫星追踪地图',
          control: '卫星控制台',
          peak: '地空能源系统',
        };
        resultMsg = `已导航到${pageNames[pageName] || pageName}`;
        break;
      }

      case 'OpenOrbCore':
      default: {
        page = 'pages/Index';
        resultMsg = '星核地面站已就绪';
        break;
      }
    }

    pageLoader.loadContent(page, (err) => {
      if (err.code) {
        hilog.error(DOMAIN, TAG, `loadContent ${page} failed: ${JSON.stringify(err)}`);
      }
    });

    // Store intent info for RemoteControl page to pick up and forward via WebSocket
    AppStorage.setOrCreate('pendingIntent', JSON.stringify({ name, param }));

    const result: insightIntent.ExecuteResult = {
      code: 0,
      result: {
        message: resultMsg,
      } as Record<string, Object>,
    };
    return result;
  }

  onExecuteInUIAbilityBackgroundMode(
    name: string,
    param: Record<string, Object>
  ): insightIntent.ExecuteResult {
    hilog.info(DOMAIN, TAG, `background intent: ${name}`);
    return { code: 0, result: { message: '星核后台就绪' } as Record<string, Object> };
  }
}
