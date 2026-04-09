// RemoteControl
// ----------------------------------------------------------------------------
// The main ground-station cockpit. Samples the phone orientation sensor,
// streams it to the web dashboard, renders a wireframe satellite + artificial
// horizon that mirror the satellite's live attitude, and exposes quick-action
// command buttons (capture / reflect / status).

import router from '@ohos.router';
import { Theme } from '../common/Theme';
import { remoteClient, Attitude, ConnectionState } from '../common/RemoteClient';
import { Satellite3D } from '../components/Satellite3D';
import { AttitudeGauge } from '../components/AttitudeGauge';

interface LogLine {
  id: number;
  text: string;
}

@Entry
@Component
struct RemoteControl {
  @State pitch: number = 0;
  @State roll: number = 0;
  @State yaw: number = 0;
  @State connState: ConnectionState = 'idle';
  @State statusDetail: string = 'standby';
  @State energy: number = 850;
  @State maxEnergy: number = 1000;
  @State altitudeKm: number = 408.2;
  @State velocityKmS: number = 7.66;
  @State logs: LogLine[] = [];
  @State lastCommand: string = '—';
  // Simulated orbital attitude — slowly drifts so the display always
  // shows "alive" numbers even when the phone is lying flat.
  @State simPitch: number = -12.4;
  @State simRoll: number = 3.7;
  @State simYaw: number = 247.1;
  private simTimer: number = -1;
  private logCounter: number = 0;
  private lastAttitudeUiTs: number = 0;
  private lastLogUiTs: number = 0;

  aboutToAppear(): void {
    this.connState = remoteClient.getState();
    const initial: Attitude = remoteClient.getAttitude();
    this.pitch = initial.pitch;
    this.roll = initial.roll;
    this.yaw = initial.yaw;

    remoteClient.onState((s: ConnectionState, detail?: string) => {
      this.connState = s;
      if (detail !== undefined) this.statusDetail = detail;
      else if (s === 'connected') this.statusDetail = 'link established';
      else if (s === 'idle') this.statusDetail = 'standby';
    });

    // Throttle @State attitude updates to ~8 Hz. The sensor fires at
    // 30 Hz but re-rendering the full page (including the WebView 3D
    // model) 30 times per second is too expensive.
    remoteClient.onAttitude((a: Attitude) => {
      const now = Date.now();
      if (now - this.lastAttitudeUiTs < 120) return;
      this.lastAttitudeUiTs = now;
      this.pitch = a.pitch;
      this.roll = a.roll;
      this.yaw = a.yaw;
    });

    // Throttle log updates to max once per second.
    remoteClient.onLog((line: string) => {
      const now = Date.now();
      if (now - this.lastLogUiTs < 1000) return;
      this.lastLogUiTs = now;
      this.logCounter += 1;
      const next: LogLine[] = this.logs.slice(-4);
      next.push({ id: this.logCounter, text: line });
      this.logs = next;
    });

    remoteClient.startSensors();

    // Simulate slow orbital attitude drift for the telemetry strip.
    this.simTimer = setInterval(() => {
      const t = Date.now() * 0.001;
      this.simPitch = -12.4 + Math.sin(t * 0.13) * 8.5 + Math.sin(t * 0.37) * 2.1;
      this.simRoll = 3.7 + Math.sin(t * 0.09 + 1.0) * 5.2 + Math.cos(t * 0.29) * 1.8;
      this.simYaw = (247.1 + t * 2.3 + Math.sin(t * 0.17) * 6.0) % 360;
    }, 500);
  }

  aboutToDisappear(): void {
    remoteClient.stopSensors();
    if (this.simTimer !== -1) {
      clearInterval(this.simTimer);
      this.simTimer = -1;
    }
  }

  // Page becomes visible again — e.g. after the phone was locked and
  // unlocked, or the user switched back from another app. HarmonyOS pauses
  // sensor callbacks and may silently drop the WebSocket during suspend,
  // so force a rebuild of both here. Idempotent: re-running on an already
  // healthy link is cheap.
  onPageShow(): void {
    remoteClient.restartSensors();
    // Even if the local state still reads as "connected", the underlying
    // socket may already be dead (no close event delivered during sleep).
    // Rebuilding unconditionally guarantees a live pipe.
    remoteClient.reconnect();
  }

