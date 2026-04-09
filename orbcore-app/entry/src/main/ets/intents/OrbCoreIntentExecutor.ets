// OrbCoreIntentExecutor
// ----------------------------------------------------------------------------
// InsightIntent executor that lets 小艺 (Celia) invoke 星核 by voice.
//
// Supported intents:
//   "OpenOrbCore"        — 打开星核 / 打开卫星控制台
//   "TakePhoto"          — 星核拍照 / 卫星拍照
//   "ReflectSunlight"    — 反射阳光 / 照亮某个地方
//   "CheckStatus"        — 查看卫星状态

import InsightIntentExecutor from '@ohos.app.ability.InsightIntentExecutor';
import insightIntent from '@ohos.app.ability.insightIntent';
import { window } from '@kit.ArkUI';
import { hilog } from '@kit.PerformanceAnalysisKit';

const DOMAIN = 0x0000;
const TAG = 'OrbCoreIntent';

export default class OrbCoreIntentExecutor extends InsightIntentExecutor {
  // Called when 小艺 triggers an intent while the app comes to the foreground.
  onExecuteInUIAbilityForegroundMode(
    name: string,
    param: Record<string, Object>,
    pageLoader: window.WindowStage
  ): insightIntent.ExecuteResult {
    hilog.info(DOMAIN, TAG, `intent: ${name}, params: ${JSON.stringify(param)}`);

    let page = 'pages/Index';
    let resultMsg = '星核已启动';

    switch (name) {
      case 'TakePhoto':
        page = 'pages/RemoteControl';
        resultMsg = '已打开遥控台，准备拍照';
        break;
      case 'ReflectSunlight':
        page = 'pages/RemoteControl';
        resultMsg = '已打开遥控台，准备反射阳光';
        break;
      case 'CheckStatus':
        page = 'pages/RemoteControl';
        resultMsg = '已打开遥控台，正在查看卫星状态';
        break;
      case 'OpenOrbCore':
      default:
        page = 'pages/Index';
        resultMsg = '星核地面站已就绪';
        break;
    }

    pageLoader.loadContent(page, (err) => {
      if (err.code) {
        hilog.error(DOMAIN, TAG, `loadContent ${page} failed: ${JSON.stringify(err)}`);
      }
    });

    const result: insightIntent.ExecuteResult = {
      code: 0,
      result: {
        message: resultMsg,
      } as Record<string, Object>,
    };
    return result;
  }

  // Background mode: not applicable for our UI-centric app, return success.
  onExecuteInUIAbilityBackgroundMode(
    name: string,
    param: Record<string, Object>
  ): insightIntent.ExecuteResult {
    hilog.info(DOMAIN, TAG, `background intent: ${name}`);
    return { code: 0, result: { message: '星核后台就绪' } as Record<string, Object> };
  }
}
