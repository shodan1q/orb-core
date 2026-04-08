// AttitudeGauge
// ----------------------------------------------------------------------------
// Aviation-style artificial horizon combined with a compass ring, echoing the
// orb-core dashboard StatusPanel. Pitch slides the horizon up/down, roll tips
// the whole disc, yaw rotates the compass bezel.

import { Theme } from '../common/Theme';

@Component
export struct AttitudeGauge {
  @Prop @Watch('onAttitude') pitch: number = 0;
  @Prop @Watch('onAttitude') roll: number = 0;
  @Prop @Watch('onAttitude') yaw: number = 0;

  private settings: RenderingContextSettings = new RenderingContextSettings(true);
  private ctx: CanvasRenderingContext2D = new CanvasRenderingContext2D(this.settings);
  private canvasW: number = 0;
  private canvasH: number = 0;

  onAttitude(): void {
    this.redraw();
  }

  private redraw(): void {
    const w = this.canvasW;
    const h = this.canvasH;
    if (w <= 0 || h <= 0) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.42;

    // Outer bezel.
    ctx.strokeStyle = Theme.BORDER_DIM;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
    ctx.stroke();

    // Clip horizon disc.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Rotate around center by roll.
    ctx.translate(cx, cy);
    ctx.rotate((-this.roll * Math.PI) / 180);

    // Pitch shift: one degree ~= radius/45 pixels.
    const pitchPx = (this.pitch / 45) * radius;

    // Sky.
    ctx.fillStyle = Theme.HORIZON_SKY;
    ctx.fillRect(-radius * 2, -radius * 2, radius * 4, radius * 2 + pitchPx);
    // Ground.
    ctx.fillStyle = Theme.HORIZON_GROUND;
    ctx.fillRect(-radius * 2, pitchPx, radius * 4, radius * 2);

    // Horizon line.
    ctx.strokeStyle = Theme.CYAN_BRIGHT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-radius * 2, pitchPx);
    ctx.lineTo(radius * 2, pitchPx);
    ctx.stroke();

    // Pitch ladder.
    ctx.strokeStyle = Theme.CYAN;
    ctx.fillStyle = Theme.CYAN;
    ctx.lineWidth = 1;
    ctx.font = `10px ${Theme.FONT_MONO}`;
    ctx.textAlign = 'center';
    for (let deg = -60; deg <= 60; deg += 10) {
      if (deg === 0) continue;
      const y = pitchPx - (deg / 45) * radius;
      const len = (deg % 20 === 0) ? radius * 0.28 : radius * 0.14;
      ctx.beginPath();
      ctx.moveTo(-len, y);
      ctx.lineTo(len, y);
      ctx.stroke();
      if (deg % 20 === 0) {
        ctx.fillText(`${deg}`, -len - 10, y + 3);
        ctx.fillText(`${deg}`, len + 10, y + 3);
      }
    }

    ctx.restore();

    // Center crosshair — fixed airplane marker.
    ctx.strokeStyle = Theme.VIOLET;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.38, cy);
    ctx.lineTo(cx - radius * 0.1, cy);
    ctx.moveTo(cx + radius * 0.1, cy);
    ctx.lineTo(cx + radius * 0.38, cy);
    ctx.moveTo(cx, cy - radius * 0.08);
    ctx.lineTo(cx, cy + radius * 0.08);
    ctx.stroke();
    ctx.fillStyle = Theme.VIOLET;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Roll indicator arc at top.
    ctx.strokeStyle = Theme.BORDER_DIM;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, Math.PI + Math.PI / 6, 2 * Math.PI - Math.PI / 6);
    ctx.stroke();

    const rollRad = (-this.roll * Math.PI) / 180;
    const rollMarkerX = cx + Math.sin(rollRad) * (radius + 4);
    const rollMarkerY = cy - Math.cos(rollRad) * (radius + 4);
    ctx.fillStyle = Theme.CYAN_BRIGHT;
    ctx.beginPath();
    ctx.arc(rollMarkerX, rollMarkerY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Compass ring — yaw tick marks around perimeter.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-this.yaw * Math.PI) / 180);
    ctx.strokeStyle = Theme.CYAN_DIM;
    ctx.lineWidth = 1;
    ctx.fillStyle = Theme.CYAN;
    ctx.font = `9px ${Theme.FONT_MONO}`;
    ctx.textAlign = 'center';
    const outer = radius + 18;
    for (let deg = 0; deg < 360; deg += 15) {
      const r = (deg * Math.PI) / 180;
      const isMajor = (deg % 45) === 0;
      const inner = outer - (isMajor ? 8 : 4);
      const x1 = Math.sin(r) * outer;
      const y1 = -Math.cos(r) * outer;
      const x2 = Math.sin(r) * inner;
      const y2 = -Math.cos(r) * inner;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (isMajor) {
        const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : `${deg}`;
        ctx.fillText(label, Math.sin(r) * (inner - 8), -Math.cos(r) * (inner - 8) + 3);
      }
    }
    ctx.restore();
  }

  build() {
    Canvas(this.ctx)
      .width('100%')
      .height('100%')
      .onReady(() => {
        this.canvasW = this.ctx.width;
        this.canvasH = this.ctx.height;
        this.redraw();
      })
  }
}
