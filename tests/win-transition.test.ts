import { describe, expect, it, vi } from 'vitest';
import { showWinAfterInterstitial } from '../src/game/winTransition';

describe('win overlay transition', () => {
  it('reveals the win controls only after the interstitial resolves', async () => {
    const events: string[] = [];
    let finishInterstitial!: () => void;
    const interstitial = new Promise<void>((resolve) => {
      finishInterstitial = resolve;
    });

    const transition = showWinAfterInterstitial(
      async () => {
        events.push('interstitial:start');
        await interstitial;
        events.push('interstitial:end');
      },
      () => events.push('win:visible'),
    );

    expect(events).toEqual(['interstitial:start']);
    finishInterstitial();
    await transition;

    expect(events).toEqual([
      'interstitial:start',
      'interstitial:end',
      'win:visible',
    ]);
  });

  it('still reveals the win controls if the interstitial fails', async () => {
    const revealWin = vi.fn();

    await showWinAfterInterstitial(async () => {
      throw new Error('interstitial failed');
    }, revealWin);

    expect(revealWin).toHaveBeenCalledOnce();
  });
});
