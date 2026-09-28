import type { LayoutDef, LayoutTileSpec } from '../game/types';

/** Helper: tile at half-unit coords (tile footprint 2×2). */
function t(x: number, y: number, z: number): LayoutTileSpec {
  return { x, y, z, face: null };
}

/** Axis-aligned rectangle of tiles (steps of 2). */
function rect(
  x0: number,
  y0: number,
  cols: number,
  rows: number,
  z: number,
): LayoutTileSpec[] {
  const out: LayoutTileSpec[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push(t(x0 + c * 2, y0 + r * 2, z));
    }
  }
  return out;
}

export const LAYOUTS: readonly LayoutDef[] = [
  {
    id: 'turtle-lite',
    name: 'Calm Turtle',
    description: 'Lite turtle silhouette with a calm central stack.',
    tiles: [
      ...rect(2, 2, 4, 3, 0),
      t(10, 4, 0),
      t(0, 4, 0),
      t(2, 0, 0),
      t(8, 0, 0),
      t(2, 8, 0),
      t(8, 8, 0),
      ...rect(4, 3, 2, 2, 1),
      t(3, 4, 1),
      t(7, 4, 1),
      t(5, 2, 1),
      t(5, 6, 1),
      t(5, 4, 2),
      t(5, 4, 3),
    ],
  },
  {
    id: 'pyramid',
    name: 'Pyramid',
    description: 'Stepped pyramid rising to a twin peak.',
    tiles: [
      ...rect(0, 0, 4, 4, 0),
      ...rect(1, 1, 3, 2, 1),
      ...rect(2, 2, 2, 2, 2),
      t(3, 3, 3),
      t(3, 3, 4),
    ],
  },
  {
    id: 'bridge',
    name: 'Bridge',
    description: 'Twin piers with a connecting span.',
    tiles: [
      ...rect(0, 0, 2, 3, 0),
      ...rect(8, 0, 2, 3, 0),
      ...rect(3, 2, 2, 1, 0),
      ...rect(0, 0, 2, 2, 1),
      ...rect(8, 0, 2, 2, 1),
      t(4, 2, 1),
      t(4, 2, 2),
    ],
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Diamond outline with a sparkling center.',
    tiles: [
      t(4, 0, 0),
      t(2, 2, 0),
      t(4, 2, 0),
      t(6, 2, 0),
      t(0, 4, 0),
      t(2, 4, 0),
      t(4, 4, 0),
      t(6, 4, 0),
      t(8, 4, 0),
      t(2, 6, 0),
      t(4, 6, 0),
      t(6, 6, 0),
      t(4, 8, 0),
      t(4, 4, 1),
      t(3, 3, 1),
      t(5, 3, 1),
      t(3, 5, 1),
      t(5, 5, 1),
      t(4, 4, 2),
      t(4, 4, 3),
    ],
  },
  {
    id: 'fortress',
    name: 'Fortress',
    description: 'Walled courtyard with corner towers.',
    tiles: [
      ...rect(0, 0, 5, 1, 0),
      ...rect(0, 8, 5, 1, 0),
      t(0, 2, 0),
      t(0, 4, 0),
      t(0, 6, 0),
      t(8, 2, 0),
      t(8, 4, 0),
      t(8, 6, 0),
      t(0, 0, 1),
      t(8, 0, 1),
      t(0, 8, 1),
      t(8, 8, 1),
      t(0, 0, 2),
      t(8, 0, 2),
      t(0, 8, 2),
      t(8, 8, 2),
      ...rect(2, 2, 3, 2, 0),
      t(4, 4, 1),
      t(4, 4, 2),
    ],
  },
  {
    id: 'steps',
    name: 'Steps',
    description: 'Ascending steps — clear from the open sides.',
    tiles: [
      ...rect(0, 0, 2, 1, 0),
      ...rect(0, 2, 3, 1, 0),
      ...rect(0, 4, 4, 1, 0),
      ...rect(0, 6, 5, 1, 0),
      ...rect(0, 2, 2, 1, 1),
      ...rect(0, 4, 3, 1, 1),
      ...rect(0, 6, 3, 1, 1),
      t(0, 6, 2),
      t(2, 6, 2),
    ],
  },
  {
    id: 'twin-peaks',
    name: 'Twin Peaks',
    description: 'Two peaks rising from a shared base.',
    tiles: [
      ...rect(0, 2, 6, 2, 0),
      ...rect(1, 1, 2, 2, 1),
      ...rect(7, 1, 2, 2, 1),
      t(2, 2, 2),
      t(2, 2, 3),
      t(8, 2, 2),
      t(8, 2, 3),
      t(4, 2, 1),
      t(6, 2, 1),
    ],
  },
  {
    id: 'ring',
    name: 'Ring',
    description: 'A calm ring — open center, free edges.',
    tiles: [
      ...rect(2, 0, 3, 1, 0),
      ...rect(2, 8, 3, 1, 0),
      t(0, 2, 0),
      t(0, 4, 0),
      t(0, 6, 0),
      t(8, 2, 0),
      t(8, 4, 0),
      t(8, 6, 0),
      t(1, 1, 0),
      t(7, 1, 0),
      t(1, 7, 0),
      t(7, 7, 0),
      t(2, 0, 1),
      t(4, 0, 1),
      t(6, 0, 1),
      t(2, 8, 1),
      t(4, 8, 1),
      t(6, 8, 1),
      t(0, 4, 1),
      t(8, 4, 1),
    ],
  },
  {
    id: 'cross',
    name: 'Cross',
    description: 'A plus of tiles with a stacked heart.',
    tiles: [
      ...rect(4, 0, 1, 5, 0),
      t(0, 4, 0),
      t(2, 4, 0),
      t(6, 4, 0),
      t(8, 4, 0),
      t(4, 4, 1),
      t(4, 2, 1),
      t(4, 6, 1),
      t(2, 4, 1),
      t(6, 4, 1),
      t(4, 4, 2),
      t(4, 4, 3),
      t(3, 3, 1),
      t(5, 3, 1),
      t(3, 5, 1),
      t(5, 5, 1),
    ],
  },
  {
    id: 'lotus',
    name: 'Lotus',
    description: 'Petal ring around a calm center.',
    tiles: [
      t(4, 4, 0),
      t(4, 4, 1),
      t(4, 0, 0),
      t(4, 8, 0),
      t(0, 4, 0),
      t(8, 4, 0),
      t(1, 1, 0),
      t(7, 1, 0),
      t(1, 7, 0),
      t(7, 7, 0),
      t(2, 2, 0),
      t(6, 2, 0),
      t(2, 6, 0),
      t(6, 6, 0),
      t(3, 3, 1),
      t(5, 3, 1),
      t(3, 5, 1),
      t(5, 5, 1),
      t(4, 2, 1),
      t(4, 6, 1),
      t(2, 4, 1),
      t(6, 4, 1),
    ],
  },
  {
    id: 'hourglass',
    name: 'Hourglass',
    description: 'Wide top and base, narrow waist.',
    tiles: [
      ...rect(0, 0, 4, 1, 0),
      ...rect(1, 2, 3, 1, 0),
      ...rect(2, 4, 2, 1, 0),
      ...rect(1, 6, 3, 1, 0),
      ...rect(0, 8, 4, 1, 0),
      t(2, 2, 1),
      t(4, 2, 1),
      t(2, 6, 1),
      t(4, 6, 1),
    ],
  },
  {
    id: 'meadow',
    name: 'Meadow',
    description: 'Open field — gentle starter layout.',
    tiles: [
      ...rect(0, 0, 4, 2, 0),
      ...rect(1, 1, 2, 1, 1),
      ...rect(0, 4, 4, 1, 0),
      t(2, 4, 1),
      t(4, 4, 1),
    ],
  },
];

export function getLayout(id: string): LayoutDef | undefined {
  return LAYOUTS.find((l) => l.id === id);
}

export function assertEvenLayouts(): void {
  for (const l of LAYOUTS) {
    if (l.tiles.length % 2 !== 0) {
      throw new Error(`Layout ${l.id} has odd count ${l.tiles.length}`);
    }
  }
}