  onPageHide(): void {
    // Leave the sensor subscription in place so a quick screen-off / on
    // doesn't miss events — HarmonyOS will pause delivery while suspended
    // and we'll refresh everything via onPageShow on resume.
  }

  private statusLabel(): string {
    if (this.connState === 'connected') return 'ONLINE';
    if (this.connState === 'connecting') return 'LINKING';
    if (this.connState === 'error') return 'FAULT';
    return 'STANDBY';
  }

  private statusColor(): string {
    if (this.connState === 'connected') return Theme.SUCCESS;
    if (this.connState === 'connecting') return Theme.AMBER;
    if (this.connState === 'error') return Theme.DANGER;
    return Theme.TEXT_DIM;
  }

  private formatDeg(v: number): string {
    const sign = v >= 0 ? '+' : '-';
    return sign + Math.abs(v).toFixed(1).padStart(5, '0') + '°';
  }

  private sendCmd(action: 'take_photo' | 'reflect' | 'status', label: string): void {
    remoteClient.sendCommand(action);
    this.lastCommand = label;
  }

  @Builder
  LabelValue(label: string, value: string, color: string) {
    Column() {
      Text(label)
        .fontSize(8)
        .fontColor(Theme.CYAN_DIM)
        .letterSpacing(2)
      Text(value)
        .fontSize(14)
        .fontColor(color)
        .fontWeight(FontWeight.Medium)
        .margin({ top: 2 })
    }
    .alignItems(HorizontalAlign.Start)
  }

  @Builder
  CommandButton(label: string, subLabel: string, accent: string, onTap: () => void) {
    Button() {
      Column() {
        Text(label)
          .fontSize(11)
          .fontColor(accent)
          .letterSpacing(2)
        Text(subLabel)
          .fontSize(8)
          .fontColor(Theme.TEXT_MUTED)
          .letterSpacing(1)
          .margin({ top: 3 })
      }
    }
    .type(ButtonType.Normal)
    .backgroundColor('rgba(3,7,18,0.7)')
    .border({ width: 1, color: accent + '55' })
    .borderRadius(0)
    .height(58)
    .layoutWeight(1)
    .onClick(() => onTap())
  }

  build() {
    Stack() {
      // Background gradient — explicitly expands into the system status bar
      // and home-indicator areas so those safe zones pick up our dark theme
      // instead of the default bright system chrome.
      Column()
        .width('100%')
        .height('100%')
        .linearGradient({
          angle: 180,
          colors: [[Theme.BG_GRAD_TOP, 0.0], [Theme.BG_GRAD_BOTTOM, 1.0]]
        })
        .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM])

