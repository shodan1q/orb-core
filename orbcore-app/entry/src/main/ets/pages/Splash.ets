// Splash
// ----------------------------------------------------------------------------
// Animated splash screen built on ArkGraphics 3D (Component3D + Scene).
//
// The scene loads `rawfile/satellite.glb`, spawns a default camera and
// a directional light (glTF exports from Blender usually don't ship
// either), then drives the root node's rotation via animator.onFrame so
// the satellite slowly yaws on every frame.
//
// A starfield built out of lightweight ArkUI Stack dots sits behind the
// 3D viewport for atmosphere, and the ORB CORE title/subtitle fade in on
// a schedule. After 4.5 s the page replaces itself with the Index page
// so Splash is never reachable via back-swipe.

import router from '@ohos.router';
import animator, { AnimatorOptions, AnimatorResult } from '@ohos.animator';
import {
  Scene,
  Node as SceneNode,
  Camera,
  Light,
  LightType,
  SceneResourceFactory,
  Quaternion,
  Position3,
  Color,
} from '@ohos.graphics.scene';
import { Theme } from '../common/Theme';

interface StarDot {
  x: number;  // percent of parent width (0..100)
  y: number;  // percent of parent height (0..100)
  size: number;
  color: string;
}

@Entry
@Component
struct Splash {
  // Scene is held as a plain private field — @State on a complex native
  // object is unnecessary and tends to confuse the observer machinery. A
  // separate boolean flag drives the conditional render of Component3D.
  private scene: Scene | null = null;
  private rootNode: SceneNode | null = null;
  private frameAnim: AnimatorResult | undefined = undefined;
  private routeTimer: number = -1;
  private titleTimer: number = -1;
  private subTimer: number = -1;

  private starsA: StarDot[] = [];
  private starsB: StarDot[] = [];

  @State sceneReady: boolean = false;
  @State sceneError: string = '';
  @State twinkleA: number = 0.35;
  @State twinkleB: number = 0.95;
  @State titleAlpha: number = 0;
  @State subtitleAlpha: number = 0;

  async aboutToAppear(): Promise<void> {
    // ---- Procedural starfield behind the 3D viewport ----
    this.buildStars();

    // ---- Twinkle animations for the two star layers (counter-phase) ----
    animateTo({
      duration: 2200,
      curve: Curve.EaseInOut,
      iterations: -1,
      playMode: PlayMode.Alternate,
    }, () => { this.twinkleA = 1.0; });
    animateTo({
      duration: 1700,
      curve: Curve.EaseInOut,
      iterations: -1,
      playMode: PlayMode.Alternate,
    }, () => { this.twinkleB = 0.4; });

    // ---- Schedule foreground text fade-in ----
    this.titleTimer = setTimeout(() => {
      animateTo({ duration: 900, curve: Curve.EaseOut }, () => {
        this.titleAlpha = 1;
      });
    }, 900);
    this.subTimer = setTimeout(() => {
      animateTo({ duration: 900, curve: Curve.EaseOut }, () => {
        this.subtitleAlpha = 1;
      });
    }, 1500);

    // ---- Schedule navigation to Index ----
    this.routeTimer = setTimeout(() => {
      try {
        router.replaceUrl({ url: 'pages/Index' });
      } catch (err) {
        console.error(`replaceUrl Index failed: ${(err as Error).message}`);
      }
    }, 4500);

    // ---- Load the 3D scene off the UI setup path ----
    try {
      const scene: Scene = await Scene.load($rawfile('satellite.glb'));
      const factory: SceneResourceFactory = scene.getResourceFactory();

      // The satellite GLB does not ship a camera or light. Create both
      // by hand so Component3D has something to render with.
      const camera: Camera = await factory.createCamera({ name: 'splashCam' });
      camera.position = { x: 0.0, y: 0.3, z: 3.6 } as Position3;
      camera.fov = 45 * Math.PI / 180;
      camera.nearPlane = 0.1;
      camera.farPlane = 100.0;
      camera.enabled = true;

      // Key light — cool cyan, matching the app's primary accent (#22d3ee).
      const keyLight: Light = await factory.createLight(
        { name: 'keyLight' },
        LightType.DIRECTIONAL
      );
      keyLight.position = { x: 2.0, y: 3.0, z: 2.5 } as Position3;
      keyLight.color = { r: 0.13, g: 0.83, b: 0.93, a: 1.0 } as Color;
      keyLight.intensity = 5.0;
      keyLight.enabled = true;

      // Rim light — violet accent (#a78bfa) for depth and contrast.
      const rimLight: Light = await factory.createLight(
        { name: 'rimLight' },
        LightType.DIRECTIONAL
      );
      rimLight.position = { x: -2.0, y: -1.0, z: -1.5 } as Position3;
      rimLight.color = { r: 0.65, g: 0.55, b: 0.98, a: 1.0 } as Color;
      rimLight.intensity = 3.0;
      rimLight.enabled = true;

      // Fill light — dim cyan glow from below to soften shadow side.
      const fillLight: Light = await factory.createLight(
        { name: 'fillLight' },
        LightType.DIRECTIONAL
      );
      fillLight.position = { x: 0.0, y: -2.0, z: 1.0 } as Position3;
      fillLight.color = { r: 0.04, g: 0.57, b: 0.70, a: 1.0 } as Color;
      fillLight.intensity = 1.8;
      fillLight.enabled = true;

      this.scene = scene;
      this.rootNode = scene.root;
      this.sceneReady = true;

      this.startRotationLoop();
    } catch (err) {
      const msg = (err as Error).message;
      console.error(`Scene.load satellite.glb failed: ${msg}`);
      this.sceneError = msg;
    }
  }

