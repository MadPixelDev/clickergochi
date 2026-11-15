import { Container, Graphics, Point } from 'pixi.js';
import type { Juice } from '../../content/juice';
import type { PartId, Rig } from '../../content/pets/rigSchema';
import { nurseryLayout } from '../../content/scene';
import type { Rng } from '../../sim/rng';
import type { TapZone } from '../../sim/sim';
import { Spring } from '../spring';
import { drawPlaceholderPart } from './drawPlaceholder';
import { Face, type EyeState, type MouthState } from './Face';

const EAR_REST = 0.12;

/**
 * Малыш: cutout-риг из плейсхолдеров + процедурный слой (SPEC §8.2).
 * View не меняет sim — только реагирует на вызовы из JuiceDirector.
 */
export class PetView {
  readonly root = new Container();
  /** Ось сжатия: поворачивается к точке тапа, скейлится, затем поворот компенсируется. */
  private readonly squashAxis = new Container();
  private readonly squashUnrot = new Container();
  private readonly breath = new Container();
  private readonly parts = new Map<PartId, Container>();
  private readonly face: Face;
  private readonly debugLayer: Graphics[] = [];

  // Пружины процедурного слоя
  private readonly squash = new Spring();
  private readonly headLag = new Spring();
  private readonly earL = new Spring();
  private readonly earR = new Spring();
  private readonly tail = new Spring();
  private readonly headTilt = new Spring();
  private readonly pawL = new Spring();
  private readonly pawR = new Spring();
  private readonly hop = new Spring();
  private readonly cheek = new Spring();
  private readonly surprise = new Spring();
  private readonly gazeX = new Spring();
  private readonly gazeY = new Spring();

  private t = 0;
  private jelly = 0;
  private squashAngle = 0;
  private blush = 0;
  private nextBlinkAt = 0;
  private blinkStart = -1;
  private blinkTwice = false;
  private happyUntil = 0;
  private mouthOpenUntil = 0;
  private smiling = false;
  private nextEarTwitch = 0;
  private nextTailTwitch = 0;
  private pointer: { x: number; y: number; at: number } | null = null;
  private wander = { x: 0, y: 0, next: 0 };

  constructor(
    private readonly rig: Rig,
    private readonly juice: () => Juice,
    private readonly rng: Rng,
  ) {
    this.root.addChild(this.squashAxis);
    this.squashAxis.addChild(this.squashUnrot);
    this.squashUnrot.addChild(this.breath);

    const groundX = rig.size[0] / 2;
    for (const part of rig.parts) {
      const node = new Container();
      node.sortableChildren = true;
      node.zIndex = part.z;
      const gfx = drawPlaceholderPart(part.placeholder);
      gfx.zIndex = 0;
      node.addChild(gfx);
      if (part.parent === null) {
        node.position.set(part.pos[0] - groundX, part.pos[1] - rig.groundY);
        this.breath.addChild(node);
      } else {
        const parent = this.parts.get(part.parent);
        if (!parent) throw new Error(`Rig ${rig.id}: parent ${part.parent} must precede ${part.id}`);
        node.position.set(part.pos[0], part.pos[1]);
        parent.addChild(node);
      }
      this.parts.set(part.id, node);
    }

    this.face = new Face(rig);
    this.face.root.zIndex = 10;
    this.part('head').addChild(this.face.root);
    this.part('ear_l').rotation = -EAR_REST;
    this.part('ear_r').rotation = EAR_REST;

    this.buildDebugOverlay();
    const j = juice();
    this.scheduleBlink(j);
    this.nextEarTwitch = this.rng.range(j.ears.twitchMin, j.ears.twitchMax);
    this.nextTailTwitch = this.rng.range(j.tail.twitchMin, j.tail.twitchMax);
  }

  private part(id: PartId): Container {
    const node = this.parts.get(id);
    if (!node) throw new Error(`Rig ${this.rig.id}: missing part ${id}`);
    return node;
  }

  /** Высота прыжка (юниты кадра, ≤ 0 — над землёй) — для тени. */
  get hopOffset(): number {
    return Math.min(0, this.hop.x);
  }

  get squashAmount(): number {
    return this.squash.x;
  }

