import type { Balance } from '../content/balance';

type ComboBalance = Balance['combo'];

export interface ComboState {
  count: number;
  /** Последний тап или последнее сползание — от него отсчитывается decay. */
  lastActivityAt: number | null;
  lastTapAt: number | null;
}

export const initialCombo = (): ComboState => ({ count: 0, lastActivityAt: null, lastTapAt: null });

export function comboTier(count: number, cfg: ComboBalance): number {
  let tier = 0;
  for (const threshold of cfg.tierThresholds) if (count >= threshold) tier++;
  return tier;
}

export function comboMult(tier: number, cfg: ComboBalance): number {
  return cfg.tierMults[Math.min(tier, cfg.tierMults.length - 1)] ?? 1;
}

/** Нижняя граница счётчика для тира (0 для тира 0). */
function tierFloor(tier: number, cfg: ComboBalance): number {
  return tier > 0 ? (cfg.tierThresholds[tier - 1] ?? 0) : 0;
}

/**
 * Засчитанный тап. Внутри окна — +1 к комбо. Вне окна комбо не обнуляется:
 * теряется только прогресс внутри текущего тира (DECISIONS: «мягкий сброс»).
 */
export function comboOnTap(state: ComboState, now: number, cfg: ComboBalance): ComboState {
  const inWindow = state.lastTapAt !== null && now - state.lastTapAt <= cfg.windowMs;
  const base = inWindow ? state.count : tierFloor(comboTier(state.count, cfg), cfg);
  return { count: base + 1, lastActivityAt: now, lastTapAt: now };
}

/** После decayAfterMs без тапов комбо сползает на один тир вниз (и так далее каждые decayAfterMs). */
export function comboOnTick(state: ComboState, now: number, cfg: ComboBalance): ComboState {
  if (state.count === 0 || state.lastActivityAt === null) return state;
  if (now - state.lastActivityAt < cfg.decayAfterMs) return state;
  const tier = comboTier(state.count, cfg);
  const count = tier > 0 ? tierFloor(tier - 1, cfg) : 0;
  return { ...state, count, lastActivityAt: now };
}
