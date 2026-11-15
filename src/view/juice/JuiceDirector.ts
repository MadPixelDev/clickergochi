import type { Settings } from '../../app/settings';
import { tierColor, type Juice } from '../../content/juice';
import type { AudioOut } from '../../platform/audio';
import type { Haptics } from '../../platform/haptics';
import type { Rng } from '../../sim/rng';
import type { SimEvents, TapEvent } from '../../sim/sim';
import type { EventBus } from '../../sim/eventBus';
import { formatGain } from '../../ui/format';
import type { Particles } from '../fx/Particles';
import type { Popups } from '../fx/Popups';
import type { FxTextures } from '../fx/textures';
import type { NurseryScene } from '../NurseryScene';
import type { PetView } from '../pet/PetView';
import { noteFreq, noteIndex, SCALE_LENGTH } from './pentatonic';

interface Deps {
  events: EventBus<SimEvents>;
  pet: PetView;
  scene: NurseryScene;
  particles: Particles;
  popups: Popups;
  textures: FxTextures;
  audio: AudioOut;
  haptics: Haptics;
  rng: Rng;
  juice: () => Juice;
  settings: () => Settings;
}

/**
 * События sim → отклик (SPEC §10). На каждое событие первичный отклик
 * (squash, звук) и вторичный (частицы, «+N», выражение) в одном кадре.
 */
export class JuiceDirector {
  private hapticToggle = false;

  constructor(private readonly d: Deps) {
    d.events.on('tap', (e) => this.onTap(e));
    d.events.on('comboTier', (e) => {
      if (e.reason === 'up') this.onTierUp(e.tier);
      if (e.tier === 0) d.pet.setSmiling(false);
    });
  }

  private toWorld(p: { x: number; y: number }): { x: number; y: number } {
    return this.d.scene.world.toLocal(p);
  }

  private onTap(e: TapEvent): void {
    const { pet, particles, popups, textures, audio, haptics, rng } = this.d;
    const j = this.d.juice();
    const s = this.d.settings();
    const world = this.toWorld(e.point);
    const particleMult = s.reducedMotion ? j.particles.reducedMotionMult : 1;

    if (!e.accepted) {
      // Сверх лимита — только лёгкий визуал (§4.4).
      pet.tapImpulse(e.point, 0.5);
      particles.burst({ ...world, count: Math.round(1 * particleMult), textures: [textures.sparkle], colors: [tierColor(j, e.comboTier)] });
      audio.bop(this.freqFor(e.comboCount, j), rng.int(0, 3), j.audio.rejectedTapGain);
      return;
    }

    // Первичный: squash + звук + хаптика.
    pet.tapImpulse(e.point);
    pet.react(e.zone, e.point);
    audio.bop(this.freqFor(e.comboCount, j), rng.int(0, 3));
    this.tapHaptic(e, j);

    // Вторичный: частицы и «+N».
    const color = tierColor(j, e.comboTier);
    const count = Math.round(rng.int(j.particles.minCount, j.particles.maxCount) * particleMult);
    particles.burst({ ...world, count, textures: [textures.heart, textures.heart, textures.sparkle], colors: [color, j.colors.tier0] });
    popups.gain(formatGain(e.hearts), world.x, world.y - j.popup.fontSize * 0.6, e.rare ? j.colors.rare : j.colors.popupText, e.rare ? 1.4 : 1);

    if (e.rare) {
      popups.star(textures.star, world.x, world.y, j.colors.rare, s.reducedMotion);
      particles.burst({
        ...world,
        count: Math.round(j.rare.extraParticles * particleMult),
        textures: [textures.star, textures.sparkle],
        colors: [j.colors.rare, j.colors.tier1],
        power: 1.3,
      });
      audio.bell(noteFreq(SCALE_LENGTH * 2, j.audio.baseFreq));
      haptics.impact('medium');
      pet.celebrate();
    }
  }

  private onTierUp(tier: number): void {
    const { pet, popups, textures, audio, haptics, scene } = this.d;
    const j = this.d.juice();
    const center = scene.world.toLocal(pet.anchorGlobal('neck'));
    if (!this.d.settings().reducedMotion) popups.ring(textures.ring, center.x, center.y, tierColor(j, tier));
    const base = tier * 2;
    audio.arpeggio([0, 2, 4, 5].map((i) => noteFreq(base + i, j.audio.baseFreq)));
    haptics.impact('medium');
    pet.celebrate();
  }

  private freqFor(comboCount: number, j: Juice): number {
    const idx = noteIndex(comboCount, SCALE_LENGTH * j.audio.octaves, j.audio.pingPong);
    const detune = 1 + this.d.rng.range(-j.audio.detunePct, j.audio.detunePct);
    return noteFreq(idx, j.audio.baseFreq) * detune;
  }

  /** light на каждый тап; при частых тапах — на каждый второй (§10). */
  private tapHaptic(e: TapEvent, j: Juice): void {
    if (e.tapsInWindow > j.haptics.fastTapRate) {
      this.hapticToggle = !this.hapticToggle;
      if (!this.hapticToggle) return;
    }
    this.d.haptics.impact('light');
  }
}
