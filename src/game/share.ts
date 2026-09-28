/** Pure share-text builder (offline; no network). */
export function buildWinShareText(layoutName: string, moves: number): string {
  const name = (layoutName || 'layout').trim() || 'layout';
  const n = Number.isFinite(moves) ? Math.max(0, Math.floor(moves)) : 0;
  return `MahjongCalm — cleared ${name} in ${n} moves`;
}
