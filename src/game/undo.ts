import type { GameState } from './types';

/** Copy every mutable part of a game state for a one-step undo snapshot. */
export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    tiles: state.tiles.map((tile) => ({ ...tile })),
    hintPair: state.hintPair ? [...state.hintPair] as [number, number] : null,
  };
}
