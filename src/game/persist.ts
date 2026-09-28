import type { PersistState } from './types';

const KEY = 'mahjongcalm:v1';

const DEFAULT: PersistState = {
  clearedLayouts: [],
  mute: false,
  adsRemoved: false,
  freeHintsUsed: 0,
};

function read(): PersistState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT, clearedLayouts: [] };
    const parsed = JSON.parse(raw) as Partial<PersistState>;
    return {
      clearedLayouts: Array.isArray(parsed.clearedLayouts)
        ? Array.from(new Set(parsed.clearedLayouts.map(String)))
        : [],
      mute: Boolean(parsed.mute),
      adsRemoved: Boolean(parsed.adsRemoved),
      freeHintsUsed: Math.max(0, Number(parsed.freeHintsUsed) || 0),
    };
  } catch {
    return { ...DEFAULT, clearedLayouts: [] };
  }
}

function write(state: PersistState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function loadPersist(): PersistState {
  return read();
}

export function savePersist(partial: Partial<PersistState>): PersistState {
  const cur = read();
  const next: PersistState = {
    ...cur,
    ...partial,
    clearedLayouts: partial.clearedLayouts
      ? Array.from(new Set(partial.clearedLayouts.map(String)))
      : cur.clearedLayouts,
  };
  write(next);
  return next;
}

export function markLayoutCleared(layoutId: string): PersistState {
  const cur = read();
  if (cur.clearedLayouts.includes(layoutId)) return cur;
  return savePersist({ clearedLayouts: [...cur.clearedLayouts, layoutId] });
}

export function bumpFreeHint(): PersistState {
  const cur = read();
  return savePersist({ freeHintsUsed: cur.freeHintsUsed + 1 });
}

/** First-run howto flag (brief key). Separate from save blob. */
const HOWTO_KEY = 'mahjongcalm:howto';

export function isHowtoSeen(): boolean {
  try {
    return localStorage.getItem(HOWTO_KEY) === '1';
  } catch {
    return false;
  }
}

export function markHowtoSeen(): void {
  try {
    localStorage.setItem(HOWTO_KEY, '1');
  } catch {
    /* quota / private */
  }
}
