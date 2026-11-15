import { describe, expect, it } from 'vitest';
import { noteFreq, noteIndex } from './pentatonic';

describe('pentatonic', () => {
  it('ping-pong по двум октавам', () => {
    const seq = Array.from({ length: 20 }, (_, i) => noteIndex(i + 1, 10, true));
    expect(seq).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 1]);
  });

  it('по кругу без ping-pong', () => {
    expect(noteIndex(11, 10, false)).toBe(0);
  });

  it('частоты C-D-E-G-A', () => {
    expect(noteFreq(0, 440)).toBeCloseTo(440);
    expect(noteFreq(3, 440)).toBeCloseTo(440 * 2 ** (7 / 12));
    expect(noteFreq(5, 440)).toBeCloseTo(880);
  });
});
