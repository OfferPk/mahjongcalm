import './style.css';
import {
  applyHint,
  createGame,
  remainingCount,
  selectTile,
  shuffleRemaining,
} from './game/engine';
import {
  bumpFreeHint,
  loadPersist,
  markHowtoSeen,
  markLayoutCleared,
  savePersist,
} from './game/persist';
import { formatHintStock, resolveHintRequest } from './game/hints';
import { buildWinShareText } from './game/share';
import type { GameState } from './game/types';
import {
  clearMatchHistory,
  cloneGameState,
  createMatchHistory,
  recordMatch,
  takeRedo,
  takeUndo,
} from './game/undo';
import { LAYOUTS, getLayout } from './layouts';
import { pickTile, renderBoard } from './ui/canvas';
import { activateOverlayFocus } from './ui/focusTrap';
import { showInterstitial, showRewarded } from './ads/stubs';

type Screen = 'home' | 'layouts' | 'settings' | 'play';

let state: GameState | null = null;
const matchHistory = createMatchHistory();
let layoutIndex = 0;
let toastTimer = 0;
let winFocusCleanup: (() => void) | null = null;
let winAdPending = false;
let usedHelp = false;

type McGlobals = {
  Meta?: { win?: (d: Record<string, unknown>) => number; runCoach?: (force: boolean) => void; move?: () => void };
  MC_META_BOOT?: () => void;
  __mc?: unknown;
};
const G = window as unknown as McGlobals;

const $ = <T extends HTMLElement>(sel: string) =>
  document.querySelector(sel) as T;

function showScreen(name: Screen): void {
  document.querySelectorAll<HTMLElement>('.screen').forEach((el) => {
    el.hidden = el.dataset.screen !== name;
  });
}

function toast(msg: string): void {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.hidden = true;
  }, 1800);
}

function legacyCopy(text: string): void {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch {
    /* ignore */
  }
}

function copyShare(text: string): void {
  const done = () => toast('Copied share text');
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).then(done).catch(() => {
      legacyCopy(text);
      done();
    });
    return;
  }
  legacyCopy(text);
  done();
}

function shareWin(): void {
  if (!state) return;
  const layout = getLayout(state.layoutId);
  const text = buildWinShareText(layout?.name ?? state.layoutId, state.moves);
  if (navigator.share) {
    void navigator.share({ title: 'MahjongCalm', text }).catch(() => {
      copyShare(text);
    });
    return;
  }
  copyShare(text);
}

function refreshHome(): void {
  const p = loadPersist();
  const cleared = p.clearedLayouts.length;
  const total = LAYOUTS.length;
  let line = `${cleared} / ${total}`;
  if (cleared >= total) {
    line += ' · All layouts cleared';
  } else {
    const next = LAYOUTS.find((l) => !p.clearedLayouts.includes(l.id));
    if (next) line += ` · Next: ${next.name}`;
  }
  $('#home-progress').textContent = line;
}

function refreshHintStock(): void {
  const p = loadPersist();
  const label = formatHintStock(p.freeHintsUsed, false);
  const stock = $('#hud-hints');
  if (stock) stock.textContent = label;
  const btn = $('#btn-hint');
  if (btn) {
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }
}

function refreshHistoryButtons(): void {
  ($('#btn-undo') as HTMLButtonElement).disabled =
    !state || state.won || !matchHistory.undoState;
  ($('#btn-redo') as HTMLButtonElement).disabled =
    !state || state.won || !matchHistory.redoState;
}

function undoLastMatch(): void {
  if (!state) return;
  const restored = takeUndo(matchHistory, state);
  if (!restored) return;
  usedHelp = true;
  state = restored;
  paint();
  toast('Last match undone');
}

function redoLastMatch(): void {
  if (!state) return;
  const restored = takeRedo(matchHistory, state);
  if (!restored) return;
  state = restored;
  paint();
  toast('Last match redone');
}

function refreshSettings(): void {
  const p = loadPersist();
  $('#btn-mute').textContent = p.mute ? '🔇 Sound off' : '🔊 Sound on';
}

