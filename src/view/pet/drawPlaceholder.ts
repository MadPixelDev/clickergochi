import { Container, Graphics } from 'pixi.js';
import type { RigPart } from '../../content/pets/rigSchema';
import { nurseryLayout } from '../../content/scene';

type Shape = RigPart['placeholder'];

const OUTLINE = nurseryLayout.palette.outline;
const LINE = nurseryLayout.outlineWidth;

function earPath(g: Graphics, rx: number, ry: number, ox: number, oy: number): Graphics {
  return g
    .moveTo(ox - rx, oy)
    .bezierCurveTo(ox - rx * 0.9, oy - ry * 0.7, ox - rx * 0.25, oy - ry * 1.05, ox, oy - ry)
    .bezierCurveTo(ox + rx * 0.25, oy - ry * 1.05, ox + rx * 0.9, oy - ry * 0.7, ox + rx, oy)
    .closePath();
}

function tailPath(g: Graphics, s: Shape): { end: [number, number] } {
  const [ox, oy] = s.offset;
  const end: [number, number] = [ox + s.rx * 0.8, oy - s.ry];
  g.moveTo(ox, oy).bezierCurveTo(ox + s.rx * 3, oy - s.ry * 0.3, ox - s.rx * 1.6, oy - s.ry * 0.75, end[0], end[1]);
  return { end };
}

/** Процедурный плейсхолдер части: пастельная фигура + пятна + контур (SPEC §13.11). */
export function drawPlaceholderPart(s: Shape): Container {
  const root = new Container();
  const [ox, oy] = s.offset;

  if (s.shape === 'tail') {
    const outline = new Graphics();
    tailPath(outline, s);
    outline.stroke({ width: s.rx * 2 + LINE * 2, color: OUTLINE, cap: 'round' });
    const fill = new Graphics();
    const { end } = tailPath(fill, s);
    fill.stroke({ width: s.rx * 2, color: s.fill, cap: 'round' });
    root.addChild(outline, fill);
    for (const p of s.patches) {
      root.addChild(new Graphics().circle(end[0], end[1], s.rx - 1).fill(p.fill));
    }
    return root;
  }

  const base = new Graphics();
  const outline = new Graphics();
  if (s.shape === 'ear') {
    earPath(base, s.rx, s.ry, ox, oy).fill(s.fill);
    earPath(outline, s.rx, s.ry, ox, oy).stroke({ width: LINE, color: OUTLINE, join: 'round' });
  } else {
    base.ellipse(ox, oy, s.rx, s.ry).fill(s.fill);
    outline.ellipse(ox, oy, s.rx, s.ry).stroke({ width: LINE, color: OUTLINE });
  }
  root.addChild(base);

  if (s.patches.length > 0) {
    const patches = new Graphics();
    for (const p of s.patches) patches.ellipse(p.offset[0], p.offset[1], p.rx, p.ry).fill(p.fill);
    const mask = new Graphics().ellipse(ox, oy, s.rx, s.ry).fill(0xffffff);
    patches.mask = mask;
    root.addChild(mask, patches);
  }

  if (s.inner) {
    const inner = new Graphics();
    if (s.shape === 'ear') {
      earPath(inner, s.rx * s.inner.scale, s.ry * s.inner.scale, ox, oy - s.ry * 0.12).fill(s.inner.fill);
    } else {
      inner.ellipse(ox, oy + s.ry * 0.45, s.rx * s.inner.scale * 1.4, s.ry * s.inner.scale).fill(s.inner.fill);
    }
    root.addChild(inner);
  }

  root.addChild(outline);
  return root;
}
