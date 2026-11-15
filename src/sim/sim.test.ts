import { describe, expect, it } from 'vitest';
import { balance } from '../content/balance';
import { comboOnTap, comboOnTick, comboTier, initialCombo, type ComboState } from './combo';
import { EventBus } from './eventBus';
import { Rng } from './rng';
import { moodMult, Sim, type TapEvent } from './sim';
import { ManualClock, ScaledClock } from './time';

const P = { x: 0, y: 0 };
const cfg = balance.combo;

function makeSim(seed = 1) {
  const clock = new ManualClock(1000);
  const sim = new Sim(balance, clock, new Rng(seed));
  const taps: TapEvent[] = [];
  sim.events.on('tap', (e) => taps.push(e));
  return { clock, sim, taps };
}

/** Тапает n раз с шагом stepMs. */
function tapN(sim: Sim, clock: ManualClock, n: number, stepMs: number) {
  for (let i = 0; i < n; i++) {
    sim.dispatch({ type: 'tap', zone: 'head', point: P });
    clock.advance(stepMs);
    sim.tick();
  }
}

describe('Rng', () => {
  it('детерминирован по seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
    for (const v of seqA) expect(v).toBeGreaterThanOrEqual(0);
    for (const v of seqA) expect(v).toBeLessThan(1);
  });
});

describe('EventBus', () => {
  it('доставляет и отписывает', () => {
    const bus = new EventBus<{ a: number }>();
    const got: number[] = [];
    const off = bus.on('a', (v) => got.push(v));
    bus.emit('a', 1);
    off();
    bus.emit('a', 2);
    expect(got).toEqual([1]);
  });
});

describe('ScaledClock', () => {
  it('не прыгает при смене множителя', () => {
    let real = 0;
    const clock = new ScaledClock(() => real);
    real = 100;
    expect(clock.now()).toBe(100);
    clock.setMultiplier(60);
    expect(clock.now()).toBe(100);
    real = 110;
    expect(clock.now()).toBe(100 + 600);
  });
});

describe('combo', () => {
  it('тиры по порогам 10/30/60/100', () => {
    expect(comboTier(9, cfg)).toBe(0);
    expect(comboTier(10, cfg)).toBe(1);
    expect(comboTier(30, cfg)).toBe(2);
    expect(comboTier(60, cfg)).toBe(3);
    expect(comboTier(100, cfg)).toBe(4);
    expect(comboTier(500, cfg)).toBe(4);
  });

  it('тап в окне продлевает комбо', () => {
    let s = initialCombo();
    s = comboOnTap(s, 0, cfg);
    s = comboOnTap(s, cfg.windowMs, cfg);
    expect(s.count).toBe(2);
  });

  it('тап вне окна теряет только прогресс внутри тира', () => {
    let s: ComboState = { count: 25, lastTapAt: 0, lastActivityAt: 0 };
    s = comboOnTap(s, cfg.windowMs + 1, cfg);
    expect(s.count).toBe(11);
  });

  it('без тапов сползает на тир вниз, а не обнуляется', () => {
    let s: ComboState = { count: 65, lastTapAt: 0, lastActivityAt: 0 };
    s = comboOnTick(s, cfg.decayAfterMs - 1, cfg);
    expect(s.count).toBe(65);
    s = comboOnTick(s, cfg.decayAfterMs, cfg);
    expect(s.count).toBe(30);
    s = comboOnTick(s, cfg.decayAfterMs * 2, cfg);
    expect(s.count).toBe(10);
    s = comboOnTick(s, cfg.decayAfterMs * 3, cfg);
    expect(s.count).toBe(0);
  });
});

describe('Sim tap', () => {
  it('XP = base × moodMult × comboMult', () => {
    const { sim, taps } = makeSim();
    sim.dispatch({ type: 'debug/setMood', mood: 1 });
    sim.dispatch({ type: 'tap', zone: 'belly', point: P });
    expect(taps[0]?.xp).toBeCloseTo(balance.tap.baseXp * 3.0);
    expect(moodMult(0, balance)).toBeCloseTo(0.5);
  });

  it('антиавтокликер: не больше 12 тапов в секунду, лишние только визуал', () => {
    const { sim, clock, taps } = makeSim();
    tapN(sim, clock, 20, 10); // 20 тапов за 200 мс
    expect(taps.filter((t) => t.accepted)).toHaveLength(balance.tap.maxTapsPerWindow);
    expect(taps.filter((t) => !t.accepted).every((t) => t.xp === 0 && t.hearts === 0)).toBe(true);
  });

  it('10 тапов/с без пропусков доводят до тира 1 и дают бонус к сердечкам', () => {
    const { sim, clock, taps } = makeSim();
    const tierUps: number[] = [];
    sim.events.on('comboTier', (e) => tierUps.push(e.tier));
    tapN(sim, clock, 12, 100);
    expect(tierUps).toEqual([1]);
    const tierTap = taps.find((t) => t.comboTier === 1 && !t.rare);
    expect(tierTap?.hearts).toBeCloseTo(balance.tap.baseHearts * (1 + balance.tap.heartsPerComboTier));
  });

  it('редкий тап даёт ×5 сердечек и детерминирован по seed', () => {
    const run = (seed: number) => {
      const { sim, clock, taps } = makeSim(seed);
      tapN(sim, clock, 300, 200);
      return taps.filter((t) => t.rare).map((t) => t.comboCount);
    };
    const rares = run(7);
    expect(rares).toEqual(run(7));
    expect(rares.length).toBeGreaterThan(0);
  });

  it('событие combo при сползании', () => {
    const { sim, clock } = makeSim();
    tapN(sim, clock, 12, 100);
    const counts: number[] = [];
    sim.events.on('combo', (e) => counts.push(e.count));
    clock.advance(cfg.decayAfterMs);
    sim.tick();
    expect(counts).toEqual([0]);
  });
});
