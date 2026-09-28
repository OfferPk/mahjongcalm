# Changelog

## Unreleased

- Hint remaining cue: play HUD `#btn-hint` shows `Hints: N free left` / `Hints: ad` / `Hints: unlimited` (adsRemoved); updates after each free bump; rewarded stub path unchanged (`src/game/hints.ts` + vitest)
- Layout clear progress clarity: layout cards prefix `Cleared ✓ ·` / `Not cleared ·`; first uncleared marked **Next**; home progress appends `· Next: {name}` or `All layouts cleared`

## 0.1.0 — 2026-09-28

- Initial MVP: Vite + TypeScript + PWA (`base: /mahjongcalm/`)
- Geometric tile faces (~26); classic free-tile + match engine
- 12 layouts (turtle-lite, pyramid, bridge, diamond, fortress, steps, twin-peaks, ring, cross, lotus, hourglass, meadow)
- Hint, Shuffle, win flow, settings (mute, remove-ads stub)
- Ads stubs: `showInterstitial`, `showRewarded`, `purchaseRemoveAds`, `isAdsRemoved`
- Progress in `localStorage` (`mahjongcalm:v1`)
- Vitest coverage + README + GUIDE-roman-urdu.md
