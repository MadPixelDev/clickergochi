/** Мажорная пентатоника C-D-E-G-A в полутонах от тоники. */
const SCALE = [0, 2, 4, 7, 9] as const;

/** Индекс ноты для n-го тапа комбо (n ≥ 1). */
export function noteIndex(comboCount: number, noteCount: number, pingPong: boolean): number {
  if (noteCount <= 1) return 0;
  const i = Math.max(0, comboCount - 1);
  if (!pingPong) return i % noteCount;
  const period = 2 * (noteCount - 1);
  const p = i % period;
  return p < noteCount ? p : period - p;
}

export function noteFreq(index: number, baseFreq: number): number {
  const octave = Math.floor(index / SCALE.length);
  const step = SCALE[index % SCALE.length] ?? 0;
  return baseFreq * 2 ** (octave + step / 12);
}

export const SCALE_LENGTH = SCALE.length;
