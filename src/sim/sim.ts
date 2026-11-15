import type { Balance } from '../content/balance';
import { comboMult, comboOnTap, comboOnTick, comboTier, initialCombo, type ComboState } from './combo';
import { EventBus } from './eventBus';
import { Rng } from './rng';
import { canAcceptTap, pruneTaps } from './tapLimiter';
import type { TimeService } from './time';

export const TAP_ZONES = ['head', 'belly', 'cheek', 'paw', 'tail'] as const;
export type TapZone = (typeof TAP_ZONES)[number];

/** Точка тапа в координатах view. Sim её не интерпретирует — только передаёт в событие. */
export interface Point {
  x: number;
  y: number;
}

export type Command =
  | { type: 'tap'; zone: TapZone; point: Point }
  | { type: 'debug/setMood'; mood: number }
  | { type: 'debug/addHearts'; amount: number }
  | { type: 'debug/resetCombo' };

export interface TapEvent {
  zone: TapZone;
  point: Point;
  /** false — тап сверх лимита антиавтокликера: только визуал. */
  accepted: boolean;
  xp: number;
  hearts: number;
  rare: boolean;
  comboCount: number;
  comboTier: number;
  /** Засчитанных тапов в текущем окне (для прореживания хаптики). */
  tapsInWindow: number;
}

export interface SimEvents {
  tap: TapEvent;
  comboTier: { tier: number; prevTier: number; reason: 'up' | 'decay' | 'reset' };
  combo: { count: number; tier: number };
  wallet: { hearts: number; xp: number };
}

export interface SimState {
  hearts: number;
  xp: number;
  mood: number;
  combo: ComboState;
  tapTimes: number[];
}

export function initialState(balance: Balance): SimState {
  return { hearts: 0, xp: 0, mood: balance.mood.default, combo: initialCombo(), tapTimes: [] };
}

export function moodMult(mood: number, b: Balance): number {
  return b.tap.moodMultBase + b.tap.moodMultScale * mood * mood;
}

/** Детерминированная симуляция: ввод через dispatch(Command), вывод через events. */
export class Sim {
  readonly events = new EventBus<SimEvents>();
  private st: SimState;

  constructor(
    private readonly balance: Balance,
    private readonly time: TimeService,
    private readonly rng: Rng,
    state?: SimState,
  ) {
    this.st = state ?? initialState(balance);
  }

  get state(): Readonly<SimState> {
    return this.st;
  }

  dispatch(cmd: Command): void {
    switch (cmd.type) {
      case 'tap':
        this.tap(cmd.zone, cmd.point);
        break;
      case 'debug/setMood':
        this.st.mood = Math.min(1, Math.max(0, cmd.mood));
        break;
      case 'debug/addHearts':
        this.st.hearts += cmd.amount;
        this.emitWallet();
        break;
      case 'debug/resetCombo': {
        const prevTier = comboTier(this.st.combo.count, this.balance.combo);
        this.st.combo = initialCombo();
        this.events.emit('comboTier', { tier: 0, prevTier, reason: 'reset' });
        this.events.emit('combo', { count: 0, tier: 0 });
        break;
      }
    }
  }

  /** Fixed-step тик (balance.sim.tickMs). */
  tick(): void {
    const now = this.time.now();
    const cfg = this.balance.combo;
    const prev = this.st.combo;
    const next = comboOnTick(prev, now, cfg);
    if (next === prev) return;
    this.st.combo = next;
    const prevTier = comboTier(prev.count, cfg);
    const tier = comboTier(next.count, cfg);
    if (tier !== prevTier) this.events.emit('comboTier', { tier, prevTier, reason: 'decay' });
    if (next.count !== prev.count) this.events.emit('combo', { count: next.count, tier });
  }

  private tap(zone: TapZone, point: Point): void {
    const now = this.time.now();
    const b = this.balance;
    this.st.tapTimes = pruneTaps(this.st.tapTimes, now, b.tap.rateWindowMs);

    if (!canAcceptTap(this.st.tapTimes, b.tap.maxTapsPerWindow)) {
      const tier = comboTier(this.st.combo.count, b.combo);
      this.events.emit('tap', {
        zone, point, accepted: false, xp: 0, hearts: 0, rare: false,
        comboCount: this.st.combo.count, comboTier: tier, tapsInWindow: this.st.tapTimes.length,
      });
      return;
    }

    this.st.tapTimes.push(now);
    const prevTier = comboTier(this.st.combo.count, b.combo);
    this.st.combo = comboOnTap(this.st.combo, now, b.combo);
    const tier = comboTier(this.st.combo.count, b.combo);

    const rare = this.rng.chance(b.tap.rareChance);
    const xp = b.tap.baseXp * moodMult(this.st.mood, b) * comboMult(tier, b.combo);
    const hearts = b.tap.baseHearts * (1 + b.tap.heartsPerComboTier * tier) * (rare ? b.tap.rareHeartsMult : 1);
    this.st.xp += xp;
    this.st.hearts += hearts;

    this.events.emit('tap', {
      zone, point, accepted: true, xp, hearts, rare,
      comboCount: this.st.combo.count, comboTier: tier, tapsInWindow: this.st.tapTimes.length,
    });
    this.events.emit('combo', { count: this.st.combo.count, tier });
    if (tier !== prevTier) this.events.emit('comboTier', { tier, prevTier, reason: tier > prevTier ? 'up' : 'decay' });
    this.emitWallet();
  }

  private emitWallet(): void {
    this.events.emit('wallet', { hearts: this.st.hearts, xp: this.st.xp });
  }
}
