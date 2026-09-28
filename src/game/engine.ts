/**
 * MahjongCalm free-tile + match engine.
 *
 * Free-tile rule (classic turtle solitaire — also documented in README):
 * A remaining tile is free if and only if:
 *   1. Nothing rests on top of it (no remaining tile at higher z whose
 *      footprint overlaps this tile), AND
 *   2. At least one of left or right side is open (no remaining same-z
 *      neighbor whose footprint touches that side with overlapping Y).
 */
import { FACES } from './faces';
import type { FaceId, GameState, LayoutDef, Tile } from './types';
import { TILE_H, TILE_W } from './types';

function rectsOverlap(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  return ax < bx + TILE_W && ax + TILE_W > bx && ay < by + TILE_H && ay + TILE_H > by;
}

function yOverlap(ay: number, by: number): boolean {
  return ay < by + TILE_H && ay + TILE_H > by;
}

/** True if `upper` rests on `lower` (higher z + footprint overlap). */
export function isOnTopOf(upper: Tile, lower: Tile): boolean {
  if (upper.removed || lower.removed) return false;
  if (upper.z <= lower.z) return false;
  return rectsOverlap(upper.x, upper.y, lower.x, lower.y);
}

export function hasTileOnTop(tile: Tile, all: readonly Tile[]): boolean {
  if (tile.removed) return false;
  return all.some((t) => t.id !== tile.id && isOnTopOf(t, tile));
}

/** Same-z left neighbor whose right edge touches this tile's left. */
export function hasLeftNeighbor(tile: Tile, all: readonly Tile[]): boolean {
  if (tile.removed) return false;
  return all.some(
    (t) =>
      !t.removed &&
      t.id !== tile.id &&
      t.z === tile.z &&
      t.x + TILE_W === tile.x &&
      yOverlap(t.y, tile.y),
  );
}

export function hasRightNeighbor(tile: Tile, all: readonly Tile[]): boolean {
  if (tile.removed) return false;
  return all.some(
    (t) =>
      !t.removed &&
      t.id !== tile.id &&
      t.z === tile.z &&
      t.x === tile.x + TILE_W &&
      yOverlap(t.y, tile.y),
  );
}

export function isFree(tile: Tile, all: readonly Tile[]): boolean {
  if (tile.removed) return false;
  if (hasTileOnTop(tile, all)) return false;
  const left = hasLeftNeighbor(tile, all);
  const right = hasRightNeighbor(tile, all);
  return !(left && right);
}

export function listFree(tiles: readonly Tile[]): Tile[] {
  return tiles.filter((t) => isFree(t, tiles));
}

export function facesMatch(a: Tile, b: Tile): boolean {
  return a.id !== b.id && !a.removed && !b.removed && a.face === b.face;
}

/** Build an even multiset of faces large enough for `count` tiles. */
export function buildEvenFacePool(count: number, rng: () => number = Math.random): FaceId[] {
  if (count < 0 || count % 2 !== 0) {
    throw new Error(`Tile count must be even (got ${count})`);
  }
  const ids = FACES.map((f) => f.id);
  const pool: FaceId[] = [];
  let i = 0;
  while (pool.length < count) {
    const face = ids[i % ids.length]!;
    pool.push(face, face);
    i++;
  }
  // Fisher–Yates
  for (let j = pool.length - 1; j > 0; j--) {
    const k = Math.floor(rng() * (j + 1));
    const tmp = pool[j]!;
    pool[j] = pool[k]!;
    pool[k] = tmp;
  }
  return pool;
}

