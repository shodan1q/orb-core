// Index
// ----------------------------------------------------------------------------
// Landing screen for the orbcore-app ground station. Lets the operator enter
// the web dashboard's WebSocket URL, test the connection, then step into the
// full remote control page.

import router from '@ohos.router';
import { Theme } from '../common/Theme';
import { remoteClient, ConnectionState } from '../common/RemoteClient';

@Entry
@Component
struct Index {
  @State url: string = 'ws://172.20.10.3:8882';
  @State connState: ConnectionState = 'idle';
  @State statusDetail: string = 'standby';
  @State tickerPhase: number = 0;

  aboutToAppear(): void {
    this.url = remoteClient.getUrl();
    this.connState = remoteClient.getState();
    remoteClient.onState((s: ConnectionState, detail?: string) => {
      this.connState = s;
      if (detail !== undefined) this.statusDetail = detail;
      else if (s === 'connected') this.statusDetail = 'link established';
      else if (s === 'connecting') this.statusDetail = 'negotiating handshake';
      else if (s === 'idle') this.statusDetail = 'standby';
    });
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

  private async handleConnect(): Promise<void> {
    remoteClient.setUrl(this.url);
    await remoteClient.connect(this.url);
  }

  private handleEnterRemote(): void {
    try {
      router.pushUrl({ url: 'pages/RemoteControl' });
    } catch (err) {
      console.error(`pushUrl failed: ${(err as Error).message}`);
    }
  }

  @Builder
  CornerBracket(horizontal: 'left' | 'right', vertical: 'top' | 'bottom') {
    Stack() {}
    .width(14)
    .height(14)
    .border({
      width: {
        top: vertical === 'top' ? 1.4 : 0,
        bottom: vertical === 'bottom' ? 1.4 : 0,
        left: horizontal === 'left' ? 1.4 : 0,
        right: horizontal === 'right' ? 1.4 : 0
      },
      color: Theme.BORDER
    })
  }

  build() {
    Stack() {
      // Ambient background gradient — expands into status bar and
      // home-indicator safe areas so the dark theme reaches the screen
      // edges instead of leaving bright system chrome bands.
      Column()
        .width('100%')
        .height('100%')
        .linearGradient({
          angle: 180,
          colors: [[Theme.BG_GRAD_TOP, 0.0], [Theme.BG_GRAD_BOTTOM, 1.0]]
        })
        .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM])

      // Main panel.
      Column() {
        // Header line.
        Row() {
          Text('ORB CORE')
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .fontColor(Theme.CYAN_BRIGHT)
            .letterSpacing(4)
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

        Text('GROUND STATION · REMOTE LINK')
          .fontSize(10)
          .fontColor(Theme.TEXT_MUTED)
          .letterSpacing(2)
          .margin({ top: 2 })

        Divider()
          .color(Theme.BORDER_HAIR)
          .margin({ top: 14, bottom: 14 })

        // Mission briefing block.
        Column() {
          Text('MISSION BRIEFING')
            .fontSize(9)
            .fontColor(Theme.CYAN_DIM)
            .letterSpacing(2)
          Text('Connect this handset to the orb-core dashboard over a shared LAN. Your gyroscope stream will drive the satellite attitude on the big screen; the on-device gauges mirror what the relay sees in real time.')
            .fontSize(12)
            .fontColor(Theme.TEXT_DIM)
            .margin({ top: 6 })
            .lineHeight(18)
        }
        .alignItems(HorizontalAlign.Start)
        .width('100%')
        .padding(12)
        .backgroundColor(Theme.PANEL_BG_SOFT)
        .border({ width: 1, color: Theme.BORDER_HAIR })

        // URL input.
        Column() {
          Text('RELAY WS ENDPOINT')
            .fontSize(9)
            .fontColor(Theme.CYAN_DIM)
            .letterSpacing(2)
            .margin({ bottom: 6 })
          TextInput({ text: this.url, placeholder: 'ws://host:3001' })
            .placeholderColor(Theme.TEXT_MUTED)
            .fontColor(Theme.CYAN_BRIGHT)
            .fontSize(13)
            .backgroundColor('rgba(0,0,0,0.5)')
            .caretColor(Theme.CYAN)
            .border({ width: 1, color: Theme.BORDER_DIM })
            .borderRadius(0)
            .padding({ left: 10, right: 10, top: 8, bottom: 8 })
            .onChange((value: string) => { this.url = value; })
        }
        .alignItems(HorizontalAlign.Start)
        .width('100%')
        .margin({ top: 16 })

        // Status detail line.
        Row() {
          Text('STATUS')
            .fontSize(9)
            .fontColor(Theme.CYAN_DIM)
            .letterSpacing(2)
          Text(this.statusDetail)
            .fontSize(11)
            .fontColor(this.statusColor())
            .margin({ left: 10 })
        }
        .width('100%')
        .margin({ top: 12 })

        // Action buttons.
        Row() {
          Button() {
            Text(this.connState === 'connected' ? 'RECONNECT' : 'CONNECT')
              .fontSize(12)
              .fontColor(Theme.CYAN_BRIGHT)
              .letterSpacing(2)
          }
          .type(ButtonType.Normal)
          .backgroundColor('rgba(34,211,238,0.08)')
          .border({ width: 1, color: Theme.BORDER })
          .borderRadius(0)
          .height(44)
          .layoutWeight(1)
          .onClick(() => this.handleConnect())

          Stack().width(10)

          Button() {
            Text('ENTER REMOTE')
              .fontSize(12)
              .fontColor(this.connState === 'connected' ? Theme.BG : Theme.TEXT_MUTED)
              .letterSpacing(2)
          }
          .type(ButtonType.Normal)
          .backgroundColor(this.connState === 'connected' ? Theme.CYAN : 'rgba(148,163,184,0.08)')
          .border({ width: 1, color: this.connState === 'connected' ? Theme.CYAN : Theme.BORDER_HAIR })
          .borderRadius(0)
          .enabled(this.connState === 'connected')
          .height(44)
          .layoutWeight(1)
          .onClick(() => this.handleEnterRemote())
        }
        .width('100%')
        .margin({ top: 18 })

        Blank()

        // Footer signature.
        Row() {
          Text('◇ DISTRIBUTED SUPER DEVICE')
            .fontSize(9)
            .fontColor(Theme.TEXT_MUTED)
            .letterSpacing(2)
          Blank()
          Text('ORB-CORE/HM v1')
            .fontSize(9)
            .fontColor(Theme.TEXT_MUTED)
            .letterSpacing(2)
        }
        .width('100%')
      }
      .alignItems(HorizontalAlign.Start)
      .width('88%')
      .padding(22)
      .backgroundColor(Theme.PANEL_BG)
      .border({ width: 1, color: Theme.BORDER_DIM })

    }
    .width('100%')
    .height('100%')
    .backgroundColor(Theme.BG)
    .alignContent(Alignment.Center)
  }
}
