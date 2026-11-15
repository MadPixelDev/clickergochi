/** Антиавтокликер: скользящее окно засчитанных тапов (SPEC §4.4). */
export function pruneTaps(times: readonly number[], now: number, windowMs: number): number[] {
  return times.filter((t) => now - t < windowMs);
}

export function canAcceptTap(times: readonly number[], maxPerWindow: number): boolean {
  return times.length < maxPerWindow;
}