  aboutToDisappear(): void {
    if (this.frameAnim !== undefined) {
      try { this.frameAnim.finish(); } catch (e) {}
      this.frameAnim = undefined;
    }
    if (this.scene !== null) {
      try { this.scene.destroy(); } catch (e) {}
      this.scene = null;
    }
    if (this.routeTimer !== -1) clearTimeout(this.routeTimer);
    if (this.titleTimer !== -1) clearTimeout(this.titleTimer);
    if (this.subTimer !== -1) clearTimeout(this.subTimer);
  }

  // -------------------------------------------------------------------------
  //  Starfield — cheap component-based twinkle backdrop.
  // -------------------------------------------------------------------------

  private buildStars(): void {
    // Star palette biased toward the cyan / violet theme.
    const palette: string[] = [
      '#a5f3fc', // cyan bright
      '#67e8f9', // cyan
      '#22d3ee', // cyan mid (border accent)
      '#c4b5fd', // violet
      '#a78bfa', // violet bright
      '#e0e7ff', // cool white
    ];
    const perLayer = 60;
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < perLayer; i++) {
        const color = palette[Math.floor(Math.random() * palette.length)];
        const dot: StarDot = {
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: 1.0 + Math.random() * 2.0,
          color,
        };
        if (layer === 0) this.starsA.push(dot);
        else this.starsB.push(dot);
      }
    }
  }

  // -------------------------------------------------------------------------
  //  Per-frame rotation driver.
  // -------------------------------------------------------------------------

  private startRotationLoop(): void {
    if (this.frameAnim !== undefined) return;
    const opts: AnimatorOptions = {
      duration: 600000,
      easing: 'linear',
      delay: 0,
      fill: 'forwards',
      direction: 'normal',
      iterations: 1,
      begin: 0,
      end: 600000,
    };
    try {
      this.frameAnim = animator.create(opts);
      this.frameAnim.onFrame = (value: number) => {
        const node = this.rootNode;
        const scene = this.scene;
        if (node === null || scene === null) return;

        // Yaw around Y at ~30 deg/sec, with a cinematic 18° X tilt baked in.
        const tMs = value;
        const yaw = (tMs * 0.001) * (30 * Math.PI / 180);
        const tilt = 18 * Math.PI / 180;

        const qTilt: Quaternion = {
          x: Math.sin(tilt / 2),
          y: 0,
          z: 0,
          w: Math.cos(tilt / 2),
        };
        const qYaw: Quaternion = {
          x: 0,
          y: Math.sin(yaw / 2),
          z: 0,
          w: Math.cos(yaw / 2),
        };
        // Compose qYaw * qTilt — tilt first, then spin around world Y.
        const rx = qYaw.w * qTilt.x + qYaw.x * qTilt.w + qYaw.y * qTilt.z - qYaw.z * qTilt.y;
        const ry = qYaw.w * qTilt.y - qYaw.x * qTilt.z + qYaw.y * qTilt.w + qYaw.z * qTilt.x;
        const rz = qYaw.w * qTilt.z + qYaw.x * qTilt.y - qYaw.y * qTilt.x + qYaw.z * qTilt.w;
        const rw = qYaw.w * qTilt.w - qYaw.x * qTilt.x - qYaw.y * qTilt.y - qYaw.z * qTilt.z;
        node.rotation = { x: rx, y: ry, z: rz, w: rw } as Quaternion;

        try {
          scene.renderFrame({ alwaysRender: true });
        } catch (e) {
          // renderFrame may fail during teardown; ignore.
        }
      };
      this.frameAnim.play();
    } catch (err) {
      console.error(`animator.create failed: ${(err as Error).message}`);
    }
  }

  // -------------------------------------------------------------------------
  //  Builders
  // -------------------------------------------------------------------------

  @Builder
  StarLayer(dots: StarDot[], alpha: number) {
    Stack() {
      ForEach(dots, (s: StarDot, idx: number) => {
        Stack()
          .width(s.size)
          .height(s.size)
          .borderRadius(s.size)
          .backgroundColor(s.color)
          .position({ x: `${s.x}%`, y: `${s.y}%` })
      }, (s: StarDot, idx: number) => `${idx}-${s.x}-${s.y}`)
    }
    .width('100%')
    .height('100%')
    .opacity(alpha)
  }

  build() {
    Stack() {
      // ---- Deep-space gradient backdrop — matches Theme.BG_GRAD_* ----
      Column()
        .width('100%')
        .height('100%')
        .linearGradient({
          angle: 180,
          colors: [[0x020617, 0.0], [0x000005, 1.0]],
        })

      // ---- Twinkling starfield (pure ArkUI) ----
      this.StarLayer(this.starsA, this.twinkleA)
      this.StarLayer(this.starsB, this.twinkleB)

      // ---- 3D viewport — rotating satellite model ----
      if (this.sceneReady && this.scene !== null) {
        Column() {
          Component3D({ scene: this.scene })
            .width('100%')
            .height('100%')
            .renderWidth('100%')
            .renderHeight('100%')
        }
        .width('90%')
        .height('55%')
        .border({ width: 1, color: Theme.BORDER_DIM })
        .backgroundColor(Theme.PANEL_BG)
      }

      // ---- Foreground text — HUD style ----
      Column() {
        // Top: title block
        Column() {
          Text('ORB CORE')
            .fontSize(28)
            .fontWeight(FontWeight.Bold)
            .fontColor(Theme.CYAN_BRIGHT)
            .letterSpacing(6)
          Text('PRIVATE SATELLITE SYSTEM')
            .fontSize(9)
            .fontColor(Theme.CYAN_DIM)
            .letterSpacing(3)
            .margin({ top: 8 })
        }
        .alignItems(HorizontalAlign.Center)
        .opacity(this.titleAlpha)
        .margin({ top: 52 })

        Blank()

        // Bottom: status + error
        Column() {
          if (this.sceneError.length > 0) {
            Text(`3D INIT FAULT: ${this.sceneError}`)
              .fontSize(9)
              .fontColor(Theme.DANGER)
              .letterSpacing(1)
              .margin({ bottom: 8 })
              .padding({ left: 20, right: 20 })
              .textAlign(TextAlign.Center)
          }
          Text('◇   INITIALIZING GROUND LINK   ◇')
            .fontSize(9)
            .fontColor(Theme.TEXT_MUTED)
            .letterSpacing(2)
            .opacity(this.subtitleAlpha)
        }
        .alignItems(HorizontalAlign.Center)
        .margin({ bottom: 48 })
      }
      .width('100%')
      .height('100%')
      .alignItems(HorizontalAlign.Center)
    }
    .width('100%')
    .height('100%')
    .alignContent(Alignment.Center)
    .backgroundColor('#000005')
  }
}
