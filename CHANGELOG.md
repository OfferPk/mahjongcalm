# Changelog

## Unreleased

- Shuffle now guarantees a free matching pair when two or more tiles are free, and highlights the pair so players can continue when stuck.
- Hint checks for a free matching pair before using a free hint or opening the rewarded stub; ads-removed players receive the unlimited hints shown in the HUD.

## 0.1.2 — 2026-09-28

- Win Share: `#overlay-win` **Share** button — `MahjongCalm — cleared {layout} in N moves` via `navigator.share` when available, else clipboard + toast (`src/game/share.ts`)
- First-run howto (once): auto-show howto when `mahjongcalm:howto` missing; Got it → Home + persist; later launches skip auto; manual How to play unchanged; A2HS tip still OK after howto

## 0.1.1 — 2026-09-28

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
