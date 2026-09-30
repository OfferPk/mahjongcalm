import { findHintPair } from './engine';
import type { GameState } from './types';

/** Free hints before rewarded stub; kept aligned with play HUD. */
export const FREE_HINTS = 3;

/** How many free hints remain before ads/rewarded. */
export function freeHintsRemaining(
  freeHintsUsed: number,
  freeLimit: number = FREE_HINTS,
): number {
  return Math.max(0, freeLimit - Math.max(0, freeHintsUsed));
}

/**
 * Play HUD hint stock label.
 * - adsRemoved → unlimited (rewarded stub skips)
 * - free left → "Hints: N free left"
 * - exhausted → "Hints: ad"
 */
export function formatHintStock(
  freeHintsUsed: number,
  adsRemoved: boolean,
  freeLimit: number = FREE_HINTS,
): string {
  if (adsRemoved) return 'Hints: unlimited';
  const left = freeHintsRemaining(freeHintsUsed, freeLimit);
  if (left > 0) return `Hints: ${left} free left`;
  return 'Hints: ad';
}

export type HintRequest =
  | { kind: 'unavailable' }
  | { kind: 'free' | 'unlimited' | 'rewarded'; pair: [number, number] };

/** Decide hint access only when a valid free matching pair exists. */
export function resolveHintRequest(
  state: GameState,
  freeHintsUsed: number,
  adsRemoved: boolean,
): HintRequest {
  const pair = findHintPair(state);
  if (!pair) return { kind: 'unavailable' };
  if (adsRemoved) return { kind: 'unlimited', pair };
  if (freeHintsRemaining(freeHintsUsed) > 0) return { kind: 'free', pair };
  return { kind: 'rewarded', pair };
}
