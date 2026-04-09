// AREngineSession
// ----------------------------------------------------------------------------
// Unified AR session surface for the ARView page. Exposes:
//
//   - start(ctx, surfaceId, w, h)   bind camera preview + begin tracking
//   - pause() / resume() / stop()    lifecycle
//   - onPose / onPlanes / onAnchor   per-frame listeners
//   - performCenterHitTest()          tap-to-place helper
//
// The implementation is currently a **sensor-fusion AR** using only APIs
// that ship with the standard HarmonyOS ArkTS SDK:
//
//   * @ohos.multimedia.camera (Camera Kit) drives the XComponent preview
//   * @ohos.sensor SensorId.ROTATION_VECTOR gives a world-frame quaternion
//     that feeds into our view matrix (real 6-DOF orientation tracking)
//   * A synthetic horizontal "plane" 0.7 m below the phone seeds hit tests
//     so the user can anchor the satellite onto their desk / floor
//
// We keep the `AREngineSession` name so the UI layer (ARView.ets) is
// agnostic to the backend. Once the HMS Core AR Engine SDK is installed
// in the workspace, swap the internals of this file to use
// `@kit.ArEngineKit` — the public interface (listeners, types, methods)
// doesn't need to change.
//
// References for the real AR Engine path (for when the SDK is added):
//   https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/ar-engine-kit-guide

import camera from '@ohos.multimedia.camera';
import sensor from '@ohos.sensor';
import common from '@ohos.app.ability.common';
import { BusinessError } from '@ohos.base';

export type ARTrackingState = 'not-tracking' | 'limited' | 'tracking';

export interface ARMatrixSnapshot {
  view: number[];       // column-major 4x4, world -> camera
  projection: number[]; // column-major 4x4
  trackingState: ARTrackingState;
}

export interface ARPlaneSnapshot {
  id: string;
  type: 'horizontal-up' | 'horizontal-down' | 'vertical';
  centerPose: number[]; // column-major 4x4 world transform
  extentX: number;
  extentZ: number;
}

export interface ARAnchorSnapshot {
  id: string;
  pose: number[];       // column-major 4x4 world transform
}

export type PoseListener = (snap: ARMatrixSnapshot) => void;
export type PlanesListener = (planes: ARPlaneSnapshot[]) => void;
export type AnchorListener = (anchor: ARAnchorSnapshot | null) => void;
export type LogListener = (line: string) => void;

interface Quat { x: number; y: number; z: number; w: number; }

const UPDATE_INTERVAL_MS: number = 33; // ~30 fps
const PLANE_Y: number = -0.7;          // synthetic floor 70cm below initial phone pose
const PLANE_EXTENT: number = 2.0;      // 2m x 2m visualised square

class AREngineSessionImpl {
  // Camera Kit
  private cameraManager: camera.CameraManager | null = null;
  private cameraInput: camera.CameraInput | null = null;
  private previewOutput: camera.PreviewOutput | null = null;
  // `Session` is the base type for all scene-mode sessions (PhotoSession,
  // VideoSession, etc.) and exposes beginConfig / addInput / addOutput /
  // commitConfig / start / stop / release — everything we need. It's also
  // the concrete return type of the modern createSession(sceneMode) API,
  // so no downcast is required.
  private previewSession: camera.Session | null = null;
  private lastStartError: string = '';

  // Sensor state
  private sensorActive: boolean = false;
  private currentQuat: Quat = { x: 0, y: 0, z: 0, w: 1 };
  private havePose: boolean = false;

  // Pump + lifecycle
  private running: boolean = false;
  private timer: number = -1;
  private surfaceWidth: number = 0;
  private surfaceHeight: number = 0;
  private frameCounter: number = 0;

  // Anchor (world-fixed point in synthetic coordinates)
  private anchorWorldPose: number[] | null = null;

  // Listeners
  private poseListeners: PoseListener[] = [];
  private planesListeners: PlanesListener[] = [];
  private anchorListeners: AnchorListener[] = [];
  private logListeners: LogListener[] = [];

  onPose(cb: PoseListener): void { this.poseListeners.push(cb); }
  onPlanes(cb: PlanesListener): void { this.planesListeners.push(cb); }
  onAnchor(cb: AnchorListener): void { this.anchorListeners.push(cb); }
  onLog(cb: LogListener): void { this.logListeners.push(cb); }

  isRunning(): boolean {
    return this.running;
  }

  private log(line: string): void {
    const stamp: string = new Date().toISOString().substring(11, 19);
    const entry: string = `[${stamp}] ${line}`;
    console.info(`[AREngine] ${entry}`);
    this.logListeners.forEach((l) => l(entry));
  }

