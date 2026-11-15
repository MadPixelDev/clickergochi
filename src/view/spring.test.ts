import { describe, expect, it } from 'vitest';
import { Spring } from './spring';

describe('Spring', () => {
  it('stiffness 300 / damping 12: overshoot и успокоение ~за 250–400 мс', () => {
    const s = new Spring();
    s.snap(1);
    let min = 1;
    let t = 0;
    while (t < 0.4) {
      s.step(1 / 60, 300, 12);
      min = Math.min(min, s.x);
      t += 1 / 60;
    }
    expect(min).toBeLessThan(0); // overshoot
    expect(Math.abs(s.x)).toBeLessThan(0.15);
  });

  it('стабильна на длинном кадре', () => {
    const s = new Spring();
    s.snap(1);
    s.step(0.5, 900, 12);
    expect(Number.isFinite(s.x)).toBe(true);
    expect(Math.abs(s.x)).toBeLessThan(1);
  });
});