/** Count of each face in a list must be even. */
export function dealParityOk(faces: readonly FaceId[]): boolean {
  const counts = new Map<FaceId, number>();
  for (const f of faces) {
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  for (const n of counts.values()) {
    if (n % 2 !== 0) return false;
  }
  return true;
}

export function dealLayout(
  layout: LayoutDef,
  rng: () => number = Math.random,
): Tile[] {
  const n = layout.tiles.length;
  if (n % 2 !== 0) {
    throw new Error(`Layout ${layout.id} has odd tile count (${n})`);
  }
  const faces = buildEvenFacePool(n, rng);
  return layout.tiles.map((spec, i) => ({
    id: i,
    x: spec.x,
    y: spec.y,
    z: spec.z,
    face: spec.face ?? faces[i]!,
    removed: false,
  }));
}

export function createGame(layout: LayoutDef, rng?: () => number): GameState {
  const tiles = dealLayout(layout, rng);
  if (!dealParityOk(tiles.map((t) => t.face))) {
    throw new Error('Deal parity failed');
  }
  return {
    layoutId: layout.id,
    tiles,
    selectedId: null,
    hintPair: null,
    moves: 0,
    won: false,
  };
}

export function remainingCount(state: GameState): number {
  return state.tiles.filter((t) => !t.removed).length;
}

export function checkWin(state: GameState): boolean {
  return remainingCount(state) === 0;
}

export type SelectResult =
  | { kind: 'selected'; id: number }
  | { kind: 'deselected' }
  | { kind: 'matched'; a: number; b: number; won: boolean }
  | { kind: 'mismatch'; id: number }
  | { kind: 'blocked'; id: number }
  | { kind: 'ignored' };

export function selectTile(state: GameState, tileId: number): SelectResult {
  if (state.won) return { kind: 'ignored' };
  const tile = state.tiles.find((t) => t.id === tileId);
  if (!tile || tile.removed) return { kind: 'ignored' };
  if (!isFree(tile, state.tiles)) return { kind: 'blocked', id: tileId };

  state.hintPair = null;

  if (state.selectedId === null) {
    state.selectedId = tileId;
    return { kind: 'selected', id: tileId };
  }

  if (state.selectedId === tileId) {
    state.selectedId = null;
    return { kind: 'deselected' };
  }

  const other = state.tiles.find((t) => t.id === state.selectedId);
  if (!other || other.removed) {
    state.selectedId = tileId;
    return { kind: 'selected', id: tileId };
  }

  if (facesMatch(tile, other)) {
    tile.removed = true;
    other.removed = true;
    state.selectedId = null;
    state.moves += 1;
    state.won = checkWin(state);
    return { kind: 'matched', a: other.id, b: tile.id, won: state.won };
  }

  // Mismatch: select the new tile instead
  state.selectedId = tileId;
  return { kind: 'mismatch', id: tileId };
}

/** Find one valid free matching pair, or null. */
export function findHintPair(state: GameState): [number, number] | null {
  const free = listFree(state.tiles);
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      const a = free[i]!;
      const b = free[j]!;
      if (a.face === b.face) return [a.id, b.id];
    }
  }
  return null;
}

export function applyHint(state: GameState): [number, number] | null {
  const pair = findHintPair(state);
  state.hintPair = pair;
  return pair;
}

/**
 * Shuffle remaining tile faces in place (positions/stack unchanged).
 * Keeps even parity. Returns true if shuffled.
 */
export function shuffleRemaining(
  state: GameState,
  rng: () => number = Math.random,
): boolean {
  if (state.won) return false;
  const live = state.tiles.filter((t) => !t.removed);
  if (live.length < 2) return false;
  const faces = live.map((t) => t.face);
  for (let j = faces.length - 1; j > 0; j--) {
    const k = Math.floor(rng() * (j + 1));
    const tmp = faces[j]!;
    faces[j] = faces[k]!;
    faces[k] = tmp;
  }
  live.forEach((t, i) => {
    t.face = faces[i]!;
  });
  state.selectedId = null;
  state.hintPair = null;
  return true;
}

/** Topmost tile under board point (grid coords), for hit-testing. */
export function hitTest(
  tiles: readonly Tile[],
  gx: number,
  gy: number,
): Tile | null {
  let best: Tile | null = null;
  for (const t of tiles) {
    if (t.removed) continue;
    if (gx >= t.x && gx < t.x + TILE_W && gy >= t.y && gy < t.y + TILE_H) {
      if (!best || t.z > best.z || (t.z === best.z && t.id > best.id)) {
        best = t;
      }
    }
  }
  return best;
}

export function boardBounds(tiles: readonly Tile[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  maxZ: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = 0;
  for (const t of tiles) {
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + TILE_W);
    maxY = Math.max(maxY, t.y + TILE_H);
    maxZ = Math.max(maxZ, t.z);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 2, maxY: 2, maxZ: 0 };
  }
  return { minX, minY, maxX, maxY, maxZ };
}