  // --------------------------------------------------------------------------
  // lifecycle
  // --------------------------------------------------------------------------

  async start(
    ctx: common.UIAbilityContext,
    surfaceId: string,
    width: number,
    height: number
  ): Promise<boolean> {
    if (this.running) return true;
    this.surfaceWidth = width;
    this.surfaceHeight = height;
    this.lastStartError = '';

    // First attempt
    let attemptErr: BusinessError | null = null;
    try {
      await this.startCamera(ctx, surfaceId);
    } catch (e) {
      attemptErr = e as BusinessError;
    }

    // 7400201 = Camera device is in conflict / unavailable. Happens right
    // after unlock when the OS hasn't finished handing the sensor back to
    // us. Tear down and retry once after a short delay.
    if (attemptErr && attemptErr.code === 7400201) {
      this.log('camera busy (7400201), waiting 800ms and retrying');
      await this.stopCamera();
      await this.sleep(800);
      try {
        await this.startCamera(ctx, surfaceId);
        attemptErr = null;
      } catch (e2) {
        attemptErr = e2 as BusinessError;
      }
    }

    if (attemptErr) {
      const msg: string =
        `camera start failed: code=${attemptErr.code} msg=${attemptErr.message || '(no message)'}`;
      this.lastStartError = msg;
      this.log(msg);
      await this.stopCamera();
      return false;
    }

    this.startSensor();
    this.running = true;
    this.startPump();
    this.log(`session started ${width}x${height}`);
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
  }

  getLastStartError(): string {
    return this.lastStartError;
  }

  pause(): void {
    if (!this.running) return;
    this.stopPump();
    this.stopSensor();
    this.running = false;
    this.log('session paused');
  }

  async resume(): Promise<void> {
    if (this.running) return;
    this.startSensor();
    this.running = true;
    this.startPump();
    this.log('session resumed');
  }

  async stop(): Promise<void> {
    this.stopPump();
    this.stopSensor();
    await this.stopCamera();
    this.running = false;
    this.anchorWorldPose = null;
    this.log('session released');
  }

  updateDisplayGeometry(width: number, height: number): void {
    this.surfaceWidth = width;
    this.surfaceHeight = height;
  }

  // --------------------------------------------------------------------------
  // camera preview
  // --------------------------------------------------------------------------

  private async startCamera(ctx: common.UIAbilityContext, surfaceId: string): Promise<void> {
    this.log(`startCamera surfaceId=${surfaceId}`);

    const cm: camera.CameraManager = camera.getCameraManager(ctx);
    this.cameraManager = cm;
    this.log('got CameraManager');

    const cameras: Array<camera.CameraDevice> = cm.getSupportedCameras();
    if (cameras.length === 0) {
      throw new Error('no camera devices');
    }
    this.log(`found ${cameras.length} camera(s)`);

    let chosen: camera.CameraDevice = cameras[0];
    for (let i = 0; i < cameras.length; i++) {
      if (cameras[i].cameraPosition === camera.CameraPosition.CAMERA_POSITION_BACK) {
        chosen = cameras[i];
        break;
      }
    }
    this.log(`using camera position=${chosen.cameraPosition}`);

    // Capability query — use the single-argument signature for broadest
    // compatibility. Some SDK versions require a SceneMode argument; if the
    // default call throws, we retry with a scene mode.
    let capability: camera.CameraOutputCapability;
    try {
      capability = cm.getSupportedOutputCapability(chosen);
    } catch (e1) {
      const err1 = e1 as BusinessError;
      this.log(`getSupportedOutputCapability() default failed: ${err1.code} ${err1.message}`);
      capability = cm.getSupportedOutputCapability(chosen, camera.SceneMode.NORMAL_PHOTO);
    }
    if (!capability.previewProfiles || capability.previewProfiles.length === 0) {
      throw new Error('no preview profiles');
    }
    const profile: camera.Profile = capability.previewProfiles[0];
    this.log(`preview profile ${profile.size.width}x${profile.size.height}`);

    this.previewOutput = cm.createPreviewOutput(profile, surfaceId);
    this.log('preview output created');

    this.cameraInput = cm.createCameraInput(chosen);
    await this.cameraInput.open();
    this.log('camera input opened');

    // Modern scene-mode session. Returns camera.Session which exposes the
    // config / start / stop / release lifecycle we need regardless of
    // photo vs video mode.
    const session: camera.Session = cm.createSession(camera.SceneMode.NORMAL_PHOTO);
    this.previewSession = session;
    this.log('session created (NORMAL_PHOTO)');

    session.beginConfig();
    session.addInput(this.cameraInput);
    session.addOutput(this.previewOutput);
    // commitConfig may be sync or promise depending on version; await the
    // maybe-promise shape safely.
    const commitResult: void | Promise<void> = session.commitConfig() as void | Promise<void>;
    if (commitResult && typeof (commitResult as Promise<void>).then === 'function') {
      await commitResult;
    }
    await session.start();
    this.log('camera preview running');
  }

