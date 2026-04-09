// ARView
// ----------------------------------------------------------------------------
// Real HarmonyOS AR Engine Kit integration. Three-layer stack:
//
//   0.  XComponent — bound to the AR Engine session's camera texture. AR
//       Engine renders the live RGB feed here every frame, with world-space
//       pose tracking, plane detection, and lens distortion handled
//       natively by the OS.
//
//   1.  Transparent Web component — hosts our Three.js scene. Each frame we
//       push the AR camera's view + projection matrices via runJavaScript,
//       plus any detected plane poses and the currently placed anchor. The
//       WebGL camera injects those matrices directly, so the virtual
//       satellite rendered on top aligns 1:1 with the real-world scene.
//
//   2.  HUD — tracking state badge, detected plane count, PLACE / CLEAR /
//       CLOSE buttons, and a rolling diagnostic log.
//
// Tap placement flow:
//   user tap (x, y)  ->  last ARFrame.hitTest(x, y)  ->  first ARPlane hit
//   ->  arSession.createAnchor(pose)  ->  every subsequent pump reads the
//   anchor's world pose and pushes it to the viewer  ->  satellite rides
//   the anchor, so it stays locked to the physical spot even when the user
//   walks around it.

import router from '@ohos.router';
import common from '@ohos.app.ability.common';
import util from '@ohos.util';
import webview from '@ohos.web.webview';
import abilityAccessCtrl, { Permissions } from '@ohos.abilityAccessCtrl';
import { BusinessError } from '@ohos.base';

import { Theme } from '../common/Theme';
import { ensureViewerAssets, arViewerUrl } from '../common/ViewerAssets';
import {
  arEngineSession,
  ARMatrixSnapshot,
  ARPlaneSnapshot,
  ARAnchorSnapshot,
  ARTrackingState
} from '../common/AREngineSession';

const GLB_RAWFILE_PATH: string = 'satellite.glb';
const CHUNK_SIZE: number = 256 * 1024;

interface HudLog {
  id: number;
  text: string;
}

@Entry
@Component
struct ARView {
  @State srcUrl: string = '';
  @State engineError: string = '';
  @State permissionDenied: boolean = false;

  @State trackingState: ARTrackingState = 'not-tracking';
  @State planeCount: number = 0;
  @State placed: boolean = false;
  @State logs: HudLog[] = [];
  private logCounter: number = 0;

  private xcomponentController: XComponentController = new XComponentController();
  private webController: webview.WebviewController = new webview.WebviewController();
  private webReady: boolean = false;
  private glbDelivered: boolean = false;
  private lastSurfaceId: string = '';

  aboutToAppear(): void {
    try {
      const ctx = getContext(this) as common.UIAbilityContext;
      const base: string = ensureViewerAssets(ctx);
      this.srcUrl = arViewerUrl(base);
    } catch (e) {
      const err = e as BusinessError;
      this.engineError = `viewer assets: ${err.code} ${err.message}`;
    }

    // Pipe every AR Engine frame into the Three.js viewer.
    arEngineSession.onLog((line: string) => this.pushLog(line));
    arEngineSession.onPose((snap: ARMatrixSnapshot) => this.handlePose(snap));
    arEngineSession.onPlanes((planes: ARPlaneSnapshot[]) => this.handlePlanes(planes));
    arEngineSession.onAnchor((anchor: ARAnchorSnapshot | null) => this.handleAnchor(anchor));

    this.requestCameraAndStart();
  }

  aboutToDisappear(): void {
    arEngineSession.stop();
  }

  async onPageShow(): Promise<void> {
    // Always do a fresh start on resume — the OS may have reclaimed the
    // camera while we were backgrounded, and a half-cleaned-up session
    // would fail with code 7400201 (device in conflict). A full stop +
    // start is cheap and deterministic.
    if (arEngineSession.isRunning()) {
      await arEngineSession.stop();
    }
    this.placed = false;
    await this.tryStartAREngine();
  }

  onPageHide(): void {
    // Fully release the camera so HarmonyOS can hand it to the system
    // (lock screen overlay, another app, etc). We'll rebuild from
    // scratch when the page shows again.
    arEngineSession.stop();
  }

  private pushLog(line: string): void {
    this.logCounter += 1;
    const next: HudLog[] = this.logs.slice(-3);
    next.push({ id: this.logCounter, text: line });
    this.logs = next;
  }

  private async requestCameraAndStart(): Promise<void> {
    const ctx = getContext(this) as common.UIAbilityContext;
    const perms: Array<Permissions> = ['ohos.permission.CAMERA'];
    try {
      const atManager = abilityAccessCtrl.createAtManager();
      const result = await atManager.requestPermissionsFromUser(ctx, perms);
      if (result.authResults[0] !== 0) {
        this.permissionDenied = true;
        return;
      }
    } catch (e) {
      const err = e as BusinessError;
      this.engineError = `perm request failed: ${err.message}`;
      return;
    }
    // AR Engine start happens in the XComponent onLoad callback so the
    // native surface is ready before we bind the camera texture.
    this.tryStartAREngine();
  }