  // ───────────── ввод от JuiceDirector ─────────────

  /** Палец/курсор: взгляд следует за ним (глобальные координаты). */
  lookAt(global: { x: number; y: number }): void {
    this.pointer = { x: global.x, y: global.y, at: this.t };
  }

  /** Тап: squash & stretch от точки тапа (§8.2). strength < 1 — для тапов сверх лимита. */
  tapImpulse(global: { x: number; y: number }, strength = 1): void {
    const j = this.juice().squash;
    const center = this.part('body').toGlobal(new Point(0, -this.rig.size[1] * 0.25));
    const dx = global.x - center.x;
    const dy = global.y - center.y;
    // Угол оси сжатия: 0 — тап сверху (сжатие по вертикали).
    const raw = Math.atan2(dx, -dy);
    const clamped = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, raw));
    this.squashAngle = clamped * j.directional;
    // Амплитуда не суммируется — вместо этого копится «желейность».
    this.squash.snap(Math.min(1, Math.max(this.squash.x, 0) + strength));
    this.jelly = Math.min(1, this.jelly + j.jellyPerTap);
    this.lookAt(global);

    const e = this.juice().ears;
    this.earL.kick(-e.tapKick * strength);
    this.earR.kick(e.tapKick * strength);
    this.tail.kick(this.juice().tail.tapKick * strength * (dx > 0 ? -1 : 1));
  }

  /** Реакция по зоне тапа (клип + выражение). */
  react(zone: TapZone, global: { x: number; y: number }): void {
    const j = this.juice();
    const r = j.reactions;
    const kick = Math.sqrt(r.springStiffness);
    this.blush += j.expression.blushPerTap;
    this.smiling = true;

    switch (zone) {
      case 'head': {
        const local = this.part('head').toLocal(global);
        this.headTilt.kick(r.headTilt * kick * (local.x >= 0 ? 1 : -1));
        this.happyUntil = this.t + j.expression.happyEyesMs / 1000;
        break;
      }
      case 'belly':
        this.hopBy(r.bellyHopPx);
        this.mouthOpenUntil = this.t + j.expression.mouthOpenMs / 1000;
        this.happyUntil = this.t + j.expression.happyEyesMs / 1000;
        break;
      case 'cheek':
        this.cheek.kick(r.cheekPuff * kick);
        this.blush += j.expression.blushPerTap;
        this.happyUntil = this.t + j.expression.happyEyesMs / 1000;
        break;
      case 'paw': {
        const pawLeft = this.part('paw_fl').toLocal(global);
        const pawRight = this.part('paw_fr').toLocal(global);
        const isLeft = pawLeft.x * pawLeft.x + pawLeft.y * pawLeft.y < pawRight.x * pawRight.x + pawRight.y * pawRight.y;
        (isLeft ? this.pawL : this.pawR).kick(r.pawWave * kick * (isLeft ? 1 : -1));
        this.mouthOpenUntil = this.t + j.expression.mouthOpenMs / 1000;
        break;
      }
      case 'tail':
        this.tail.kick(j.tail.tapKick * j.tail.zoneTapMult);
        this.surprise.kick(r.surprisedScale * kick);
        this.mouthOpenUntil = this.t + j.expression.mouthOpenMs / 1000;
        break;
    }
  }

  /** Радость: новый тир комбо, редкий тап. */
  celebrate(): void {
    const j = this.juice();
    this.hopBy(j.reactions.celebrateHopPx);
    this.happyUntil = this.t + (j.expression.happyEyesMs * 2) / 1000;
    this.mouthOpenUntil = this.t + j.expression.mouthOpenMs / 1000;
    this.earL.kick(-j.ears.twitchKick);
    this.earR.kick(j.ears.twitchKick);
  }

  /** Сброс улыбки, когда комбо закончилось. */
  setSmiling(smiling: boolean): void {
    this.smiling = smiling;
  }

  private hopBy(px: number): void {
    const r = this.juice().reactions;
    // Пик ≈ v / ω для слабозатухающей пружины.
    this.hop.kick(-px * Math.sqrt(r.hopStiffness));
  }

  // ───────────── hit-test ─────────────

  /** Зона тапа по глобальной точке или null, если мимо. */
  hitTest(global: { x: number; y: number }): TapZone | null {
    const sorted = [...this.rig.hitboxes].sort((a, b) => b.priority - a.priority);
    for (const hb of sorted) {
      const local = this.part(hb.part).toLocal(global);
      const nx = (local.x - hb.center[0]) / hb.rx;
      const ny = (local.y - hb.center[1]) / hb.ry;
      if (nx * nx + ny * ny <= 1) return hb.zone;
    }
    return null;
  }

  anchorGlobal(name: string): Point {
    const a = this.rig.anchors[name];
    if (!a) return this.root.toGlobal(new Point(0, 0));
    return this.part(a.part).toGlobal(new Point(a.pos[0], a.pos[1]));
  }

  setDebug(visible: boolean): void {
    for (const g of this.debugLayer) g.visible = visible;
  }

  private buildDebugOverlay(): void {
    const P = nurseryLayout.palette;
    for (const hb of this.rig.hitboxes) {
      const g = new Graphics().ellipse(hb.center[0], hb.center[1], hb.rx, hb.ry).stroke({ width: 3, color: P.debugHitbox, alpha: 0.8 });
      g.zIndex = 100;
      this.part(hb.part).addChild(g);
      this.debugLayer.push(g);
    }
    for (const a of Object.values(this.rig.anchors)) {
      const g = new Graphics()
        .moveTo(a.pos[0] - 10, a.pos[1]).lineTo(a.pos[0] + 10, a.pos[1])
        .moveTo(a.pos[0], a.pos[1] - 10).lineTo(a.pos[0], a.pos[1] + 10)
        .stroke({ width: 3, color: P.debugAnchor });
      g.zIndex = 101;
      this.part(a.part).addChild(g);
      this.debugLayer.push(g);
    }
    const ground = new Graphics().moveTo(-200, 0).lineTo(200, 0).stroke({ width: 2, color: P.debugAnchor });
    this.root.addChild(ground);
    this.debugLayer.push(ground);
    this.setDebug(false);
  }

  // ───────────── процедурная жизнь ─────────────

  private scheduleBlink(j: Juice): void {
    this.nextBlinkAt = this.t + this.rng.range(j.blink.minInterval, j.blink.maxInterval);
  }

  /** Открытость глаз 0..1 по фазе моргания. */
  private blinkOpenness(j: Juice): number {
    if (this.blinkStart < 0) {
      if (this.t >= this.nextBlinkAt) {
        this.blinkStart = this.t;
        this.blinkTwice = this.rng.chance(j.blink.doubleChance);
      }
      return 1;
    }
    const close = j.blink.closeMs / 1000;
    const open = j.blink.openMs / 1000;
    const p = this.t - this.blinkStart;
    if (p < close) return 1 - p / close;
    if (p < close + open) return (p - close) / open;
    if (this.blinkTwice) {
      this.blinkTwice = false;
      this.blinkStart = this.t;
      return 1;
    }
    this.blinkStart = -1;
    this.scheduleBlink(j);
    return 1;
  }

  update(dt: number): void {
    const j = this.juice();
    this.t += dt;

    // Squash & stretch с «желе»: чем чаще тапы, тем мягче пружина.
    this.jelly = Math.max(0, this.jelly - j.squash.jellyDecayPerSec * dt);
    const k = j.squash.stiffness * (1 - this.jelly * j.squash.jellyMaxStiffnessDrop);
    const s = this.squash.step(dt, k, j.squash.damping);
    const a = j.squash.amount * s;
    this.squashAxis.rotation = this.squashAngle;
    this.squashUnrot.rotation = -this.squashAngle;
    this.squashAxis.scale.set(1 + a, 1 - a);

    // Голова отстаёт от тела.
    this.headLag.target = s;
    const lag = this.headLag.step(dt, j.squash.headLagStiffness, j.squash.headLagDamping);
    const head = this.part('head');
    const headPart = this.rig.parts.find((p) => p.id === 'head');
    const headBaseY = headPart ? headPart.pos[1] : 0;
    head.y = headBaseY - (s - lag) * j.squash.headLagPx;

    // Дыхание.
    const phase = Math.sin((this.t / j.breathing.period) * Math.PI * 2);
    this.breath.scale.set(1 - phase * j.breathing.scaleX, 1 + phase * j.breathing.scaleY);

    // Прыжок.
    const rs = j.reactions;
    this.hop.step(dt, rs.hopStiffness, rs.hopDamping);
    this.breath.y = Math.min(0, this.hop.x);

    // Уши и хвост: пружины + редкие подёргивания.
    if (this.t >= this.nextEarTwitch) {
      (this.rng.chance(0.5) ? this.earL : this.earR).kick((this.rng.chance(0.5) ? 1 : -1) * j.ears.twitchKick);
      this.nextEarTwitch = this.t + this.rng.range(j.ears.twitchMin, j.ears.twitchMax);
    }
    if (this.t >= this.nextTailTwitch) {
      this.tail.kick(j.tail.twitchKick);
      this.nextTailTwitch = this.t + this.rng.range(j.tail.twitchMin, j.tail.twitchMax);
    }
    this.part('ear_l').rotation = -EAR_REST + this.earL.step(dt, j.ears.stiffness, j.ears.damping);
    this.part('ear_r').rotation = EAR_REST + this.earR.step(dt, j.ears.stiffness, j.ears.damping);
    const sway = Math.sin((this.t / j.tail.swayPeriod) * Math.PI * 2) * j.tail.swayAmp;
    this.part('tail').rotation = sway + this.tail.step(dt, j.tail.stiffness, j.tail.damping);

    // Реакции.
    this.part('paw_fl').rotation = this.pawL.step(dt, rs.springStiffness, rs.springDamping);
    this.part('paw_fr').rotation = this.pawR.step(dt, rs.springStiffness, rs.springDamping);
    const cheek = this.cheek.step(dt, rs.springStiffness, rs.springDamping);
    const surprise = this.surprise.step(dt, rs.springStiffness, rs.springDamping);
    const tilt = this.headTilt.step(dt, rs.springStiffness, rs.springDamping);

    // Взгляд: к пальцу, если он был недавно, иначе блуждает.
    const g = j.gaze;
    let tx: number;
    let ty: number;
    const pointerFresh = this.pointer && this.t - this.pointer.at < g.pointerHoldMs / 1000;
    if (pointerFresh && this.pointer) {
      const local = head.toLocal(this.pointer);
      tx = local.x;
      ty = local.y - this.rig.face.eyeY;
    } else {
      if (this.t >= this.wander.next) {
        this.wander = {
          x: this.rng.range(-1, 1),
          y: this.rng.range(-0.6, 0.6),
          next: this.t + this.rng.range(g.wanderMin, g.wanderMax),
        };
      }
      tx = this.wander.x * g.reachPx;
      ty = this.wander.y * g.reachPx;
    }
    const dist = Math.hypot(tx, ty) || 1;
    const reach = Math.min(1, dist / g.reachPx);
    this.gazeX.target = (tx / dist) * reach;
    this.gazeY.target = (ty / dist) * reach;
    const gx = this.gazeX.step(dt, g.stiffness, g.damping);
    const gy = this.gazeY.step(dt, g.stiffness, g.damping);
    head.rotation = tilt + gx * g.headTurn;

    // Выражение.
    const happy = this.t < this.happyUntil;
    const eyes: EyeState = happy ? 'happy' : 'open';
    const mouth: MouthState = this.t < this.mouthOpenUntil ? 'open' : this.smiling ? 'smile' : 'closed';
    this.blush = Math.max(0, this.blush - j.expression.blushDecayPerSec * dt);
    const offset = g.maxOffset * this.face.eyeDiameter;
    this.face.apply({
      eyes,
      openness: this.blinkOpenness(j),
      gazeX: gx * offset,
      gazeY: gy * offset,
      eyeScale: 1 + surprise,
      mouth,
      blush: j.expression.blushBase + this.blush,
      blushScale: 1 + cheek,
      shiftX: gx * g.faceShift,
      shiftY: gy * g.faceShift * g.faceShiftY,
    });
  }
}