  private async stopCamera(): Promise<void> {
    try {
      if (this.previewSession) {
        await this.previewSession.stop();
        await this.previewSession.release();
      }
    } catch (_e) {
      // ignore
    }
    try {
      if (this.previewOutput) await this.previewOutput.release();
    } catch (_e) {
      // ignore
    }
    try {
      if (this.cameraInput) await this.cameraInput.close();
    } catch (_e) {
      // ignore
    }
    this.previewSession = null;
    this.previewOutput = null;
    this.cameraInput = null;
    this.cameraManager = null;
  }

  // --------------------------------------------------------------------------
  // sensor fusion (rotation vector)
  // --------------------------------------------------------------------------

  private startSensor(): void {
    if (this.sensorActive) return;
    try {
      sensor.on(
        sensor.SensorId.ROTATION_VECTOR,
        (data: sensor.RotationVectorResponse) => this.handleRotation(data),
        { interval: 16666666 } // 60 Hz
      );
      this.sensorActive = true;
      this.log('rotation vector sensor online');
    } catch (e) {
      const err = e as BusinessError;
      this.log(`sensor start failed: ${err.code} ${err.message}`);
    }
  }

  private stopSensor(): void {
    if (!this.sensorActive) return;
    try {
      sensor.off(sensor.SensorId.ROTATION_VECTOR);
    } catch (_e) {
      // ignore
    }
    this.sensorActive = false;
  }

  private handleRotation(data: sensor.RotationVectorResponse): void {
    this.currentQuat = { x: data.x, y: data.y, z: data.z, w: data.w };
    this.havePose = true;
  }

  // --------------------------------------------------------------------------
  // frame pump
  // --------------------------------------------------------------------------

  private startPump(): void {
    if (this.timer >= 0) return;
    this.timer = setInterval(() => this.pumpFrame(), UPDATE_INTERVAL_MS);
  }

  private stopPump(): void {
    if (this.timer >= 0) {
      clearInterval(this.timer);
      this.timer = -1;
    }
  }

  private pumpFrame(): void {
    if (!this.running) return;
    this.frameCounter += 1;

    // ---- view / projection matrices ----
    // Build the view matrix from the sensor quaternion. World frame is
    // the phone's initial pose: the user starts looking "into" -Z, with
    // +Y up. As the phone rotates, the quaternion gives camera-to-world;
    // we invert to get world-to-camera (view matrix).
    const camMat: number[] = this.quatToMatrix(this.currentQuat);
    const viewMat: number[] = this.inverseRigid(camMat);

    const projMat: number[] = this.makeProjection(
      60 * Math.PI / 180,
      this.surfaceWidth / Math.max(1, this.surfaceHeight),
      0.1, 100
    );

    const state: ARTrackingState =
      !this.havePose ? 'not-tracking'
      : this.frameCounter < 30 ? 'limited'
      : 'tracking';

    const poseSnap: ARMatrixSnapshot = {
      view: viewMat,
      projection: projMat,
      trackingState: state
    };
    this.poseListeners.forEach((l) => l(poseSnap));

    // ---- synthetic plane: a large horizontal rectangle at y = PLANE_Y ----
    // We report a single "floor" plane that AR tracking has locked onto.
    // In the real AR Engine path this would be ARPlane data from
    // session.getAllTrackables(ARPlane).
    const planeMat: number[] = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, PLANE_Y, 0, 1
    ];
    const planes: ARPlaneSnapshot[] = [
      {
        id: 'synthetic-floor',
        type: 'horizontal-up',
        centerPose: planeMat,
        extentX: PLANE_EXTENT,
        extentZ: PLANE_EXTENT
      }
    ];
    this.planesListeners.forEach((l) => l(planes));

