import { beforeEach, describe, expect, it } from 'vitest';
import { clearAdLog, getAdLog, showInterstitial, showRewarded } from '../src/ads/stubs';

describe('ad bridge rules', () => {
  beforeEach(() => {
    clearAdLog();
    delete (globalThis as { Ads?: unknown }).Ads;
  });

  it('refuses interstitials for anything but a completed level', async () => {
    for (const r of ['launch', 'restart', 'exit', 'win']) expect(await showInterstitial(r)).toBe(false);
    expect(getAdLog().every((l) => l.startsWith('interstitial:refused'))).toBe(true);
  });

  it('after-level goes through the gated native bridge', async () => {
    let calls = 0;
    (globalThis as { Ads?: unknown }).Ads = { showInterstitial: async () => { calls++; return false; } };
    expect(await showInterstitial('after-level')).toBe(false);
    expect(calls).toBe(1);
    expect(getAdLog()).toContain('interstitial:gated');
  });

  it('rewarded grants in a browser and only when earned natively', async () => {
    expect(await showRewarded('hint')).toBe(true);
    (globalThis as { Ads?: unknown }).Ads = { showRewarded: async () => {} };
    expect(await showRewarded('hint')).toBe(false);
    (globalThis as { Ads?: unknown }).Ads = { showRewarded: async (cb: () => void) => cb() };
    expect(await showRewarded('hint')).toBe(true);
  });
});
