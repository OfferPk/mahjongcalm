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
  isHowtoSeen,
  loadPersist,
  markHowtoSeen,
  markLayoutCleared,
  savePersist,
} from './game/persist';
import { formatHintStock, resolveHintRequest } from './game/hints';
import { buildWinShareText } from './game/share';
import type { GameState } from './game/types';
import { LAYOUTS, getLayout } from './layouts';
import { pickTile, renderBoard } from './ui/canvas';
import {
  isAdsRemoved,
  purchaseRemoveAds,
  setInterstitialPresenter,
  setRewardedPresenter,
  showInterstitial,
  showRewarded,
} from './ads/stubs';

type Screen = 'home' | 'howto' | 'layouts' | 'settings' | 'play';

let state: GameState | null = null;
let layoutIndex = 0;
let toastTimer = 0;

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
  const label = formatHintStock(p.freeHintsUsed, p.adsRemoved);
  const stock = $('#hud-hints');
  if (stock) stock.textContent = label;
  const btn = $('#btn-hint');
  if (btn) {
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }
}

function refreshSettings(): void {
  const p = loadPersist();
  $('#btn-mute').textContent = p.mute ? '🔇 Sound off' : '🔊 Sound on';
  $('#ads-status').textContent = p.adsRemoved
    ? 'Ads: removed (stub flag)'
    : 'Ads: enabled (placeholder)';
  $('#btn-remove-ads').textContent = p.adsRemoved
    ? 'Ads removed ✓'
    : 'Remove ads (stub)';
  ($('#btn-remove-ads') as HTMLButtonElement).disabled = p.adsRemoved;
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
}

function startLayout(index: number): void {
  layoutIndex = ((index % LAYOUTS.length) + LAYOUTS.length) % LAYOUTS.length;
  const layout = LAYOUTS[layoutIndex]!;
  state = createGame(layout);
  $('#overlay-win').hidden = true;
  showScreen('play');
  requestAnimationFrame(paint);
}

function onWin(): void {
  if (!state) return;
  markLayoutCleared(state.layoutId);
  refreshHome();
  const layout = getLayout(state.layoutId);
  $('#win-meta').textContent = `${layout?.name ?? state.layoutId} cleared in ${state.moves} moves.`;
  $('#overlay-win').hidden = false;
  void showInterstitial('win');
}

async function onHint(): Promise<void> {
  if (!state || state.won) return;
  const persist = loadPersist();
  const request = resolveHintRequest(
    state,
    persist.freeHintsUsed,
    persist.adsRemoved,
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
  shuffleRemaining(state);
  if (applyHint(state)) {
    toast('Shuffled — a free pair is ready');
  } else {
    toast('No free pair — open a tile or try again');
  }
  paint();
}

function wireAdsOverlays(): void {
  setInterstitialPresenter(async (reason) => {
    const overlay = $('#overlay-interstitial');
    $('#interstitial-reason').textContent = `Stub interstitial (${reason}) — no real network ad.`;
    overlay.hidden = false;
    await new Promise<void>((resolve) => {
      const done = () => {
        overlay.hidden = true;
        $('#btn-interstitial-continue').removeEventListener('click', done);
        $('#btn-interstitial-dismiss').removeEventListener('click', done);
        resolve();
      };
      $('#btn-interstitial-continue').addEventListener('click', done);
      $('#btn-interstitial-dismiss').addEventListener('click', done);
    });
  });

  setRewardedPresenter(async (reason) => {
    const overlay = $('#overlay-reward');
    $('#reward-title').textContent = 'Watch ad?';
    $('#reward-body').textContent = `Placeholder rewarded ad for ${reason}.`;
    overlay.hidden = false;
    return await new Promise<boolean>((resolve) => {
      const ok = () => {
        cleanup();
        resolve(true);
      };
      const cancel = () => {
        cleanup();
        resolve(false);
      };
      const cleanup = () => {
        overlay.hidden = true;
        $('#btn-reward-ok').removeEventListener('click', ok);
        $('#btn-reward-cancel').removeEventListener('click', cancel);
      };
      $('#btn-reward-ok').addEventListener('click', ok);
      $('#btn-reward-cancel').addEventListener('click', cancel);
    });
  });
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
  $('#btn-howto').addEventListener('click', () => showScreen('howto'));
  $('#btn-howto-ok').addEventListener('click', () => {
    markHowtoSeen();
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
  $('#btn-remove-ads').addEventListener('click', async () => {
    if (isAdsRemoved()) return;
    await purchaseRemoveAds();
    refreshSettings();
    refreshHintStock();
    toast('Ads removed (stub)');
  });

  $('#btn-menu').addEventListener('click', async () => {
    await showInterstitial('menu');
    refreshHome();
    showScreen('home');
  });
  $('#btn-hint').addEventListener('click', () => void onHint());
  $('#btn-shuffle').addEventListener('click', onShuffle);
  $('#btn-retry').addEventListener('click', async () => {
    await showInterstitial('retry');
    startLayout(layoutIndex);
  });
  $('#btn-play-layouts').addEventListener('click', () => {
    renderLayoutGrid();
    showScreen('layouts');
  });

  $('#btn-next').addEventListener('click', () => {
    $('#overlay-win').hidden = true;
    startLayout(layoutIndex + 1);
  });
  $('#btn-win-share').addEventListener('click', () => shareWin());
  $('#btn-win-replay').addEventListener('click', () => {
    $('#overlay-win').hidden = true;
    startLayout(layoutIndex);
  });
  $('#btn-win-layouts').addEventListener('click', () => {
    $('#overlay-win').hidden = true;
    renderLayoutGrid();
    showScreen('layouts');
  });
  $('#btn-win-home').addEventListener('click', () => {
    $('#overlay-win').hidden = true;
    refreshHome();
    showScreen('home');
  });

  const canvas = $('#board') as HTMLCanvasElement;
  const onPointer = (ev: PointerEvent) => {
    if (!state || state.won) return;
    const tile = pickTile(canvas, state, ev.clientX, ev.clientY);
    if (!tile) return;
    const result = selectTile(state, tile.id);
    switch (result.kind) {
      case 'blocked':
        toast('Tile blocked');
        break;
      case 'mismatch':
        toast('Different faces');
        break;
      case 'matched':
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
  if (!dismissed && !window.matchMedia('(display-mode: standalone)').matches) {
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

wireAdsOverlays();
wireUi();
refreshHome();
refreshHintStock();
if (!isHowtoSeen()) {
  showScreen('howto');
} else {
  showScreen('home');
}
registerSw();
