import type { Juice } from '../content/juice';

/**
 * Процедурный синт-звук для M0 (сэмплов ещё нет, см. DECISIONS).
 * Все параметры берутся из juice при каждом вызове — live-тюнинг работает сразу.
 * Цепочка: голоса → master gain → лимитер → выход.
 */
export interface AudioOut {
  unlock(): void;
  setEnabled(enabled: boolean): void;
  /** «Боп» тапа. variant — номер сэмпла из пула 3–4 (§10). */
  bop(freq: number, variant: number, gainMult?: number): void;
  arpeggio(freqs: readonly number[]): void;
  bell(freq: number): void;
}

type Juicer = () => Juice;

export class SynthAudio implements AudioOut {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  constructor(private readonly juice: Juicer) {}

  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 4;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.12;
      this.master = this.ctx.createGain();
      this.master.connect(limiter).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private ready(): { ctx: AudioContext; out: GainNode } | null {
    if (!this.enabled || !this.ctx || !this.master || this.ctx.state !== 'running') return null;
    this.master.gain.value = this.juice().audio.master;
    return { ctx: this.ctx, out: this.master };
  }

  bop(freq: number, variant: number, gainMult = 1): void {
    const r = this.ready();
    if (!r) return;
    const a = this.juice().audio;
    const { ctx, out } = r;
    const t = ctx.currentTime;
    const dur = a.bopDecayMs / 1000;
    const peak = a.bopGain * gainMult;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    env.connect(out);

    // Пул из 4 тембров: чистый, мягкий треугольник, с октавой, «деревянный».
    const v = ((variant % 4) + 4) % 4;
    const main = ctx.createOscillator();
    main.type = v === 1 ? 'triangle' : 'sine';
    main.frequency.setValueAtTime(freq * (1 + a.bopPitchDrop), t);
    main.frequency.exponentialRampToValueAtTime(freq, t + Math.min(0.04, dur * 0.4));
    main.connect(env);
    main.start(t);
    main.stop(t + dur + 0.02);

    if (v >= 2) {
      const partial = ctx.createOscillator();
      const pg = ctx.createGain();
      partial.type = 'sine';
      partial.frequency.value = freq * (v === 2 ? 2 : 3);
      pg.gain.value = v === 2 ? 0.25 : 0.15;
      partial.connect(pg).connect(env);
      partial.start(t);
      partial.stop(t + dur * 0.6);
    }
  }

  arpeggio(freqs: readonly number[]): void {
    const r = this.ready();
    if (!r) return;
    const step = this.juice().audio.arpStepMs / 1000;
    freqs.forEach((f, i) => this.tone(f, r.ctx.currentTime + i * step, 0.22, this.juice().audio.bopGain * 0.6, 'triangle'));
  }

  bell(freq: number): void {
    const r = this.ready();
    if (!r) return;
    const g = this.juice().audio.bellGain;
    const t = r.ctx.currentTime;
    // Неармонические партиалы колокольчика.
    this.tone(freq, t, 1.2, g, 'sine');
    this.tone(freq * 2.76, t, 0.7, g * 0.35, 'sine');
    this.tone(freq * 5.4, t, 0.35, g * 0.15, 'sine');
  }

  private tone(freq: number, at: number, dur: number, gain: number, type: OscillatorType): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(env).connect(this.master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }
}
