// RemoteClient
// ----------------------------------------------------------------------------
// Centralised bridge between the HarmonyOS phone and the orb-core web dashboard.
//
//   [Orientation sensor] --> RemoteClient --> [WebSocket relay] --> Web dashboard
//
// The phone is the ground station: we sample orientation at ~30 Hz, normalise it
// into pitch / roll / yaw, stream it to the web end, and also expose it to the
// local UI so the on-phone attitude gauges can mirror the satellite.
//
// Messages follow the schema documented in orb-core-tech-plan-v2.md §6.1:
//   { "type": "attitude", "pitch": n, "roll": n, "yaw": n, "ts": number }
//   { "type": "command",  "action": "take_photo" | "reflect" | "status" }

import webSocket from '@ohos.net.webSocket';
import sensor from '@ohos.sensor';
import { BusinessError } from '@ohos.base';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export interface Attitude {
  pitch: number; // tilt front/back, degrees
  roll: number;  // tilt left/right, degrees
  yaw: number;   // compass rotation, degrees
}

type StateListener = (s: ConnectionState, detail?: string) => void;
type AttitudeListener = (a: Attitude) => void;
type LogListener = (line: string) => void;

class RemoteClientImpl {
  private ws: webSocket.WebSocket | null = null;
  private state: ConnectionState = 'idle';
  private lastError: string = '';
  private attitude: Attitude = { pitch: 0, roll: 0, yaw: 0 };
  private calibrationOffset: Attitude = { pitch: 0, roll: 0, yaw: 0 };
  private sensorActive: boolean = false;
  private lastSendTs: number = 0;
  private sendIntervalMs: number = 33; // ~30 Hz stream to the relay
  private url: string = 'ws://172.20.10.3:8882';
  // When the web dashboard sends attitude, we suppress local sensor
  // updates for a short window so the web values aren't immediately
  // overwritten by the next gyro frame.
  private remoteOverrideUntil: number = 0;

  private stateListeners: StateListener[] = [];
  private attitudeListeners: AttitudeListener[] = [];
  private logListeners: LogListener[] = [];

  getState(): ConnectionState { return this.state; }
  getAttitude(): Attitude { return this.attitude; }
  getUrl(): string { return this.url; }
  getLastError(): string { return this.lastError; }

  setUrl(url: string): void {
    this.url = url;
  }

  onState(cb: StateListener): void { this.stateListeners.push(cb); }
  onAttitude(cb: AttitudeListener): void { this.attitudeListeners.push(cb); }
  onLog(cb: LogListener): void { this.logListeners.push(cb); }

  private emitState(s: ConnectionState, detail?: string): void {
    this.state = s;
    if (detail !== undefined) this.lastError = detail;
    this.stateListeners.forEach((l) => l(s, detail));
    this.log(`state -> ${s}${detail ? ' (' + detail + ')' : ''}`);
  }

  private emitAttitude(a: Attitude): void {
    this.attitude = a;
    this.attitudeListeners.forEach((l) => l(a));
  }

  private log(line: string): void {
    const stamp = new Date().toISOString().substring(11, 19);
    const entry = `[${stamp}] ${line}`;
    this.logListeners.forEach((l) => l(entry));
  }

  // ---------- sensor lifecycle ----------

  startSensors(): void {
    if (this.sensorActive) return;
    try {
      sensor.on(
        sensor.SensorId.ORIENTATION,
        (data: sensor.OrientationResponse) => this.handleOrientation(data),
        { interval: 33333333 } // 30 Hz in nanoseconds
      );
      this.sensorActive = true;
      this.log('orientation sensor online');
    } catch (e) {
      const err = e as BusinessError;
      this.log(`sensor error: ${err.message || err.code}`);
    }
  }

  stopSensors(): void {
    if (!this.sensorActive) return;
    try {
      sensor.off(sensor.SensorId.ORIENTATION);
    } catch (_e) {
      // ignore
    }
    this.sensorActive = false;
    this.log('orientation sensor offline');
  }

  calibrate(): void {
    this.calibrationOffset = {
      pitch: this.attitude.pitch + this.calibrationOffset.pitch,
      roll: this.attitude.roll + this.calibrationOffset.roll,
      yaw: this.attitude.yaw + this.calibrationOffset.yaw
    };
    this.log('calibration captured');
  }

  private handleOrientation(data: sensor.OrientationResponse): void {
    // If the web dashboard recently pushed attitude values, suppress
    // sensor updates so the phone UI stays in sync with the sliders.
    if (Date.now() < this.remoteOverrideUntil) return;

    // HarmonyOS ORIENTATION returns radians: alpha (z), beta (x), gamma (y).
    const toDeg = 180 / Math.PI;
    const rawPitch = data.beta * toDeg;
    const rawRoll = data.gamma * toDeg;
    const rawYaw = data.alpha * toDeg;

    const next: Attitude = {
      pitch: this.clamp(rawPitch - this.calibrationOffset.pitch, -90, 90),
      roll: this.clamp(rawRoll - this.calibrationOffset.roll, -180, 180),
      yaw: this.wrap360(rawYaw - this.calibrationOffset.yaw)
    };

    // Low-pass filter: small lerp alpha means the stream lags the raw
    // sensor, which is exactly what we want — tames both gyro jitter and
    // the feeling that the craft "snaps" when the phone is flicked.
    const smooth: Attitude = {
      pitch: this.lerp(this.attitude.pitch, next.pitch, 0.18),
      roll: this.lerp(this.attitude.roll, next.roll, 0.18),
      yaw: this.lerpAngle(this.attitude.yaw, next.yaw, 0.18)
    };
    this.emitAttitude(smooth);

    const now = Date.now();
    if (now - this.lastSendTs >= this.sendIntervalMs) {
      this.lastSendTs = now;
      this.sendAttitude(smooth, now);
    }
  }

