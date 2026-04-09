// ViewerAssets
// ----------------------------------------------------------------------------
// Copies the offline Three.js viewer bundle out of rawfile/ into the app's
// writable files directory. The HarmonyOS Web component blocks ES-module
// sub-resource imports under the `resource://rawfile/` scheme, but allows
// them under `file://`, so we materialise the viewer once on first launch
// and load it from filesDir instead.
//
// Source layout (rawfile):
//   satellite-viewer.html
//   satellite.glb
//   vendor/three.module.js
//   vendor/loaders/GLTFLoader.js
//   vendor/utils/BufferGeometryUtils.js
//
// Target layout (<filesDir>/viewer): identical relative structure.

import common from '@ohos.app.ability.common';
import fs from '@ohos.file.fs';
import { BusinessError } from '@ohos.base';

// Only HTML + UMD vendor scripts live in filesDir. The GLB is streamed into
// the WebView via runJavaScript from Satellite3D, so it stays in rawfile.
const VIEWER_FILES: string[] = [
  'satellite-viewer.html',
  'ar-viewer.html',
  'vendor/three.min.js',
  'vendor/GLTFLoader.js'
];

const VIEWER_DIRS: string[] = [
  '',
  '/vendor'
];

function ensureDir(path: string): void {
  try {
    fs.mkdirSync(path);
  } catch (e) {
    const err = e as BusinessError;
    // 13900015 = EEXIST on HarmonyOS file APIs; silently accept.
    if (err.code !== 13900015) {
      console.warn(`ViewerAssets: mkdir ${path} -> ${err.code} ${err.message}`);
    }
  }
}

function writeFile(path: string, data: Uint8Array): void {
  const file = fs.openSync(
    path,
    fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY | fs.OpenMode.TRUNC
  );
  fs.writeSync(file.fd, data.buffer);
  fs.closeSync(file);
}

/**
 * Materialise the viewer bundle under `<filesDir>/viewer`. Safe to call on
 * every page open — the copy is cheap and overwrites in place so code
 * changes during dev take effect on the next launch. Returns the absolute
 * base directory so callers can build `file://<base>/<page>.html` URLs.
 */
export function ensureViewerAssets(context: common.UIAbilityContext): string {
  const base: string = context.filesDir + '/viewer';

  for (let i = 0; i < VIEWER_DIRS.length; i++) {
    ensureDir(base + VIEWER_DIRS[i]);
  }

  const resMgr = context.resourceManager;
  for (let i = 0; i < VIEWER_FILES.length; i++) {
    const rel: string = VIEWER_FILES[i];
    const target: string = base + '/' + rel;
    const data: Uint8Array = resMgr.getRawFileContentSync(rel);
    writeFile(target, data);
  }

  return base;
}

/** Convenience: absolute file:// URL for the satellite (remote) viewer. */
export function satelliteViewerUrl(base: string): string {
  return 'file://' + base + '/satellite-viewer.html';
}

/** Convenience: absolute file:// URL for the AR viewer. */
export function arViewerUrl(base: string): string {
  return 'file://' + base + '/ar-viewer.html';
}