  private async tryStartAREngine(): Promise<void> {
    if (this.lastSurfaceId.length === 0) return; // surface not ready yet
    const ctx = getContext(this) as common.UIAbilityContext;
    const width: number = 1080;
    const height: number = 2412;
    const ok: boolean = await arEngineSession.start(ctx, this.lastSurfaceId, width, height);
    if (!ok) {
      // Surface the underlying reason rather than a generic failure string.
      const detail: string = arEngineSession.getLastStartError();
      this.engineError = detail.length > 0 ? detail : 'AR Engine start failed (unknown)';
    } else {
      this.engineError = '';
    }
  }

  private handlePose(snap: ARMatrixSnapshot): void {
    if (this.trackingState !== snap.trackingState) {
      this.trackingState = snap.trackingState;
    }
    if (!this.webReady) return;
    const viewJson: string = JSON.stringify(snap.view);
    const projJson: string = JSON.stringify(snap.projection);
    this.webController.runJavaScript(
      `window.arSetCamera && window.arSetCamera(${viewJson}, ${projJson});`
    );
  }

  private handlePlanes(planes: ARPlaneSnapshot[]): void {
    if (this.planeCount !== planes.length) {
      this.planeCount = planes.length;
    }
    if (!this.webReady) return;
    const payload: string = JSON.stringify(planes);
    // JSON.stringify output uses double quotes — safe to inline inside a
    // single-quoted JS string literal.
    const escaped: string = payload.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
    this.webController.runJavaScript(
      `window.arSetPlanes && window.arSetPlanes('${escaped}');`
    );
  }

  private handleAnchor(anchor: ARAnchorSnapshot | null): void {
    if (!this.webReady) return;
    if (anchor === null) {
      this.webController.runJavaScript('window.arClearAnchor && window.arClearAnchor();');
      return;
    }
    const poseJson: string = JSON.stringify(anchor.pose);
    this.webController.runJavaScript(
      `window.arSetAnchor && window.arSetAnchor(${poseJson});`
    );
  }

  private deliverGlb(): void {
    if (this.glbDelivered) return;
    this.glbDelivered = true;
    try {
      const ctx = getContext(this) as common.UIAbilityContext;
      const bytes: Uint8Array = ctx.resourceManager.getRawFileContentSync(GLB_RAWFILE_PATH);
      const b64Helper = new util.Base64Helper();
      const b64: string = b64Helper.encodeToStringSync(bytes);

      this.webController.runJavaScript('window.__orbResetGlb && window.__orbResetGlb();');
      let offset: number = 0;
      while (offset < b64.length) {
        const end: number = Math.min(offset + CHUNK_SIZE, b64.length);
        const chunk: string = b64.substring(offset, end);
        const js: string = `window.__orbPushGlbChunk && window.__orbPushGlbChunk('${chunk}');`;
        this.webController.runJavaScript(js);
        offset = end;
      }
      this.webController.runJavaScript('window.__orbCommitGlb && window.__orbCommitGlb();');
    } catch (e) {
      const err = e as BusinessError;
      this.pushLog(`GLB delivery failed: ${err.code} ${err.message}`);
    }
  }

  private handlePlace(): void {
    // Fire a hit-test at the screen centre by pulling a fresh frame from the
    // session and running hitTest through it. AR Engine returns all planes
    // beneath the screen-space ray; we take the first hit and anchor to it.
    const hit = arEngineSession.performCenterHitTest();
    if (hit !== null) {
      this.placed = true;
    } else {
      this.pushLog('no plane under reticle — aim at a flat surface');
    }
  }

  private handleClear(): void {
    arEngineSession.clearAnchor();
    this.placed = false;
  }

  private handleClose(): void {
    arEngineSession.stop();
    try {
      router.back();
    } catch (err) {
      console.error(`router.back failed: ${(err as Error).message}`);
    }
  }

  private stateLabel(): string {
    if (this.trackingState === 'tracking') return 'TRACKING';
    if (this.trackingState === 'limited') return 'LIMITED';
    return 'INITIALISING';
  }

  private stateColor(): string {
    if (this.trackingState === 'tracking') return Theme.SUCCESS;
    if (this.trackingState === 'limited') return Theme.AMBER;
    return Theme.TEXT_DIM;
  }