  // ---------- websocket lifecycle ----------

  async connect(url?: string): Promise<boolean> {
    if (url && url.length > 0) this.url = url;
    if (this.state === 'connecting' || this.state === 'connected') {
      return this.state === 'connected';
    }
    this.emitState('connecting');
    this.ws = webSocket.createWebSocket();

    this.ws.on('open', (_err: BusinessError, _value: Object) => {
      this.emitState('connected');
    });
    this.ws.on('close', (_err: BusinessError, value: webSocket.CloseResult) => {
      this.emitState('idle', `closed (${value ? value.code : '-'})`);
    });
    this.ws.on('error', (err: BusinessError) => {
      this.emitState('error', err ? err.message : 'unknown error');
    });
    this.ws.on('message', (_err: BusinessError, value: string | ArrayBuffer) => {
      if (typeof value !== 'string') return;
      this.handleIncoming(value);
    });

    try {
      const ok = await this.ws.connect(this.url);
      if (!ok) this.emitState('error', 'connect() returned false');
      return ok;
    } catch (e) {
      const err = e as BusinessError;
      this.emitState('error', err.message || `code ${err.code}`);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.ws) return;
    try {
      await this.ws.close();
    } catch (_e) {
      // ignore
    }
    this.ws = null;
    this.emitState('idle');
  }

  // Force-rebuild the WebSocket from scratch. Use this on resume from
  // background/lock — HarmonyOS silently suspends the socket and the old
  // state can linger as `connected` even though no bytes flow anymore.
  async reconnect(): Promise<boolean> {
    this.log('reconnect requested');
    try {
      if (this.ws) {
        await this.ws.close();
      }
    } catch (_e) {
      // ignore — we're about to throw it away
    }
    this.ws = null;
    this.state = 'idle';
    return await this.connect();
  }

  // Tear down and re-subscribe the orientation sensor. HarmonyOS pauses
  // sensor callbacks while the screen is off; simply checking the local
  // sensorActive flag would be a no-op and we'd never start receiving
  // events again.
  restartSensors(): void {
    this.log('sensor restart requested');
    try {
      sensor.off(sensor.SensorId.ORIENTATION);
    } catch (_e) {
      // ignore
    }
    this.sensorActive = false;
    this.startSensors();
  }

  sendCommand(action: 'take_photo' | 'reflect' | 'status'): void {
    this.sendRaw(`{"type":"command","action":"${action}","ts":${Date.now()}}`);
    this.log(`-> command:${action}`);
  }

  private sendAttitude(a: Attitude, ts: number): void {
    const payload = `{"type":"attitude","pitch":${a.pitch.toFixed(2)},"roll":${a.roll.toFixed(2)},"yaw":${a.yaw.toFixed(2)},"ts":${ts}}`;
    this.sendRaw(payload);
  }

  private sendRaw(payload: string): void {
    if (!this.ws || this.state !== 'connected') return;
    try {
      this.ws.send(payload);
    } catch (_e) {
      // swallow — connection state listener will surface a more useful error.
    }
  }

  // ---------- incoming message handling ----------

  private handleIncoming(raw: string): void {
    try {
      const msg: Record<string, Object> = JSON.parse(raw);
      if (msg['type'] === 'attitude') {
        const incoming: Attitude = {
          pitch: Number(msg['pitch']) || 0,
          roll: Number(msg['roll']) || 0,
          yaw: Number(msg['yaw']) || 0,
        };
        // Update local attitude from the web dashboard so the phone UI
        // mirrors the control-panel state. Suppress the local sensor for
        // 500 ms so the next gyro frame doesn't immediately overwrite.
        this.remoteOverrideUntil = Date.now() + 500;
        this.emitAttitude(incoming);
        this.log(`<- attitude P${incoming.pitch.toFixed(1)} R${incoming.roll.toFixed(1)} Y${incoming.yaw.toFixed(1)}`);
      } else {
        this.log(`<- ${raw}`);
      }
    } catch (_e) {
      this.log(`<- (parse error) ${raw.substring(0, 80)}`);
    }
  }

  // ---------- math helpers ----------

  private clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return this.wrap360(a + diff * t);
  }

  private wrap360(v: number): number {
    let r = v % 360;
    if (r < 0) r += 360;
    return r;
  }
}

export const remoteClient: RemoteClientImpl = new RemoteClientImpl();