      Column() {
        // ---------- Top status bar ----------
        Row() {
          Column() {
            Text('ORB CORE · REMOTE')
              .fontSize(13)
              .fontColor(Theme.CYAN_BRIGHT)
              .letterSpacing(3)
              .fontWeight(FontWeight.Bold)
            Text(remoteClient.getUrl())
              .fontSize(9)
              .fontColor(Theme.TEXT_MUTED)
              .letterSpacing(1)
              .margin({ top: 2 })
          }
          .alignItems(HorizontalAlign.Start)
          Blank()
          Row() {
            Stack()
              .width(6)
              .height(6)
              .backgroundColor(this.statusColor())
              .borderRadius(3)
            Text(this.statusLabel())
              .fontSize(10)
              .fontColor(this.statusColor())
              .letterSpacing(2)
              .margin({ left: 6 })
          }
        }
        .width('100%')
        .padding({ top: 14, bottom: 10, left: 16, right: 16 })
        .border({ width: { bottom: 1 }, color: Theme.BORDER_HAIR })

        // ---------- AR MODE entry (simple tappable row) ----------
        // Using a plain Row instead of Button to eliminate any chance of
        // layout-engine weirdness inside a Button's custom-content slot.
        Row() {
          Text('◇   AR MODE   >')
            .fontSize(12)
            .fontColor(Theme.VIOLET)
            .letterSpacing(2)
            .fontWeight(FontWeight.Medium)
        }
        .width('92%')
        .height(52)
        .justifyContent(FlexAlign.Center)
        .backgroundColor('rgba(109,40,217,0.18)')
        .border({ width: 1, color: 'rgba(167,139,250,0.7)' })
        .margin({ top: 10 })
        .onClick(() => {
          try {
            router.pushUrl({ url: 'pages/ARView' });
          } catch (err) {
            console.error(`pushUrl ARView failed: ${(err as Error).message}`);
          }
        })

        // ---------- Console log (below AR MODE) ----------
        Column() {
          Text('LINK CONSOLE')
            .fontSize(9)
            .fontColor(Theme.CYAN_DIM)
            .letterSpacing(2)
          Scroll() {
            Column() {
              ForEach(this.logs, (item: LogLine) => {
                Text(item.text)
                  .fontSize(10)
                  .fontColor(Theme.TEXT_DIM)
                  .margin({ top: 2 })
              }, (item: LogLine) => item.id.toString())
            }
            .alignItems(HorizontalAlign.Start)
            .width('100%')
          }
          .layoutWeight(1)
          .scrollBar(BarState.Off)
        }
        .alignItems(HorizontalAlign.Start)
        .width('92%')
        .height(64)
        .margin({ top: 10 })
        .padding(10)
        .clip(true)
        .backgroundColor('rgba(3,7,18,0.7)')
        .border({ width: 1, color: Theme.BORDER_HAIR })

        // ---------- Attitude telemetry strip ----------
        // Shows simulated orbital attitude (slowly drifting) so the
        // display always looks alive. The real sensor values drive the
        // 3D model and WS stream separately.
        Row() {
          this.LabelValue('PITCH', this.formatDeg(this.simPitch), Theme.CYAN_BRIGHT)
          Blank().layoutWeight(1)
          this.LabelValue('ROLL', this.formatDeg(this.simRoll), Theme.CYAN_BRIGHT)
          Blank().layoutWeight(1)
          this.LabelValue('YAW', this.formatDeg(this.simYaw), Theme.CYAN_BRIGHT)
          Blank().layoutWeight(1)
          this.LabelValue('ALT', `${this.altitudeKm.toFixed(1)} KM`, Theme.VIOLET)
          Blank().layoutWeight(1)
          this.LabelValue('VEL', `${this.velocityKmS.toFixed(2)} KM/S`, Theme.VIOLET)
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 12, bottom: 12 })
        .backgroundColor(Theme.PANEL_BG_SOFT)
        .border({ width: { bottom: 1 }, color: Theme.BORDER_HAIR })

        // ---------- 3D viewport ----------
        // Only the Three.js Web component — its own HTML HUD already draws
        // the "3D · GLTF / ATTITUDE LIVE / BUS: ORB-01 / FPS" labels, so we
        // intentionally don't stack an ArkUI Column on top (that caused the
        // doubled-text overlap bug).
        Stack() {
          Satellite3D({ pitch: this.pitch, roll: this.roll, yaw: this.yaw })
        }
        .width('92%')
        .height(180)
        .margin({ top: 10 })
        .backgroundColor('rgba(3,7,18,0.55)')
        .border({ width: 1, color: Theme.BORDER_DIM })

