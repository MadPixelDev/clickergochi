import { describe, expect, it } from 'vitest';
import { formatGain, formatNumber } from './format';

describe('formatNumber', () => {
  it('сокращает', () => {
    expect(formatNumber(950.7)).toBe('950');
    expect(formatNumber(1234)).toBe('1.2K');
    expect(formatNumber(3_400_000)).toBe('3.4M');
    expect(formatNumber(125_000)).toBe('125K');
  });
  it('формат прироста', () => {
    expect(formatGain(1)).toBe('+1');
    expect(formatGain(1.2)).toBe('+1.2');
    expect(formatGain(12.4)).toBe('+12');
  });
});
