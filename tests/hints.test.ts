import { describe, expect, it } from 'vitest';
import {
  FREE_HINTS,
  formatHintStock,
  freeHintsRemaining,
  resolveHintRequest,
} from '../src/game/hints';
import { createGame } from '../src/game/engine';
import type { LayoutDef } from '../src/game/types';

function hintState(matching: boolean) {
  const layout: LayoutDef = {
    id: 'hint-flow',
    name: 'Hint flow',
    tiles: [
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 0, z: 0 },
    ],
  };
  const state = createGame(layout, () => 0.1);
  state.tiles[0]!.face = 'c-teal';
  state.tiles[1]!.face = matching ? 'c-teal' : 'sq-coral';
  return state;
}

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

  it('does not offer or consume hint access when no free matching pair exists', () => {
    const state = hintState(false);

    expect(resolveHintRequest(state, 0, false)).toEqual({ kind: 'unavailable' });
    expect(resolveHintRequest(state, FREE_HINTS, false)).toEqual({
      kind: 'unavailable',
    });
    expect(resolveHintRequest(state, FREE_HINTS, true)).toEqual({
      kind: 'unavailable',
    });
    expect(state.hintPair).toBeNull();
  });

  it('offers free, rewarded, or unlimited access only for an available pair', () => {
    const state = hintState(true);

    expect(resolveHintRequest(state, 0, false)).toEqual({
      kind: 'free',
      pair: [0, 1],
    });
    expect(resolveHintRequest(state, FREE_HINTS, false)).toEqual({
      kind: 'rewarded',
      pair: [0, 1],
    });
    expect(resolveHintRequest(state, FREE_HINTS, true)).toEqual({
      kind: 'unlimited',
      pair: [0, 1],
    });
  });
});
