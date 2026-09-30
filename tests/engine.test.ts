import { describe, expect, it } from 'vitest';
import {
  buildEvenFacePool,
  createGame,
  dealLayout,
  dealParityOk,
  facesMatch,
  findHintPair,
  hasLeftNeighbor,
  hasRightNeighbor,
  hasTileOnTop,
  isFree,
  listFree,
  selectTile,
  shuffleRemaining,
} from '../src/game/engine';
import type { LayoutDef, Tile } from '../src/game/types';
import { LAYOUTS, assertEvenLayouts } from '../src/layouts';

function tile(
  partial: Partial<Tile> & Pick<Tile, 'id' | 'x' | 'y' | 'z' | 'face'>,
): Tile {
  return { removed: false, ...partial };
}

describe('free-tile rule', () => {
  it('blocks when both left and right neighbors exist at same z', () => {
    const tiles = [
      tile({ id: 0, x: 0, y: 0, z: 0, face: 'a' }),
      tile({ id: 1, x: 2, y: 0, z: 0, face: 'b' }),
      tile({ id: 2, x: 4, y: 0, z: 0, face: 'c' }),
    ];
    expect(hasLeftNeighbor(tiles[1]!, tiles)).toBe(true);
    expect(hasRightNeighbor(tiles[1]!, tiles)).toBe(true);
    expect(isFree(tiles[1]!, tiles)).toBe(false);
    expect(isFree(tiles[0]!, tiles)).toBe(true);
    expect(isFree(tiles[2]!, tiles)).toBe(true);
  });

  it('blocks when a higher overlapping tile rests on top', () => {
    const tiles = [
      tile({ id: 0, x: 0, y: 0, z: 0, face: 'a' }),
      tile({ id: 1, x: 0, y: 0, z: 1, face: 'b' }),
    ];
    expect(hasTileOnTop(tiles[0]!, tiles)).toBe(true);
    expect(isFree(tiles[0]!, tiles)).toBe(false);
    expect(isFree(tiles[1]!, tiles)).toBe(true);
  });

  it('frees a side-blocked tile once one neighbor is removed', () => {
    const tiles = [
      tile({ id: 0, x: 0, y: 0, z: 0, face: 'a' }),
      tile({ id: 1, x: 2, y: 0, z: 0, face: 'b' }),
      tile({ id: 2, x: 4, y: 0, z: 0, face: 'c', removed: true }),
    ];
    expect(isFree(tiles[1]!, tiles)).toBe(true);
  });
});

describe('match + select', () => {
  it('matches same face ids and rejects different faces', () => {
    const a = tile({ id: 0, x: 0, y: 0, z: 0, face: 'c-teal' });
    const b = tile({ id: 1, x: 4, y: 0, z: 0, face: 'c-teal' });
    const c = tile({ id: 2, x: 8, y: 0, z: 0, face: 'sq-coral' });
    expect(facesMatch(a, b)).toBe(true);
    expect(facesMatch(a, c)).toBe(false);
  });

  it('selectTile removes a free matching pair and can win', () => {
    const layout: LayoutDef = {
      id: 'pair',
      name: 'Pair',
      tiles: [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
      ],
    };
    const state = createGame(layout, () => 0.1);
    // Force matching faces
    state.tiles[0]!.face = 'c-teal';
    state.tiles[1]!.face = 'c-teal';
    expect(selectTile(state, 0).kind).toBe('selected');
    const res = selectTile(state, 1);
    expect(res.kind).toBe('matched');
    if (res.kind === 'matched') expect(res.won).toBe(true);
    expect(state.won).toBe(true);
  });

  it('keeps mismatched tiles and moves intact, selects the new tile, and cancels on its second tap', () => {
    const layout: LayoutDef = {
      id: 'mismatch-cancel',
      name: 'Mismatch and cancel',
      tiles: [0, 4, 8, 12].map((x) => ({ x, y: 0, z: 0 })),
    };
    const state = createGame(layout, () => 0.1);
    state.tiles[0]!.face = 'c-teal';
    state.tiles[3]!.face = 'sq-coral';
    const beforeFaces = state.tiles.map((tile) => tile.face);

    expect(selectTile(state, 0)).toEqual({ kind: 'selected', id: 0 });
    expect(state.selectedId).toBe(0);
    expect(selectTile(state, 3)).toEqual({ kind: 'mismatch', id: 3 });
    expect(state.selectedId).toBe(3);
    expect(state.tiles.every((tile) => !tile.removed)).toBe(true);
    expect(state.tiles.map((tile) => tile.face)).toEqual(beforeFaces);
    expect(state.moves).toBe(0);

    expect(selectTile(state, 3)).toEqual({ kind: 'deselected' });
    expect(state.selectedId).toBeNull();
    expect(state.tiles.every((tile) => !tile.removed)).toBe(true);
    expect(state.moves).toBe(0);
  });
});