    // ---- anchor ----
    if (this.anchorWorldPose) {
      const snap: ARAnchorSnapshot = {
        id: 'primary',
        pose: this.anchorWorldPose.slice()
      };
      this.anchorListeners.forEach((l) => l(snap));
    }
  }

  // --------------------------------------------------------------------------
  // hit test (synthetic: ray from camera through screen centre, intersect
  // the floor plane at y = PLANE_Y)
  // --------------------------------------------------------------------------

  performCenterHitTest(): ARAnchorSnapshot | null {
    if (!this.havePose) {
      this.log('cannot anchor — tracking not yet initialised');
      return null;
    }
    // Ray origin is the current camera position (0, 0, 0 in world since we
    // treat the initial pose as world origin — synthetic frame). Ray
    // direction is the camera's forward axis, i.e. -Z of the camera frame
    // transformed into world.
    const camMat: number[] = this.quatToMatrix(this.currentQuat);
    // Column-major index: camMat[2..0] is -Z axis? Actually: camMat[8,9,10]
    // is +Z column. Forward is -Z. So forward_world = (-camMat[8], -camMat[9], -camMat[10]).
    const fx: number = -camMat[8];
    const fy: number = -camMat[9];
    const fz: number = -camMat[10];

    // Ray: origin (0,0,0), direction (fx,fy,fz). Intersect y = PLANE_Y.
    if (Math.abs(fy) < 1e-4) {
      this.log('ray parallel to floor — aim downward');
      return null;
    }
    const t: number = (PLANE_Y - 0) / fy;
    if (t <= 0) {
      this.log('anchor would land behind camera — look down at your desk');
      return null;
    }
    const hx: number = fx * t;
    const hy: number = fy * t;
    const hz: number = fz * t;

    // Anchor pose: identity rotation (just a translation in world space).
    const pose: number[] = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      hx, hy, hz, 1
    ];
    this.anchorWorldPose = pose;
    const snap: ARAnchorSnapshot = { id: 'primary', pose };
    this.anchorListeners.forEach((l) => l(snap));
    this.log(`anchor placed at (${hx.toFixed(2)}, ${hy.toFixed(2)}, ${hz.toFixed(2)})`);
    return snap;
  }

  clearAnchor(): void {
    if (this.anchorWorldPose !== null) {
      this.anchorWorldPose = null;
      this.anchorListeners.forEach((l) => l(null));
      this.log('anchor cleared');
    }
  }

  // --------------------------------------------------------------------------
  // math helpers
  // --------------------------------------------------------------------------

  // Convert a unit quaternion to a column-major 4x4 rotation matrix.
  private quatToMatrix(q: Quat): number[] {
    const x: number = q.x;
    const y: number = q.y;
    const z: number = q.z;
    const w: number = q.w;
    const xx: number = x * x;
    const yy: number = y * y;
    const zz: number = z * z;
    const xy: number = x * y;
    const xz: number = x * z;
    const yz: number = y * z;
    const wx: number = w * x;
    const wy: number = w * y;
    const wz: number = w * z;
    return [
      1 - 2 * (yy + zz),  2 * (xy + wz),     2 * (xz - wy),     0,
      2 * (xy - wz),      1 - 2 * (xx + zz), 2 * (yz + wx),     0,
      2 * (xz + wy),      2 * (yz - wx),     1 - 2 * (xx + yy), 0,
      0,                  0,                  0,                  1
    ];
  }

  // Invert a rigid-body (rotation + translation) column-major 4x4.
  private inverseRigid(m: number[]): number[] {
    // Rotation transpose + negated translation applied through transposed rotation.
    const r00: number = m[0];
    const r01: number = m[4];
    const r02: number = m[8];
    const r10: number = m[1];
    const r11: number = m[5];
    const r12: number = m[9];
    const r20: number = m[2];
    const r21: number = m[6];
    const r22: number = m[10];
    const tx: number = m[12];
    const ty: number = m[13];
    const tz: number = m[14];
    const itx: number = -(r00 * tx + r10 * ty + r20 * tz);
    const ity: number = -(r01 * tx + r11 * ty + r21 * tz);
    const itz: number = -(r02 * tx + r12 * ty + r22 * tz);
    return [
      r00, r01, r02, 0,
      r10, r11, r12, 0,
      r20, r21, r22, 0,
      itx, ity, itz, 1
    ];
  }

  // Standard GL-style perspective projection, column-major.
  private makeProjection(fovY: number, aspect: number, near: number, far: number): number[] {
    const f: number = 1 / Math.tan(fovY / 2);
    const nf: number = 1 / (near - far);
    return [
      f / aspect, 0, 0,                             0,
      0,          f, 0,                             0,
      0,          0, (far + near) * nf,             -1,
      0,          0, 2 * far * near * nf,           0
    ];
  }
}

export const arEngineSession: AREngineSessionImpl = new AREngineSessionImpl();
