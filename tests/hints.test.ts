import { describe, expect, it } from 'vitest';
import {
  FREE_HINTS,
  formatHintStock,
  freeHintsRemaining,
} from '../src/game/hints';

describe('hint stock math', () => {
  it('freeHintsRemaining clamps and subtracts used', () => {
    expect(freeHintsRemaining(0)).toBe(FREE_HINTS);
    expect(freeHintsRemaining(1)).toBe(2);
    expect(freeHintsRemaining(3)).toBe(0);
    expect(freeHintsRemaining(99)).toBe(0);
    expect(freeHintsRemaining(-1)).toBe(FREE_HINTS);
  });

  it('formatHintStock: free / ad / unlimited', () => {
    expect(formatHintStock(0, false)).toBe('Hints: 3 free left');
    expect(formatHintStock(1, false)).toBe('Hints: 2 free left');
    expect(formatHintStock(3, false)).toBe('Hints: ad');
    expect(formatHintStock(5, false)).toBe('Hints: ad');
    expect(formatHintStock(0, true)).toBe('Hints: unlimited');
    expect(formatHintStock(99, true)).toBe('Hints: unlimited');
  });
});
