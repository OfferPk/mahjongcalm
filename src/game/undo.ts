import type { GameState } from './types';

/** Copy every mutable part of a game state for a one-step history snapshot. */
export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    tiles: state.tiles.map((tile) => ({ ...tile })),
    hintPair: state.hintPair ? [...state.hintPair] as [number, number] : null,
  };
}

export interface MatchHistory {
  undoState: GameState | null;
  redoState: GameState | null;
}

export function createMatchHistory(): MatchHistory {
  return { undoState: null, redoState: null };
}

/** Forget both directions when a shuffle or a different layout starts. */
export function clearMatchHistory(history: MatchHistory): void {
  history.undoState = null;
  history.redoState = null;
}

/** Store the state before a successful match and invalidate any old Redo. */
export function recordMatch(
  history: MatchHistory,
  beforeMatch: GameState | null,
  afterMatch: GameState,
): void {
  history.undoState = beforeMatch && !afterMatch.won
    ? cloneGameState(beforeMatch)
    : null;
  history.redoState = null;
}

/** Restore the previous pre-match state and retain the matched state for Redo. */
export function takeUndo(
  history: MatchHistory,
  currentState: GameState,
): GameState | null {
  if (currentState.won || !history.undoState) return null;
  const restored = history.undoState;
  history.undoState = null;
  history.redoState = cloneGameState(currentState);
  return restored;
}

/** Restore the most recently undone match and make that same match undoable. */
export function takeRedo(
  history: MatchHistory,
  currentState: GameState,
): GameState | null {
  if (currentState.won || !history.redoState) return null;
  const restored = history.redoState;
  history.redoState = null;
  history.undoState = cloneGameState(currentState);
  return restored;
}
