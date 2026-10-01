import { describe, expect, it } from 'vitest';
import { cloneGameState } from '../src/game/undo';
import type { GameState } from '../src/game/types';

describe('undo snapshots', () => {
  it('copies tiles and hint pairs so later gameplay mutations cannot alter the snapshot', () => {
    const state: GameState = {
      layoutId: 'undo-test',
      tiles: [
        { id: 1, x: 0, y: 0, z: 0, face: 'c-teal', removed: false },
        { id: 2, x: 4, y: 0, z: 0, face: 'c-teal', removed: false },
      ],
      selectedId: 1,
      hintPair: [1, 2],
      moves: 3,
      won: false,
    };

    const snapshot = cloneGameState(state);
    state.tiles[0]!.removed = true;
    state.tiles[0]!.face = 'sq-coral';
    state.hintPair![0] = 2;
    state.moves += 1;

    expect(snapshot.tiles[0]).toMatchObject({ id: 1, face: 'c-teal', removed: false });
    expect(snapshot.tiles[0]).not.toBe(state.tiles[0]);
    expect(snapshot.hintPair).toEqual([1, 2]);
    expect(snapshot.hintPair).not.toBe(state.hintPair);
    expect(snapshot.moves).toBe(3);
  });
});