describe('deal parity', () => {
  it('buildEvenFacePool always returns even counts', () => {
    const pool = buildEvenFacePool(24, () => 0.42);
    expect(pool.length).toBe(24);
    expect(dealParityOk(pool)).toBe(true);
  });

  it('rejects odd tile counts', () => {
    expect(() => buildEvenFacePool(3)).toThrow(/even/);
  });

  it('every shipped layout has even tile count', () => {
    assertEvenLayouts();
    expect(LAYOUTS.length).toBeGreaterThanOrEqual(8);
    expect(LAYOUTS.length).toBeLessThanOrEqual(12);
    for (const l of LAYOUTS) {
      expect(l.tiles.length % 2).toBe(0);
    }
  });
});

describe('shuffle playability', () => {
  it('leaves a free matching pair available when two tiles are free', () => {
    const layout: LayoutDef = {
      id: 'line',
      name: 'Line',
      tiles: [0, 2, 4, 6].map((x) => ({ x, y: 0, z: 0 })),
    };
    const state = createGame(layout, () => 0.1);
    state.tiles.forEach((t, index) => {
      t.face = index % 2 === 0 ? 'c-teal' : 'sq-coral';
    });
    state.selectedId = 1;
    state.hintPair = [0, 3];
    const positions = state.tiles.map(({ x, y, z }) => ({ x, y, z }));

    expect(findHintPair(state)).toBeNull();
    expect(shuffleRemaining(state, () => 0)).toBe(true);
    expect(findHintPair(state)).not.toBeNull();
    expect(dealParityOk(state.tiles.map((t) => t.face))).toBe(true);
    expect(state.tiles.map(({ x, y, z }) => ({ x, y, z }))).toEqual(positions);
    expect(state.selectedId).toBeNull();
    expect(state.hintPair).toBeNull();
  });
});

describe('layout smoke', () => {
  it('keeps a matching free pair after shuffling every shipped layout', () => {
    for (const layout of LAYOUTS) {
      const state = createGame(layout, () => 0.3);
      expect(listFree(state.tiles).length).toBeGreaterThanOrEqual(2);
      expect(shuffleRemaining(state, () => 0)).toBe(true);
      expect(findHintPair(state)).not.toBeNull();
    }
  });

  it('deals meadow with parity and at least one free tile', () => {
    const meadow = LAYOUTS.find((l) => l.id === 'meadow');
    expect(meadow).toBeTruthy();
    const tiles = dealLayout(meadow!, () => 0.3);
    expect(dealParityOk(tiles.map((t) => t.face))).toBe(true);
    expect(listFree(tiles).length).toBeGreaterThan(0);
    const state = createGame(meadow!, () => 0.3);
    // hint may or may not exist depending on deal; shuffle keeps parity
    shuffleRemaining(state, () => 0.7);
    expect(dealParityOk(state.tiles.map((t) => t.face))).toBe(true);
    const pair = findHintPair(state);
    // after shuffle still consistent structure
    expect(state.tiles.length).toBe(meadow!.tiles.length);
    void pair;
  });
});