  build() {
    Stack() {
      // ---- Layer 0: AR Engine camera + world rendering --------------------
      if (this.permissionDenied) {
        Column() {
          Text('CAMERA PERMISSION DENIED')
            .fontSize(12)
            .fontColor(Theme.DANGER)
            .letterSpacing(2)
          Text('请在系统设置中授予相机权限后再进入 AR 模式')
            .fontSize(10)
            .fontColor(Theme.TEXT_DIM)
            .margin({ top: 8 })
            .textAlign(TextAlign.Center)
        }
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
        .width('100%')
        .height('100%')
        .backgroundColor(Theme.BG)
      } else {
        XComponent({
          id: 'arEnginePreview',
          type: XComponentType.SURFACE,
          controller: this.xcomponentController
        })
          .width('100%')
          .height('100%')
          .onLoad(() => {
            try {
              this.lastSurfaceId = this.xcomponentController.getXComponentSurfaceId();
            } catch (_e) {
              this.lastSurfaceId = '';
            }
            this.tryStartAREngine();
          })
      }

      // ---- Layer 1: transparent Three.js virtual-content overlay ----------
      if (this.srcUrl.length > 0 && !this.permissionDenied) {
        Web({ src: this.srcUrl, controller: this.webController })
          .domStorageAccess(true)
          .javaScriptAccess(true)
          .fileAccess(true)
          .backgroundColor('#00000000')
          .width('100%')
          .height('100%')
          .onPageEnd(() => {
            this.webReady = true;
            this.deliverGlb();
          })
      }

      // ---- Layer 2: HUD ---------------------------------------------------
      Column() {
        // Top status row.
        Row() {
          Row() {
            Stack()
              .width(6)
              .height(6)
              .backgroundColor(this.stateColor())
              .borderRadius(3)
            Text('AR ENGINE')
              .fontSize(10)
              .fontColor(Theme.CYAN_BRIGHT)
              .letterSpacing(3)
              .margin({ left: 8 })
            Text(`· ${this.stateLabel()}`)
              .fontSize(10)
              .fontColor(this.stateColor())
              .letterSpacing(2)
              .margin({ left: 6 })
          }
          Blank()
          Text(`${this.planeCount} PLANES`)
            .fontSize(9)
            .fontColor(Theme.TEXT_DIM)
            .letterSpacing(2)
            .margin({ right: 12 })
          Button() {
            Text('CLOSE')
              .fontSize(10)
              .fontColor(Theme.CYAN)
              .letterSpacing(2)
          }
          .type(ButtonType.Normal)
          .backgroundColor('rgba(0,0,0,0.55)')
          .border({ width: 1, color: Theme.BORDER_DIM })
          .borderRadius(0)
          .height(30)
          .padding({ left: 12, right: 12 })
          .onClick(() => this.handleClose())
        }
        .width('100%')
        .padding({ left: 14, right: 14, top: 10, bottom: 10 })
        .backgroundColor('rgba(0,0,0,0.35)')

        Blank()

        // Centre reticle — only while not yet placed.
        if (!this.placed && !this.permissionDenied) {
          Stack() {
            Stack()
              .width(120)
              .height(120)
              .border({ width: 1, color: 'rgba(34,211,238,0.4)' })
              .borderRadius(60)
            Stack()
              .width(60)
              .height(60)
              .border({ width: 1, color: 'rgba(34,211,238,0.7)' })
              .borderRadius(30)
            Stack()
              .width(6)
              .height(6)
              .backgroundColor(Theme.CYAN)
              .borderRadius(3)
          }
          .width(120)
          .height(120)
        }

        Blank()

        // Bottom control panel.
        Column() {
          Text(this.placed ? 'ANCHORED · WALK AROUND' : 'AIM AT A FLAT SURFACE')
            .fontSize(10)
            .fontColor(Theme.CYAN)
            .letterSpacing(3)
            .margin({ bottom: 10 })
            .textAlign(TextAlign.Center)

          if (this.engineError.length > 0) {
            Text(this.engineError)
              .fontSize(9)
              .fontColor(Theme.DANGER)
              .margin({ bottom: 8 })
              .textAlign(TextAlign.Center)
          }

          Row() {
            Button() {
              Text(this.placed ? 'REPLACE' : 'PLACE HERE')
                .fontSize(12)
                .fontColor(Theme.BG)
                .letterSpacing(2)
                .fontWeight(FontWeight.Bold)
            }
            .type(ButtonType.Normal)
            .backgroundColor(Theme.CYAN)
            .border({ width: 1, color: Theme.CYAN })
            .borderRadius(0)
            .height(44)
            .layoutWeight(2)
            .onClick(() => this.handlePlace())

            Blank().width(10)

            Button() {
              Text('CLEAR')
                .fontSize(11)
                .fontColor(Theme.VIOLET)
                .letterSpacing(2)
            }
            .type(ButtonType.Normal)
            .backgroundColor('rgba(0,0,0,0.55)')
            .border({ width: 1, color: 'rgba(167,139,250,0.5)' })
            .borderRadius(0)
            .height(44)
            .layoutWeight(1)
            .enabled(this.placed)
            .onClick(() => this.handleClear())
          }
          .width('100%')

          if (this.logs.length > 0) {
            Column() {
              ForEach(this.logs, (item: HudLog) => {
                Text(item.text)
                  .fontSize(8)
                  .fontColor(Theme.TEXT_MUTED)
                  .margin({ top: 2 })
                  .textAlign(TextAlign.Center)
                  .width('100%')
              }, (item: HudLog) => item.id.toString())
            }
            .width('100%')
            .margin({ top: 8 })
          }
        }
        .width('92%')
        .padding(12)
        .backgroundColor('rgba(0,0,0,0.45)')
        .border({ width: 1, color: Theme.BORDER_HAIR })
      }
      .width('100%')
      .height('100%')
      .padding({ top: 40, bottom: 28 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Theme.BG)
  }
}
