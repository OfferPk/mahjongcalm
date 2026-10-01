import { describe, expect, it } from 'vitest';
import { createGame, remainingCount, selectTile, shuffleRemaining } from '../src/game/engine';
import { cloneGameState, clearMatchHistory, createMatchHistory, recordMatch, takeRedo, takeUndo } from '../src/game/undo';
import type { GameState, LayoutDef } from '../src/game/types';

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

const pairLayout: LayoutDef = {
  id: 'history-test',
  name: 'History test',
  tiles: [0, 4, 8, 12].map((x) => ({ x, y: 0, z: 0 })),
};

function makeState(): GameState {
  const state = createGame(pairLayout, () => 0.1);
  state.tiles[0]!.face = 'c-teal';
  state.tiles[1]!.face = 'c-teal';
  state.tiles[2]!.face = 'sq-coral';
  state.tiles[3]!.face = 'sq-coral';
  return state;
}

function matchPair(history: ReturnType<typeof createMatchHistory>, state: GameState, firstId: number, secondId: number): void {
  expect(selectTile(state, firstId).kind).toBe('selected');
  const beforeMatch = cloneGameState(state);
  const result = selectTile(state, secondId);
  expect(result.kind).toBe('matched');
  recordMatch(history, beforeMatch, state);
}

describe('one-step Undo and Redo', () => {
  it('round-trips the board, tile removal, and move count, and makes Redo undoable again', () => {
    const history = createMatchHistory();
    const state = makeState();
    matchPair(history, state, 0, 1);
    const matched = cloneGameState(state);

    expect(remainingCount(state)).toBe(2);
    expect(state.moves).toBe(1);
    expect(state.tiles.filter((tile) => tile.removed).map((tile) => tile.id)).toEqual([0, 1]);

    const undone = takeUndo(history, state);
    expect(undone).not.toBeNull();
    expect(undone!.tiles).toEqual(makeState().tiles);
    expect(undone!.tiles.filter((tile) => tile.removed)).toHaveLength(0);
    expect(remainingCount(undone!)).toBe(4);
    expect(undone!.moves).toBe(0);
    expect(history.undoState).toBeNull();
    expect(history.redoState).toEqual(matched);

    const redone = takeRedo(history, undone!);
    expect(redone).not.toBeNull();
    expect(redone!.tiles).toEqual(matched.tiles);
    expect(redone!.tiles.filter((tile) => tile.removed).map((tile) => tile.id)).toEqual([0, 1]);
    expect(remainingCount(redone!)).toBe(2);
    expect(redone!.moves).toBe(1);
    expect(history.redoState).toBeNull();
    expect(history.undoState).toEqual(undone);
  });

  it('clears Redo when a different successful match is made after Undo', () => {
    const history = createMatchHistory();
    const state = makeState();
    matchPair(history, state, 0, 1);

    const undone = takeUndo(history, state)!;
    expect(history.redoState).not.toBeNull();
    undone.selectedId = null;
    undone.tiles[2]!.face = 'c-amber';
    undone.tiles[3]!.face = 'c-amber';
    matchPair(history, undone, 2, 3);

    expect(undone.tiles.filter((tile) => tile.removed).map((tile) => tile.id)).toEqual([2, 3]);
    expect(remainingCount(undone)).toBe(2);
    expect(undone.moves).toBe(1);
    expect(history.redoState).toBeNull();
    expect(takeRedo(history, undone)).toBeNull();
  });

  it('clears both history directions when Shuffle invalidates the board history', () => {
    const history = createMatchHistory();
    const state = makeState();
    matchPair(history, state, 0, 1);
    const undone = takeUndo(history, state)!;
    const moves = undone.moves;
    expect(history.redoState).not.toBeNull();

    clearMatchHistory(history);
    expect(shuffleRemaining(undone, () => 0)).toBe(true);
    expect(history.undoState).toBeNull();
    expect(history.redoState).toBeNull();
    expect(takeRedo(history, undone)).toBeNull();
    expect(remainingCount(undone)).toBe(4);
    expect(undone.moves).toBe(moves);
  });

  it('clears both history directions when a different layout starts', () => {
    const history = createMatchHistory();
    const oldState = makeState();
    matchPair(history, oldState, 0, 1);
    takeUndo(history, oldState);
    expect(history.redoState).not.toBeNull();

    clearMatchHistory(history);
    const newState = createGame({
      ...pairLayout,
      id: 'next-layout',
      name: 'Next layout',
      tiles: pairLayout.tiles.slice(0, 2),
    }, () => 0.1);

    expect(newState.layoutId).toBe('next-layout');
    expect(history.undoState).toBeNull();
    expect(history.redoState).toBeNull();
    expect(takeRedo(history, newState)).toBeNull();
  });
});
