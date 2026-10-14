/**
 * Ad bridge. Real work happens in public/js/ads.js (AdMob via Capacitor on Android; in a browser
 * rewarded ads simply grant). Rules: rewarded ads only from a player tap; interstitials only after a
 * completed layout (reason 'after-level'), and public/js/adgate.js blocks the first session.
 */

type AdsGlobal = {
  showInterstitial?: () => Promise<boolean>;
  showRewarded?: (onReward: () => void) => Promise<void>;
};

const log: string[] = [];

function bridge(): AdsGlobal | null {
  const w = globalThis as unknown as { Ads?: AdsGlobal };
  return w.Ads ?? null;
}

export function getAdLog(): readonly string[] {
  return log;
}

export function clearAdLog(): void {
  log.length = 0;
}

/** Only 'after-level' is ever allowed; anything else (launch, restart, exit) is refused. */
export async function showInterstitial(reason: string): Promise<boolean> {
  if (reason !== 'after-level') {
    log.push(`interstitial:refused:${reason}`);
    return false;
  }
  const a = bridge();
  if (!a?.showInterstitial) {
    log.push('interstitial:web-noop');
    return false;
  }
  const shown = await a.showInterstitial();
  log.push(`interstitial:${shown ? 'shown' : 'gated'}`);
  return shown;
}

/** Resolves true only if the reward was earned. Browser builds grant immediately. */
export async function showRewarded(reason: string = 'hint'): Promise<boolean> {
  const a = bridge();
  if (!a?.showRewarded) {
    log.push(`rewarded:web-grant:${reason}`);
    return true;
  }
  let earned = false;
  await a.showRewarded(() => {
    earned = true;
  });
  log.push(`rewarded:${earned ? 'earned' : 'cancel'}:${reason}`);
  return earned;
}
