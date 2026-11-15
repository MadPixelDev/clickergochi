import { Container, Graphics, type FederatedPointerEvent } from 'pixi.js';
import { nurseryLayout as L } from '../content/scene';
import type { PetView } from './pet/PetView';

/**
 * Детская M0: процедурная пустая комната (стена, плинтус, пол),
 * процедурная контактная тень (SPEC §7.6) и малыш.
 */
export class NurseryScene {
  readonly root = new Container();
  /** Мир в логических юнитах: всё, что ниже, масштабируется вместе. */
  readonly world = new Container();
  readonly fxLayer = new Container();
  private readonly room = new Graphics();
  private readonly shadow = new Graphics();
  private worldW: number = L.worldWidth;
  private worldH: number = L.minWorldHeight;

  constructor(private readonly pet: PetView) {
    this.root.addChild(this.world);
    this.world.addChild(this.room, this.shadow, pet.root, this.fxLayer);
    this.drawShadow();
  }

  /** Подгоняет мир под экран: колонка 1000 юнитов, мир растягивается по высоте. */
  layout(screenW: number, screenH: number): void {
    const scale = Math.min(screenW / L.worldWidth, screenH / L.minWorldHeight);
    this.world.scale.set(scale);
    this.worldW = screenW / scale;
    this.worldH = screenH / scale;
    this.drawRoom();
    const floorBack = this.worldH * L.floorBackRatio;
    this.pet.root.position.set(this.worldW / 2, floorBack + L.petGroundOffset);
    this.pet.root.scale.set(L.petScale);
    this.shadow.position.copyFrom(this.pet.root.position);
  }

  private drawRoom(): void {
    const r = L.room;
    const floorBack = this.worldH * L.floorBackRatio;
    const g = this.room.clear();
    g.rect(0, 0, this.worldW, floorBack).fill(r.wall);
    for (let x = this.worldW / 2 - r.stripeWidth / 2; x > -r.stripeWidth; x -= r.stripeWidth * 2) {
      g.rect(x, 0, r.stripeWidth, floorBack).fill(r.wallStripe);
    }
    for (let x = this.worldW / 2 + r.stripeWidth * 1.5; x < this.worldW; x += r.stripeWidth * 2) {
      g.rect(x, 0, r.stripeWidth, floorBack).fill(r.wallStripe);
    }
    g.rect(0, floorBack, this.worldW, this.worldH - floorBack).fill(r.floor);
    for (let y = floorBack + r.trimHeight + r.plankHeight; y < this.worldH; y += r.plankHeight) {
      g.rect(0, y, this.worldW, 3).fill(r.floorLine);
    }
    g.rect(0, floorBack, this.worldW, r.trimHeight).fill(r.trim);
  }

  private drawShadow(): void {
    const s = L.shadow;
    const g = this.shadow.clear();
    // Мягкий край — концентрические эллипсы с нарастающей альфой к центру.
    for (let i = 0; i < s.rings; i++) {
      const k = 1 - i / s.rings;
      g.ellipse(0, 0, s.rx * k + s.rx * 0.15, s.ry * k + s.ry * 0.15).fill({ color: L.palette.outline, alpha: s.alpha / s.rings });
    }
  }

  /** Тень реагирует на squash (шире) и прыжок (меньше и бледнее). */
  update(squashAmount: number, squashScale: number): void {
    const lift = Math.min(1, Math.abs(this.pet.hopOffset) / 120);
    const w = (1 + squashScale * squashAmount) * (1 - lift * 0.35);
    this.shadow.scale.set(w * L.petScale, (1 - lift * 0.35) * L.petScale);
    this.shadow.alpha = 1 - lift * 0.5;
  }

  enableInput(handler: (e: FederatedPointerEvent) => void, move: (e: FederatedPointerEvent) => void): void {
    this.root.eventMode = 'static';
    this.root.on('pointerdown', handler);
    this.root.on('globalpointermove', move);
  }
}