function renderLayoutGrid(): void {
  const grid = $('#layout-grid');
  const cleared = new Set(loadPersist().clearedLayouts);
  const nextId = LAYOUTS.find((l) => !cleared.has(l.id))?.id;
  grid.innerHTML = '';
  LAYOUTS.forEach((layout, i) => {
    const isCleared = cleared.has(layout.id);
    const isNext = Boolean(nextId && layout.id === nextId);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'layout-card' +
      (isCleared ? ' cleared' : '') +
      (isNext ? ' next' : '');
    const status = isCleared ? 'Cleared ✓' : 'Not cleared';
    const badge = isNext ? '<span class="next-badge">Next</span>' : '';
    btn.innerHTML = `${badge}<span class="name">${layout.name}</span><span class="meta">${status} · ${layout.tiles.length} tiles · ${layout.description ?? ''}</span>`;
    btn.addEventListener('click', () => startLayout(i));
    grid.appendChild(btn);
  });
}

function paint(): void {
  if (!state) return;
  const canvas = $('#board') as HTMLCanvasElement;
  renderBoard({ canvas, state });
  const layout = getLayout(state.layoutId);
  $('#hud-layout').textContent = layout?.name ?? state.layoutId;
  $('#hud-left').textContent = String(remainingCount(state));
  $('#hud-moves').textContent = String(state.moves);
  refreshHintStock();
  refreshHistoryButtons();
}

function hideWinOverlay(): void {
  $('#overlay-win').hidden = true;
  winFocusCleanup?.();
  winFocusCleanup = null;
}

function revealWinOverlay(): void {
  const overlay = $('#overlay-win');
  overlay.hidden = false;
  winFocusCleanup?.();
  winFocusCleanup = activateOverlayFocus($('#overlay-win .panel'));
}

function startLayout(index: number): void {
  clearMatchHistory(matchHistory);
  layoutIndex = ((index % LAYOUTS.length) + LAYOUTS.length) % LAYOUTS.length;
  const layout = LAYOUTS[layoutIndex]!;
  state = createGame(layout);
  usedHelp = false;
  refreshHistoryButtons();
  hideWinOverlay();
  showScreen('play');
  requestAnimationFrame(paint);
  if (layoutIndex === 0 && loadPersist().clearedLayouts.length === 0) G.Meta?.runCoach?.(false);
}

function onWin(): void {
  if (!state) return;
  markLayoutCleared(state.layoutId);
  refreshHome();
  hideWinOverlay();
  const layout = getLayout(state.layoutId);
  $('#win-meta').textContent = `${layout?.name ?? state.layoutId} cleared in ${state.moves} moves.`;
  // No ad when the win card opens; see afterLayoutAd().
  winAdPending = true;
  revealWinOverlay();
  if (G.Meta?.win) {
    try {
      const pairs = state.tiles.length / 2;
      const extra = state.moves - pairs;
      const stars = !usedHelp && extra <= 0 ? 3 : extra <= Math.ceil(pairs * 0.25) ? 2 : 1;
      G.Meta.win({ level: layoutIndex + 1, stars, clean: !usedHelp, moves: state.moves, tiles: state.tiles.length });
    } catch (e) {
      console.warn(e);
    }
  }
}

/** Interstitial only after a cleared layout, when the player taps on (gated + paced in public/js/ads.js). */
function afterLayoutAd(): void {
  if (!winAdPending) return;
  winAdPending = false;
  void showInterstitial('after-level');
}

async function onHint(): Promise<void> {
  if (!state || state.won) return;
  usedHelp = true;
  const persist = loadPersist();
  const request = resolveHintRequest(
    state,
    persist.freeHintsUsed,
    false,
  );
  if (request.kind === 'unavailable') {
    state.hintPair = null;
    toast('No free pair — try Shuffle');
    paint();
    return;
  }
  if (request.kind === 'rewarded') {
    const ok = await showRewarded('hint');
    if (!ok) {
      toast('Hint cancelled');
      return;
    }
  } else if (request.kind === 'free') {
    bumpFreeHint();
  }
  state.hintPair = request.pair;
  toast('Hint highlighted');
  paint();
}

function onShuffle(): void {
  if (!state || state.won) return;
  usedHelp = true;
  clearMatchHistory(matchHistory);
  shuffleRemaining(state);
  if (applyHint(state)) {
    toast('Shuffled — a free pair is ready');
  } else {
    toast('No free pair — use Retry to restart this layout');
  }
  paint();
}

