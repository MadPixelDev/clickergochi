const UNITS = ['', 'K', 'M', 'B', 'T'] as const;

/** 950 → «950», 1234 → «1.2K», 3_400_000 → «3.4M» (SPEC §10). */
export function formatNumber(value: number): string {
  const v = Math.floor(value);
  if (v < 1000) return String(v);
  let unit = 0;
  let n = v;
  while (n >= 1000 && unit < UNITS.length - 1) {
    n /= 1000;
    unit++;
  }
  const rounded = n >= 100 ? Math.floor(n) : Math.floor(n * 10) / 10;
  return `${rounded}${UNITS[unit] ?? ''}`;
}

/** «+N» над малышом: дробная часть видна только у маленьких чисел. */
export function formatGain(value: number): string {
  if (value >= 10) return `+${formatNumber(value)}`;
  const r = Math.round(value * 10) / 10;
  return `+${Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1)}`;
}
