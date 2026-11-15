import { Graphics, type Renderer, type Texture } from 'pixi.js';

export interface FxTextures {
  heart: Texture;
  sparkle: Texture;
  star: Texture;
  ring: Texture;
}

/** Белые текстуры частиц — цвет задаётся tint. Частицы только кодом (CLAUDE.md). */
export function createFxTextures(renderer: Renderer): FxTextures {
  const R = 32;
  const heart = new Graphics()
    .moveTo(0, R * 0.9)
    .bezierCurveTo(-R * 1.25, 0, -R * 0.9, -R * 1.05, 0, -R * 0.45)
    .bezierCurveTo(R * 0.9, -R * 1.05, R * 1.25, 0, 0, R * 0.9)
    .fill(0xffffff);

  const sparkle = new Graphics();
  sparkle.moveTo(0, -R);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const mid = a + Math.PI / 4;
    sparkle.quadraticCurveTo(Math.sin(mid) * R * 0.18, -Math.cos(mid) * R * 0.18, Math.sin(a + Math.PI / 2) * R, -Math.cos(a + Math.PI / 2) * R);
  }
  sparkle.fill(0xffffff);

  const points: number[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? R : R * 0.48;
    const a = (i * Math.PI) / 5;
    points.push(Math.sin(a) * r, -Math.cos(a) * r);
  }
  const star = new Graphics().poly(points).fill(0xffffff).stroke({ width: 4, color: 0xffffff, join: 'round' });

  const ring = new Graphics().circle(0, 0, R * 2).stroke({ width: 6, color: 0xffffff });

  const gen = (g: Graphics) => renderer.generateTexture({ target: g, resolution: 2, antialias: true });
  return { heart: gen(heart), sparkle: gen(sparkle), star: gen(star), ring: gen(ring) };
}
