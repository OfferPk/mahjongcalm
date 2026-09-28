import { FACE_BY_ID } from '../game/faces';
import {
  boardBounds,
  hitTest,
  isFree,
} from '../game/engine';
import type { GameState, Tile } from '../game/types';
import { TILE_H, TILE_W } from '../game/types';

const PAD = 16;
const DEPTH_X = 4;
const DEPTH_Y = 4;

export interface RenderOpts {
  canvas: HTMLCanvasElement;
  state: GameState;
}

function tilePixelSize(canvas: HTMLCanvasElement, state: GameState): {
  tw: number;
  th: number;
  ox: number;
  oy: number;
  scale: number;
} {
  const b = boardBounds(state.tiles);
  const gw = b.maxX - b.minX;
  const gh = b.maxY - b.minY;
  const availW = canvas.clientWidth - PAD * 2 - DEPTH_X * (b.maxZ + 1);
  const availH = canvas.clientHeight - PAD * 2 - DEPTH_Y * (b.maxZ + 1);
  const scale = Math.max(8, Math.min(availW / gw, availH / gh));
  const tw = TILE_W * scale;
  const th = TILE_H * scale;
  const boardW = gw * scale + DEPTH_X * (b.maxZ + 1);
  const boardH = gh * scale + DEPTH_Y * (b.maxZ + 1);
  const ox = (canvas.clientWidth - boardW) / 2 - b.minX * scale;
  const oy = (canvas.clientHeight - boardH) / 2 - b.minY * scale;
  return { tw, th, ox, oy, scale };
}

function tileScreenPos(
  tile: Tile,
  ox: number,
  oy: number,
  scale: number,
): { x: number; y: number } {
  return {
    x: ox + tile.x * scale + tile.z * DEPTH_X,
    y: oy + tile.y * scale - tile.z * DEPTH_Y,
  };
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  shape: string,
  fill: string,
  accent: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1.5, r * 0.08);

  switch (shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'square':
      ctx.fillRect(-r * 0.55, -r * 0.55, r * 1.1, r * 1.1);
      ctx.strokeRect(-r * 0.55, -r * 0.55, r * 1.1, r * 1.1);
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.75);
      ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(0, r * 0.75);
      ctx.lineTo(-r * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.75);
      ctx.lineTo(r * 0.75, r * 0.65);
      ctx.lineTo(-r * 0.75, r * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'hex': {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const x = Math.cos(a) * r * 0.7;
        const y = Math.sin(a) * r * 0.7;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'star': {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r * 0.75 : r * 0.35;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'cross':
      ctx.fillRect(-r * 0.2, -r * 0.7, r * 0.4, r * 1.4);
      ctx.fillRect(-r * 0.7, -r * 0.2, r * 1.4, r * 0.4);
      break;
    case 'ring':
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bars':
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(-r * 0.65, i * r * 0.35 - r * 0.12, r * 1.3, r * 0.24);
      }
      break;
    case 'dots':
      for (const [dx, dy] of [
        [-0.35, -0.35],
        [0.35, -0.35],
        [0, 0],
        [-0.35, 0.35],
        [0.35, 0.35],
      ] as const) {
        ctx.beginPath();
        ctx.arc(dx * r, dy * r, r * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'wave':
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, 0);
      ctx.quadraticCurveTo(-r * 0.35, -r * 0.5, 0, 0);
      ctx.quadraticCurveTo(r * 0.35, r * 0.5, r * 0.7, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, r * 0.35);
      ctx.quadraticCurveTo(-r * 0.35, -r * 0.15, 0, r * 0.35);
      ctx.quadraticCurveTo(r * 0.35, r * 0.85, r * 0.7, r * 0.35);
      ctx.stroke();
      break;
    case 'petal':
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((Math.PI / 2) * i);
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.35, r * 0.28, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  state: GameState,
  ox: number,
  oy: number,
  scale: number,
): void {
  const { x, y } = tileScreenPos(tile, ox, oy, scale);
  const w = TILE_W * scale;
  const h = TILE_H * scale;
  const free = isFree(tile, state.tiles);
  const selected = state.selectedId === tile.id;
  const hinted =
    state.hintPair !== null &&
    (state.hintPair[0] === tile.id || state.hintPair[1] === tile.id);

  // depth shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.fillRect(x + 3, y + 3, w, h);

  // body
  const face = FACE_BY_ID.get(tile.face);
  const base = free ? '#f8fafc' : '#cbd5e1';
  ctx.fillStyle = base;
  ctx.strokeStyle = selected
    ? '#fbbf24'
    : hinted
      ? '#34d399'
      : free
        ? '#94a3b8'
        : '#64748b';
  ctx.lineWidth = selected || hinted ? 3 : 1.5;
  roundRect(ctx, x, y, w, h, Math.min(8, scale * 0.3));
  ctx.fill();
  ctx.stroke();

  // top edge highlight
  ctx.fillStyle = free ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + 2, y + 2, w - 4, Math.max(3, h * 0.12));

  if (face) {
    drawShape(
      ctx,
      x + w / 2,
      y + h / 2 + 2,
      Math.min(w, h) * 0.38,
      face.shape,
      face.color,
      face.accent,
    );
  }

  if (!free) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    roundRect(ctx, x, y, w, h, Math.min(8, scale * 0.3));
    ctx.fill();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function renderBoard(opts: RenderOpts): void {
  const { canvas, state } = opts;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  // soft board backdrop
  const grd = ctx.createLinearGradient(0, 0, cssW, cssH);
  grd.addColorStop(0, 'rgba(15, 118, 110, 0.12)');
  grd.addColorStop(1, 'rgba(30, 58, 138, 0.1)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, cssW, cssH);

  const { ox, oy, scale } = tilePixelSize(canvas, state);
  const live = state.tiles.filter((t) => !t.removed);
  live.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x || a.id - b.id);
  for (const tile of live) {
    drawTile(ctx, tile, state, ox, oy, scale);
  }
}

/** Map canvas click → tile (topmost under point). */
export function pickTile(
  canvas: HTMLCanvasElement,
  state: GameState,
  clientX: number,
  clientY: number,
): Tile | null {
  const rect = canvas.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  const { ox, oy, scale } = tilePixelSize(canvas, state);

  // Prefer highest z under point using screen-space footprint
  let best: Tile | null = null;
  for (const t of state.tiles) {
    if (t.removed) continue;
    const { x, y } = tileScreenPos(t, ox, oy, scale);
    const w = TILE_W * scale;
    const h = TILE_H * scale;
    if (px >= x && px <= x + w && py >= y && py <= y + h) {
      if (!best || t.z > best.z || (t.z === best.z && t.id > best.id)) {
        best = t;
      }
    }
  }
  if (best) return best;

  // Fallback grid hit (no depth offset)
  const gx = (px - ox) / scale;
  const gy = (py - oy) / scale;
  return hitTest(state.tiles, gx, gy);
}