function wireUi(): void {
  $('#btn-play').addEventListener('click', () => {
    const cleared = loadPersist().clearedLayouts;
    const next = LAYOUTS.findIndex((l) => !cleared.includes(l.id));
    startLayout(next >= 0 ? next : 0);
  });
  $('#btn-layouts').addEventListener('click', () => {
    renderLayoutGrid();
    showScreen('layouts');
  });
  $('#btn-layouts-back').addEventListener('click', () => {
    refreshHome();
    showScreen('home');
  });
  $('#btn-settings').addEventListener('click', () => {
    refreshSettings();
    showScreen('settings');
  });
  $('#btn-settings-back').addEventListener('click', () => {
    refreshHome();
    showScreen('home');
  });
  $('#btn-mute').addEventListener('click', () => {
    const p = loadPersist();
    savePersist({ mute: !p.mute });
    refreshSettings();
    toast(loadPersist().mute ? 'Muted' : 'Sound on');
  });

  $('#btn-menu').addEventListener('click', () => {
    refreshHome();
    showScreen('home');
  });
  $('#btn-hint').addEventListener('click', () => void onHint());
  $('#btn-undo').addEventListener('click', undoLastMatch);
  $('#btn-redo').addEventListener('click', redoLastMatch);
  $('#btn-shuffle').addEventListener('click', onShuffle);
  $('#btn-retry').addEventListener('click', () => {
    startLayout(layoutIndex);
  });
  $('#btn-play-layouts').addEventListener('click', () => {
    renderLayoutGrid();
    showScreen('layouts');
  });

  $('#btn-next').addEventListener('click', () => {
    hideWinOverlay();
    afterLayoutAd();
    startLayout(layoutIndex + 1);
  });
  $('#btn-win-share').addEventListener('click', () => shareWin());
  $('#btn-win-replay').addEventListener('click', () => {
    hideWinOverlay();
    afterLayoutAd();
    startLayout(layoutIndex);
  });
  $('#btn-win-layouts').addEventListener('click', () => {
    hideWinOverlay();
    afterLayoutAd();
    renderLayoutGrid();
    showScreen('layouts');
  });
  $('#btn-win-home').addEventListener('click', () => {
    hideWinOverlay();
    afterLayoutAd();
    refreshHome();
    showScreen('home');
  });

  const canvas = $('#board') as HTMLCanvasElement;
  const onPointer = (ev: PointerEvent) => {
    if (!state || state.won) return;
    const tile = pickTile(canvas, state, ev.clientX, ev.clientY);
    if (!tile) {
      if (state.selectedId !== null) {
        state.selectedId = null;
        paint();
      }
      return;
    }
    const beforeMatch = state.selectedId === null ? null : cloneGameState(state);
    const result = selectTile(state, tile.id);
    switch (result.kind) {
      case 'blocked':
        toast('Tile blocked');
        break;
      case 'mismatch':
        toast('Different faces');
        break;
      case 'matched':
        recordMatch(matchHistory, beforeMatch, state);
        G.Meta?.move?.();
        if (result.won) onWin();
        break;
      default:
        break;
    }
    paint();
  };
  canvas.addEventListener('pointerdown', onPointer);

  window.addEventListener('resize', () => paint());

  const a2hs = $('#a2hs');
  const dismissed = sessionStorage.getItem('mahjongcalm:a2hs');
  const native = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  if (!dismissed && !native && !window.matchMedia('(display-mode: standalone)').matches) {
    a2hs.hidden = false;
  }
  $('#a2hs-ok').addEventListener('click', () => {
    a2hs.hidden = true;
    sessionStorage.setItem('mahjongcalm:a2hs', '1');
  });
}

function registerSw(): void {
  if (!('serviceWorker' in navigator)) return;
  // vite-plugin-pwa injects virtual module in build; skip explicit register in MVP
}

wireUi();
refreshHome();
refreshHintStock();
markHowtoSeen(); // the meta layer's How to play card replaces the old how-to screen
showScreen('home');
registerSw();
G.__mc = {
  startLayout,
  showScreen,
  repaint: () => paint(),
  layoutCount: LAYOUTS.length,
  cleared: () => loadPersist().clearedLayouts.length,
  isFirstLayout: () => !!state && layoutIndex === 0 && !$('[data-screen="play"]').hidden,
  winForTest: () => {
    if (!state) return;
    if (state.moves === 0) state.moves = state.tiles.length / 2;
    state.won = true;
    onWin();
  },
};
G.MC_META_BOOT?.();
// Skin Shop previews/equips swap body classes; the canvas board repaints to match.
new MutationObserver(() => paint()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
