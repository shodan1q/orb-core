import { AbilityConstant, ConfigurationConstant, UIAbility, Want } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';

const DOMAIN = 0x0000;

export default class EntryAbility extends UIAbility {
  private pendingUri: string = '';
  private windowStage: window.WindowStage | null = null;

  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    try {
      this.context.getApplicationContext().setColorMode(ConfigurationConstant.ColorMode.COLOR_MODE_NOT_SET);
    } catch (err) {
      hilog.error(DOMAIN, 'testTag', 'Failed to set colorMode. Cause: %{public}s', JSON.stringify(err));
    }
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onCreate');
    // Capture deep link URI from the Want so onWindowStageCreate can
    // route to the correct page.
    if (want.uri) {
      this.pendingUri = want.uri;
      hilog.info(DOMAIN, 'testTag', 'deep link URI: %{public}s', want.uri);
    }
  }

  onNewWant(want: Want, _launchParam: AbilityConstant.LaunchParam): void {
    // Called when the app is already running and a new deep link arrives.
    if (want.uri) {
      hilog.info(DOMAIN, 'testTag', 'onNewWant deep link URI: %{public}s', want.uri);
      const page = this.pageForUri(want.uri);
      if (this.windowStage) {
        this.windowStage.loadContent(page);
      }
    }
  }

  private pageForUri(uri: string): string {
    if (uri.includes('/photo') || uri.includes('/reflect') || uri.includes('/status')) {
      return 'pages/RemoteControl';
    }
    return 'pages/Index';
  }

  onDestroy(): void {
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    // Main window is created, set main page for this ability
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onWindowStageCreate');

    this.windowStage = windowStage;

    // On this HarmonyOS build, setWindowSystemBarProperties is a no-op
    // for the nav bar, so the only reliable way to get rid of the bright
    // home-indicator strip is to let our window content draw underneath
    // the system bars (layoutFullScreen). Pages then opt their background
    // layer into the safe area via .expandSafeArea() while keeping content
    // inside the normal safe area so nothing is clipped by the status bar.
    try {
      const mainWin = windowStage.getMainWindowSync();
      mainWin.setWindowLayoutFullScreen(true);
      mainWin.setWindowBackgroundColor('#000005');
      mainWin.setWindowSystemBarProperties({
        statusBarColor: '#00000000',
        statusBarContentColor: '#e5e7eb',
        navigationBarColor: '#00000000',
        navigationBarContentColor: '#e5e7eb'
      });
    } catch (e) {
      hilog.error(DOMAIN, 'testTag', 'window chrome setup failed: %{public}s', JSON.stringify(e));
    }

    const targetPage = this.pendingUri ? this.pageForUri(this.pendingUri) : 'pages/Index';
    this.pendingUri = '';
    windowStage.loadContent(targetPage, (err) => {
      if (err.code) {
        hilog.error(DOMAIN, 'testTag', 'Failed to load the content. Cause: %{public}s', JSON.stringify(err));
        return;
      }
      hilog.info(DOMAIN, 'testTag', 'Succeeded in loading the content.');
    });
  }

  onWindowStageDestroy(): void {
    // Main window is destroyed, release UI related resources
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onWindowStageDestroy');
  }

  onForeground(): void {
    // Ability has brought to foreground
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onForeground');
  }

  onBackground(): void {
    // Ability has back to background
    hilog.info(DOMAIN, 'testTag', '%{public}s', 'Ability onBackground');
  }
}