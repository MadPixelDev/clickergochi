import { Container, Graphics } from 'pixi.js';
import type { Rig } from '../../content/pets/rigSchema';
import { nurseryLayout } from '../../content/scene';

const P = nurseryLayout.palette;

export type EyeState = 'open' | 'closed' | 'happy';
export type MouthState = 'closed' | 'smile' | 'open';

class Eye {
  readonly root = new Container();
  private readonly open = new Container();
  private readonly highlights = new Graphics();
  private readonly closed: Graphics;
  private readonly happy: Graphics;

  constructor(rx: number, ry: number) {
    const ball = new Graphics().ellipse(0, 0, rx, ry).fill(P.eye);
    this.highlights
      .circle(-rx * 0.32, -ry * 0.36, rx * 0.4)
      .fill(P.eyeHighlight)
      .circle(rx * 0.34, ry * 0.32, rx * 0.17)
      .fill(P.eyeHighlight);
    this.open.addChild(ball, this.highlights);
    this.closed = new Graphics()
      .moveTo(-rx, 0)
      .quadraticCurveTo(0, ry * 0.55, rx, 0)
      .stroke({ width: 6, color: P.eye, cap: 'round' });
    this.happy = new Graphics()
      .moveTo(-rx, ry * 0.25)
      .quadraticCurveTo(0, -ry * 0.75, rx, ry * 0.25)
      .stroke({ width: 7, color: P.eye, cap: 'round' });
    this.root.addChild(this.open, this.closed, this.happy);
  }

  /** openness 0..1 — моргание; gaze — смещение глаза; scale — удивление. */
  apply(state: EyeState, openness: number, gx: number, gy: number, scale: number): void {
    const showOpen = state === 'open' && openness > 0.15;
    this.open.visible = showOpen;
    this.closed.visible = state === 'closed' || (state === 'open' && !showOpen);
    this.happy.visible = state === 'happy';
    this.open.scale.set(scale, scale * Math.max(0.15, openness));
    this.open.position.set(gx, gy);
    // Блики сдвигаются меньше глаза — лёгкий параллакс «мокрого» глаза.
    this.highlights.position.set(-gx * 0.5, -gy * 0.5);
  }
}

/** Лицо: глаза, нос, рот, румянец. Expression layer (SPEC §8.1). */
export class Face {
  readonly root = new Container();
  private readonly eyes: [Eye, Eye];
  private readonly mouths: Record<MouthState, Container>;
  private readonly blush: Graphics[];
  readonly eyeDiameter: number;

  constructor(rig: Rig) {
    const f = rig.face;
    this.eyeDiameter = f.eyeRy * 2;
    const left = new Eye(f.eyeRx, f.eyeRy);
    const right = new Eye(f.eyeRx, f.eyeRy);
    left.root.position.set(-f.eyeOffsetX, f.eyeY);
    right.root.position.set(f.eyeOffsetX, f.eyeY);
    this.eyes = [left, right];

    this.blush = [-1, 1].map((side) => {
      const g = new Graphics().ellipse(0, 0, f.blushRx, f.blushRy).fill(P.blush);
      g.position.set(side * f.blushOffsetX, f.blushY);
      return g;
    });

    const my = f.mouthY;
    const nose = new Graphics().ellipse(0, my - 14, 8, 5.5).fill(P.nose);
    const w = (spread: number, depth: number) =>
      new Graphics()
        .moveTo(-spread * 2, my - 2)
        .quadraticCurveTo(-spread, my + depth, 0, my - 2)
        .quadraticCurveTo(spread, my + depth, spread * 2, my - 2)
        .stroke({ width: 5, color: P.mouth, cap: 'round', join: 'round' });
    const open = new Container();
    open.addChild(new Graphics().ellipse(0, my + 8, 13, 15).fill(P.mouthInside).stroke({ width: 5, color: P.mouth }), w(8, 10));
    this.mouths = { closed: w(8, 10), smile: w(11, 16), open };

    this.root.addChild(...this.blush, left.root, right.root, nose, this.mouths.closed, this.mouths.smile, this.mouths.open);
  }

  apply(p: {
    eyes: EyeState;
    openness: number;
    gazeX: number;
    gazeY: number;
    eyeScale: number;
    mouth: MouthState;
    blush: number;
    blushScale: number;
    shiftX: number;
    shiftY: number;
  }): void {
    for (const eye of this.eyes) eye.apply(p.eyes, p.openness, p.gazeX, p.gazeY, p.eyeScale);
    for (const [state, g] of Object.entries(this.mouths)) g.visible = state === p.mouth;
    for (const b of this.blush) {
      b.alpha = Math.min(1, Math.max(0, p.blush));
      b.scale.set(p.blushScale);
    }
    this.root.position.set(p.shiftX, p.shiftY);
  }
}
