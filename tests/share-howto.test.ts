import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildWinShareText } from '../src/game/share';
import { isHowtoSeen, markHowtoSeen } from '../src/game/persist';

describe('buildWinShareText', () => {
  it('formats layout name and moves', () => {
    expect(buildWinShareText('Turtle Lite', 42)).toBe(
      'MahjongCalm — cleared Turtle Lite in 42 moves',
    );
  });

  it('floors moves and clamps negative', () => {
    expect(buildWinShareText('Pyramid', 3.9)).toBe(
      'MahjongCalm — cleared Pyramid in 3 moves',
    );
    expect(buildWinShareText('Bridge', -2)).toBe(
      'MahjongCalm — cleared Bridge in 0 moves',
    );
  });

  it('falls back when name blank', () => {
    expect(buildWinShareText('  ', 1)).toBe(
      'MahjongCalm — cleared layout in 1 moves',
    );
  });
});

describe('howto-seen helpers', () => {
  const KEY = 'mahjongcalm:howto';
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const mem = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mem,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    store.clear();
  });

  it('is false until marked', () => {
    expect(isHowtoSeen()).toBe(false);
  });

  it('persists after markHowtoSeen', () => {
    markHowtoSeen();
    expect(isHowtoSeen()).toBe(true);
    expect(store.get(KEY)).toBe('1');
  });
});
