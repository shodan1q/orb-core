// Satellite3D
// ----------------------------------------------------------------------------
// 3D viewport for the HarmonyOS remote cockpit. Hosts a Three.js scene inside
// a Web component and feeds it the same satellite.glb asset the orb-core web
// dashboard uses.
//
// Why this pipeline is convoluted:
//   HarmonyOS' ArkWeb engine (Chromium-based) imposes two restrictions that
//   made simpler approaches fail during bring-up:
//     1. ES-module sub-resource imports are blocked under `resource://rawfile/`
//        and `file://` schemes, so importmap + modular three.js is out.
//     2. XHR / fetch() from `file://` is also restricted, so GLTFLoader can't
//        simply pull the GLB from disk.
//   Workaround: use the **UMD** build of three 0.147 (classic <script>, no
//   modules) and inject the GLB bytes from ArkTS via base64-chunked
//   runJavaScript calls into window.__orbPushGlbChunk / window.__orbCommitGlb.
//
// Attitude flow:
//   ArkTS @Prop pitch/roll/yaw --> onAttitude() --> runJavaScript --> window.setAttitude()

import webview from '@ohos.web.webview';
import common from '@ohos.app.ability.common';
import util from '@ohos.util';
import { BusinessError } from '@ohos.base';
import { ensureViewerAssets } from '../common/ViewerAssets';

const GLB_RAWFILE_PATH: string = 'satellite.glb';
// Each runJavaScript call has overhead and size limits — 256 kB of base64
// per call is a safe middle ground. 4.1 MB GLB → ~5.5 MB base64 → ~22 calls.
const CHUNK_SIZE: number = 256 * 1024;

@Component
export struct Satellite3D {
  @Prop @Watch('onAttitude') pitch: number = 0;
  @Prop @Watch('onAttitude') roll: number = 0;
  @Prop @Watch('onAttitude') yaw: number = 0;

  @State srcUrl: string = '';
  @State bootError: string = '';

  private controller: webview.WebviewController = new webview.WebviewController();
  private ready: boolean = false;
  private glbDelivered: boolean = false;

  aboutToAppear(): void {
    try {
      const ctx = getContext(this) as common.UIAbilityContext;
      const viewerPath: string = ensureViewerAssets(ctx);
      this.srcUrl = 'file://' + viewerPath;
    } catch (e) {
      const err = e as BusinessError;
      this.bootError = `viewer assets copy failed: ${err.code} ${err.message}`;
    }
  }

  onAttitude(): void {
    if (!this.ready) return;
    const js: string = `if (window.setAttitude) { window.setAttitude(${this.pitch.toFixed(3)}, ${this.roll.toFixed(3)}, ${this.yaw.toFixed(3)}); }`;
    this.controller.runJavaScript(js);
  }

  // Read the GLB out of rawfile, base64 it, chunk it, and push the chunks
  // into the WebView. Called once after the page finishes loading.
  private deliverGlb(): void {
    if (this.glbDelivered) return;
    this.glbDelivered = true;
    try {
      const ctx = getContext(this) as common.UIAbilityContext;
      const bytes: Uint8Array = ctx.resourceManager.getRawFileContentSync(GLB_RAWFILE_PATH);

      const b64Helper = new util.Base64Helper();
      const b64: string = b64Helper.encodeToStringSync(bytes);

      this.controller.runJavaScript('window.__orbResetGlb && window.__orbResetGlb();');

      let offset: number = 0;
      while (offset < b64.length) {
        const end: number = Math.min(offset + CHUNK_SIZE, b64.length);
        const chunk: string = b64.substring(offset, end);
        // Single-quoted string literal — base64 alphabet has no single quotes
        // or backslashes, so no escaping needed.
        const js: string = `window.__orbPushGlbChunk && window.__orbPushGlbChunk('${chunk}');`;
        this.controller.runJavaScript(js);
        offset = end;
      }

      this.controller.runJavaScript('window.__orbCommitGlb && window.__orbCommitGlb();');
    } catch (e) {
      const err = e as BusinessError;
      const safe: string = (err.message || '').replace(/'/g, '');
      this.controller.runJavaScript(
        `window.__orbShowError && window.__orbShowError('GLB delivery failed: ${err.code} ${safe}');`
      );
    }
  }

  build() {
    Stack() {
      if (this.srcUrl.length > 0) {
        Web({ src: this.srcUrl, controller: this.controller })
          .domStorageAccess(true)
          .javaScriptAccess(true)
          .fileAccess(true)
          .backgroundColor('#000005')
          .width('100%')
          .height('100%')
          .onPageEnd(() => {
            this.ready = true;
            this.onAttitude();
            this.deliverGlb();
          })
      } else {
        Column() {
          Text('VIEWER BOOT FAILED')
            .fontSize(12)
            .fontColor('#f87171')
            .letterSpacing(2)
          Text(this.bootError)
            .fontSize(10)
            .fontColor('#94a3b8')
            .margin({ top: 6 })
            .textAlign(TextAlign.Center)
        }
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
        .width('100%')
        .height('100%')
      }
    }
    .width('100%')
    .height('100%')
  }
}
