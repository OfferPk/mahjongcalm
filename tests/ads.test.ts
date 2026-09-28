import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => store.clear(),
  key: () => null,
  length: 0,
});

describe('ads stubs', () => {
  beforeEach(() => {
    store.clear();
  });

  it('showInterstitial / rewarded / purchaseRemoveAds / isAdsRemoved', async () => {
    const ads = await import('../src/ads/stubs');
    ads.clearAdLog();
    expect(ads.isAdsRemoved()).toBe(false);
    await ads.showInterstitial('win');
    expect(ads.getAdLog().some((l) => l.includes('interstitial:show'))).toBe(true);
    const earned = await ads.showRewarded('hint');
    expect(earned).toBe(true);
    await ads.purchaseRemoveAds();
    expect(ads.isAdsRemoved()).toBe(true);
    ads.clearAdLog();
    const shown = await ads.showInterstitial('retry');
    expect(shown).toBe(false);
    expect(ads.getAdLog()[0]).toContain('skipped');
  });
});
