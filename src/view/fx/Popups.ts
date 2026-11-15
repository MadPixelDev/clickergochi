import gsap from 'gsap';
import { Container, Sprite, Text, type Texture } from 'pixi.js';
import type { Juice } from '../../content/juice';
import type { Rng } from '../../sim/rng';

/** «+N» над малышом и одноразовые вспышки (кольцо тира, золотая звезда). */
export class Popups {
  readonly root = new Container();
  private readonly pool: Text[] = [];

  constructor(
    private readonly juice: () => Juice,
    private readonly rng: Rng,
  ) {}

  /** «+N»: scale 0 → overshoot → 1, всплывает на risePx, fade за lifeMs (§10). */
  gain(text: string, x: number, y: number, color: string, sizeMult = 1): void {
    const p = this.juice().popup;
    const label = this.pool.pop() ?? new Text({ text: '', style: { fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: '900', align: 'center' } });
    label.text = text;
    label.style.fontSize = p.fontSize * sizeMult;
    label.style.fill = color;
    label.style.stroke = { color: '#FFFFFF', width: Math.max(4, p.fontSize * sizeMult * 0.22), join: 'round' };
    label.anchor.set(0.5);
    label.position.set(x + this.rng.range(-p.jitterPx, p.jitterPx), y);
    label.scale.set(0);
    label.alpha = 1;
    this.root.addChild(label);

    const life = p.lifeMs / 1000;
    const pop = p.popMs / 1000;
    gsap.killTweensOf(label);
    gsap.killTweensOf(label.scale);
    gsap
      .timeline({
        onComplete: () => {
          this.root.removeChild(label);
          this.pool.push(label);
        },
      })
      .to(label.scale, { x: p.overshoot, y: p.overshoot, duration: pop * 0.6, ease: 'back.out(3)' }, 0)
      .to(label.scale, { x: 1, y: 1, duration: pop * 0.4, ease: 'sine.out' }, pop * 0.6)
      .to(label, { y: y - p.risePx, duration: life, ease: 'power2.out' }, 0)
      .to(label, { alpha: 0, duration: life * 0.5, ease: 'sine.in' }, life * 0.5);
  }

  /** Кольцо-вспышка вокруг малыша на новом тире комбо. */
  ring(texture: Texture, x: number, y: number, color: string): void {
    const r = this.juice().comboRing;
    const s = new Sprite({ texture, anchor: 0.5, tint: color });
    s.position.set(x, y);
    const baseRadius = texture.width / 2;
    s.scale.set(r.startRadius / baseRadius);
    this.root.addChild(s);
    gsap.to(s.scale, { x: r.endRadius / baseRadius, y: r.endRadius / baseRadius, duration: r.durationMs / 1000, ease: 'power2.out' });
    gsap.to(s, { alpha: 0, duration: r.durationMs / 1000, ease: 'power1.in', onComplete: () => void s.destroy() });
  }

  /** Золотая искра редкого тапа: крупная звезда с вращением. */
  star(texture: Texture, x: number, y: number, color: string, reducedMotion: boolean): void {
    const r = this.juice().rare;
    const s = new Sprite({ texture, anchor: 0.5, tint: color });
    s.position.set(x, y);
    s.scale.set(0);
    this.root.addChild(s);
    const target = r.starSize / (texture.width / 2);
    const life = r.lifeMs / 1000;
    gsap.to(s.scale, { x: target, y: target, duration: life * 0.25, ease: 'back.out(2.5)' });
    if (!reducedMotion) gsap.to(s, { rotation: Math.PI * 0.6, duration: life, ease: 'power1.out' });
    gsap.to(s, { y: y - r.starSize, duration: life, ease: 'power2.out' });
    gsap.to(s, { alpha: 0, duration: life * 0.4, delay: life * 0.6, onComplete: () => void s.destroy() });
  }
}
