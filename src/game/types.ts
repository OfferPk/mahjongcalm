/** Half-unit grid: each tile covers [x, x+TILE_W) × [y, y+TILE_H). */
export const TILE_W = 2;
export const TILE_H = 2;

/** Geometric face id (abstract shapes/colors — no licensed mahjong art). */
export type FaceId = string;

export interface LayoutTileSpec {
  x: number;
  y: number;
  z: number;
  /** null = assigned at deal time */
  face?: FaceId | null;
}

export interface LayoutDef {
  id: string;
  name: string;
  description?: string;
  tiles: LayoutTileSpec[];
}

export interface Tile {
  /** Stable instance id for this deal */
  id: number;
  x: number;
  y: number;
  z: number;
  face: FaceId;
  removed: boolean;
}

export interface GameState {
  layoutId: string;
  tiles: Tile[];
  selectedId: number | null;
  hintPair: [number, number] | null;
  moves: number;
  won: boolean;
}

export interface PersistState {
  clearedLayouts: string[];
  mute: boolean;
  adsRemoved: boolean;
  freeHintsUsed: number;
}
