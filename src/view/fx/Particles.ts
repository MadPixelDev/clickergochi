import { Container, Sprite, type Texture } from 'pixi.js';
import type { Juice } from '../../content/juice';
import type { Rng } from '../../sim/rng';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  spin: number;
  age: number;
  life: number;
  size: number;
}

export interface BurstOptions {
  x: number;
  y: number;
  count: number;
  textures: readonly Texture[];
  colors: readonly string[];
  /** Множитель скорости (для крупных всплесков). */
  power?: number;
  /** Направление веера, рад (0 — вверх). */
  direction?: number;
}

/** Пул частиц с лимитом активных (SPEC §13.7: ≤ 150). */
export class Particles {
  readonly root = new Container();
  private readonly active: Particle[] = [];
  private readonly free: Sprite[] = [];

  constructor(
    private readonly juice: () => Juice,
    private readonly rng: Rng,
  ) {}

  get activeCount(): number {
    return this.active.length;
  }

  burst(o: BurstOptions): void {
    const p = this.juice().particles;
    const spread = (p.spreadDeg * Math.PI) / 180;
    const power = o.power ?? 1;
    for (let i = 0; i < o.count; i++) {
      if (this.active.length >= p.maxActive) this.recycle(0);
      const sprite = this.free.pop() ?? new Sprite();
      sprite.texture = this.rng.pick(o.textures);
      sprite.anchor.set(0.5);
      sprite.tint = this.rng.pick(o.colors);
      sprite.position.set(o.x, o.y);
      sprite.alpha = 1;
      sprite.rotation = this.rng.range(-0.4, 0.4);
      // Веер вверх с равномерным распределением по углу.
      const t = o.count > 1 ? i / (o.count - 1) - 0.5 : 0;
      const angle = (o.direction ?? 0) + t * spread + this.rng.range(-0.15, 0.15);
      const speed = this.rng.range(p.speedMin, p.speedMax) * power;
      this.root.addChild(sprite);
      this.active.push({
        sprite,
        vx: Math.sin(angle) * speed,
        vy: -Math.cos(angle) * speed,
        spin: this.rng.range(-p.spin, p.spin),
        age: 0,
        life: (p.lifeMs / 1000) * this.rng.range(0.8, 1.2),
        size: this.rng.range(p.sizeMin, p.sizeMax) / (sprite.texture.width / 2 || 1),
      });
    }
  }

  private recycle(index: number): void {
    const [p] = this.active.splice(index, 1);
    if (!p) return;
    this.root.removeChild(p.sprite);
    this.free.push(p.sprite);
  }

  update(dt: number): void {
    const cfg = this.juice().particles;
    const drag = Math.exp(-cfg.drag * dt);
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      if (!p) continue;
      p.age += dt;
      if (p.age >= p.life) {
        this.recycle(i);
        continue;
      }
      p.vx *= drag;
      p.vy = p.vy * drag + cfg.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.rotation += p.spin * dt;
      const k = p.age / p.life;
      // Поп-ин за первые 15% жизни, затухание за последние 40%.
      const grow = Math.min(1, k / 0.15);
      const pop = grow < 1 ? grow * (1 + 0.3 * Math.sin(grow * Math.PI)) : 1;
      p.sprite.scale.set(p.size * pop);
      p.sprite.alpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    }
  }
}
