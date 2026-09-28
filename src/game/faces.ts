/**
 * Original geometric tile faces — shapes + calm palette.
 * No Chinese characters, no licensed mahjong themes.
 */
import type { FaceId } from './types';

export interface FaceDef {
  id: FaceId;
  /** Primary fill */
  color: string;
  /** Accent / stroke */
  accent: string;
  /** Draw key for canvas renderer */
  shape:
    | 'circle'
    | 'square'
    | 'diamond'
    | 'triangle'
    | 'hex'
    | 'star'
    | 'cross'
    | 'ring'
    | 'bars'
    | 'dots'
    | 'wave'
    | 'petal';
}

export const FACES: readonly FaceDef[] = [
  { id: 'c-teal', color: '#2dd4bf', accent: '#0f766e', shape: 'circle' },
  { id: 'c-coral', color: '#fb7185', accent: '#be123c', shape: 'circle' },
  { id: 'c-amber', color: '#fbbf24', accent: '#b45309', shape: 'circle' },
  { id: 'c-violet', color: '#a78bfa', accent: '#6d28d9', shape: 'circle' },
  { id: 'sq-teal', color: '#14b8a6', accent: '#0f766e', shape: 'square' },
  { id: 'sq-coral', color: '#f43f5e', accent: '#9f1239', shape: 'square' },
  { id: 'sq-sky', color: '#38bdf8', accent: '#0369a1', shape: 'square' },
  { id: 'sq-lime', color: '#a3e635', accent: '#4d7c0f', shape: 'square' },
  { id: 'dm-indigo', color: '#818cf8', accent: '#3730a3', shape: 'diamond' },
  { id: 'dm-rose', color: '#f472b6', accent: '#9d174d', shape: 'diamond' },
  { id: 'dm-orange', color: '#fb923c', accent: '#c2410c', shape: 'diamond' },
  { id: 'dm-mint', color: '#5eead4', accent: '#0f766e', shape: 'diamond' },
  { id: 'tr-cyan', color: '#22d3ee', accent: '#0e7490', shape: 'triangle' },
  { id: 'tr-gold', color: '#facc15', accent: '#a16207', shape: 'triangle' },
  { id: 'tr-plum', color: '#c084fc', accent: '#7e22ce', shape: 'triangle' },
  { id: 'hx-blue', color: '#60a5fa', accent: '#1d4ed8', shape: 'hex' },
  { id: 'hx-green', color: '#4ade80', accent: '#15803d', shape: 'hex' },
  { id: 'st-amber', color: '#f59e0b', accent: '#92400e', shape: 'star' },
  { id: 'st-pink', color: '#ec4899', accent: '#9d174d', shape: 'star' },
  { id: 'cr-slate', color: '#94a3b8', accent: '#334155', shape: 'cross' },
  { id: 'rg-teal', color: '#2dd4bf', accent: '#115e59', shape: 'ring' },
  { id: 'br-violet', color: '#8b5cf6', accent: '#4c1d95', shape: 'bars' },
  { id: 'dt-coral', color: '#fb7185', accent: '#881337', shape: 'dots' },
  { id: 'wv-sky', color: '#0ea5e9', accent: '#075985', shape: 'wave' },
  { id: 'pt-rose', color: '#e11d48', accent: '#881337', shape: 'petal' },
  { id: 'pt-lime', color: '#84cc16', accent: '#3f6212', shape: 'petal' },
] as const;

export const FACE_BY_ID: ReadonlyMap<FaceId, FaceDef> = new Map(
  FACES.map((f) => [f.id, f]),
);

export function faceIds(): FaceId[] {
  return FACES.map((f) => f.id);
}