        // ---------- Gauges + energy column ----------
        Row() {
          // Artificial horizon.
          Stack() {
            AttitudeGauge({ pitch: this.pitch, roll: this.roll, yaw: this.yaw })
          }
          .width(150)
          .height(150)
          .border({ width: 1, color: Theme.BORDER_DIM })
          .backgroundColor('rgba(3,7,18,0.55)')

          Blank().width(12)

          // Energy + command readouts.
          Column() {
            Text('ENERGY RESERVE')
              .fontSize(9)
              .fontColor(Theme.CYAN_DIM)
              .letterSpacing(2)
            Row() {
              Text(`${this.energy}`)
                .fontSize(26)
                .fontColor(Theme.AMBER)
                .fontWeight(FontWeight.Bold)
              Text(` / ${this.maxEnergy}`)
                .fontSize(12)
                .fontColor(Theme.TEXT_MUTED)
                .margin({ left: 4, bottom: 4 })
            }
            .alignItems(VerticalAlign.Bottom)
            .margin({ top: 2 })

            // Energy bar.
            Stack({ alignContent: Alignment.Start }) {
              Stack()
                .width('100%')
                .height(6)
                .backgroundColor('rgba(34,211,238,0.08)')
              Stack()
                .width(`${(this.energy / this.maxEnergy) * 100}%`)
                .height(6)
                .linearGradient({
                  angle: 90,
                  colors: [[Theme.AMBER, 0.0], [Theme.CYAN, 1.0]]
                })
            }
            .width('100%')
            .margin({ top: 8 })

            Divider().color(Theme.BORDER_HAIR).margin({ top: 12, bottom: 10 })

            Text('LAST COMMAND')
              .fontSize(9)
              .fontColor(Theme.CYAN_DIM)
              .letterSpacing(2)
            Text(this.lastCommand)
              .fontSize(13)
              .fontColor(Theme.VIOLET)
              .margin({ top: 2 })

            Blank()

            Text('◇ TILT HANDSET TO STEER SATELLITE')
              .fontSize(8)
              .fontColor(Theme.TEXT_MUTED)
              .letterSpacing(2)
          }
          .alignItems(HorizontalAlign.Start)
          .layoutWeight(1)
          .height(150)
          .padding({ left: 14, right: 14, top: 10, bottom: 10 })
          .backgroundColor('rgba(3,7,18,0.55)')
          .border({ width: 1, color: Theme.BORDER_DIM })
        }
        .width('92%')
        .margin({ top: 10 })

        // ---------- Command buttons ----------
        Row() {
          this.CommandButton('CAPTURE', 'photo · 50 cr', Theme.CYAN_BRIGHT, () => {
            this.sendCmd('take_photo', 'CAPTURE');
          })
          Blank().width(10)
          this.CommandButton('REFLECT', 'sunbeam · 100 cr', Theme.AMBER, () => {
            this.sendCmd('reflect', 'REFLECT');
          })
          Blank().width(10)
          this.CommandButton('STATUS', 'telemetry ping', Theme.VIOLET, () => {
            this.sendCmd('status', 'STATUS');
          })
        }
        .width('92%')
        .margin({ top: 14 })

        // ---------- Secondary controls ----------
        Row() {
          Button() {
            Text('CALIBRATE ZERO')
              .fontSize(10)
              .fontColor(Theme.CYAN)
              .letterSpacing(2)
          }
          .type(ButtonType.Normal)
          .backgroundColor('rgba(3,7,18,0.7)')
          .border({ width: 1, color: Theme.BORDER_HAIR })
          .borderRadius(0)
          .height(34)
          .layoutWeight(1)
          .onClick(() => remoteClient.calibrate())

          Blank().width(10)

          Button() {
            Text('DISCONNECT')
              .fontSize(10)
              .fontColor(Theme.DANGER)
              .letterSpacing(2)
          }
          .type(ButtonType.Normal)
          .backgroundColor('rgba(3,7,18,0.7)')
          .border({ width: 1, color: 'rgba(248,113,113,0.3)' })
          .borderRadius(0)
          .height(34)
          .layoutWeight(1)
          .onClick(async () => {
            await remoteClient.disconnect();
            try {
              router.back();
            } catch (err) {
              console.error(`router.back failed: ${(err as Error).message}`);
            }
          })
        }
        .width('92%')
        .margin({ top: 12 })

        // (Console log moved above, under AR MODE)
      }
      .width('100%')
      .height('100%')
      // Keep interactive content inside the system safe area so the top
      // status bar and bottom home-indicator don't overlap it.
      .padding({ top: 40, bottom: 28 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Theme.BG)
  }
}
