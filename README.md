# MahjongCalm

**Offline mahjong solitaire PWA** — match free geometric tiles on stacked calm layouts. Original abstract art only (no licensed mahjong themes, no Chinese-character IP requirement).

> Roman Urdu guide: **[GUIDE-roman-urdu.md](./GUIDE-roman-urdu.md)**

**Project ID:** `proj_mahjongcalm_001`  
**Pages base:** `/mahjongcalm/`

## Free-tile rule (classic turtle solitaire)

A remaining tile is **free** if and only if:

1. **Nothing on top** — no remaining tile at a higher `z` whose footprint overlaps this tile, and  
2. **At least one side open** — left or right (or both) has no remaining same-`z` neighbor touching that side.

Tap two free tiles with the **same face id** to remove them. Clear the board to win.

## Stack

- Vite + TypeScript
- HTML Canvas 2D (z-order hit testing)
- vite-plugin-pwa (service worker + manifest)
- localStorage progress (`mahjongcalm:v1`)
- Vitest unit tests

## Quick start

```bash
cd /workspace/factory/projects/mahjongcalm
npm install
npm run dev
```

With Vite `base: '/mahjongcalm/'`, open the **`/mahjongcalm/`** path (e.g. `http://localhost:5173/mahjongcalm/`).

```bash
npm test          # vitest
npm run build     # tsc + vite build → dist/
npm run preview   # serve production build at /mahjongcalm/
```

## Features (v0.1)

| Feature | Notes |
|---------|--------|
| **12 layouts** | turtle-lite, pyramid, bridge, diamond, fortress, steps, twin-peaks, ring, cross, lotus, hourglass, meadow |
| **Geometric faces** | ~26 original shapes/colors — no licensed art |
| **Hint** | Highlights a valid free pair (3 free, then rewarded stub) |
| **Shuffle** | Keeps the stack fixed; with two or more free tiles, guarantees and highlights a free matching pair |
| **Progress** | Layouts cleared, mute, adsRemoved in localStorage |
| **Ads stubs** | `showInterstitial`, `showRewarded`, `purchaseRemoveAds`, `isAdsRemoved` — UI overlays, no AdMob keys |

## Project layout

```
src/game/     engine (free/match/deal/hint/shuffle), faces, persist, types
src/layouts/  12 handcrafted layout definitions
src/ads/      interstitial / rewarded / remove-ads stubs
src/ui/       canvas renderer + hit test
public/       icons, manifest
tests/        vitest coverage
```

## Docs

- [STATUS.md](./STATUS.md) — build status
- [CHANGELOG.md](./CHANGELOG.md)
- [GUIDE-roman-urdu.md](./GUIDE-roman-urdu.md)
- PRD: `/workspace/factory/research/PRD-mahjongcalm.md`
- BUILD: `/workspace/factory/research/BUILD-mahjongcalm.md`

## License / IP

Original **geometric calm** tile set. **Not** affiliated with Vita Mahjong or any commercial mahjong solitaire title. No competitor assets or branding.

## v0.2.0 (Android + meta layer)

- Android: Capacitor 8 project in `android/` (`com.offerpk.mahjongcalm`, `webDir: dist`); `.github/workflows/android.yml` builds a signed AAB/APK on every `v*` tag. Vite `base` is now `./`.
- AdMob (`public/js/ads.js`, Google **test** IDs in `public/js/ads-config.js`): rewarded ads only from a tap (extra hints, 24h skin trials). Interstitials only from the Cleared! card's buttons; never on launch, Menu, Retry or in the first session (`public/js/adgate.js`). Stub ad dialogs and the fake "Remove ads" button are gone.
- Meta layer (`public/js/metakit.js` + `meta-config.js`): How to play card (replaces the old how-to screen), 7-day daily reward + seeded Daily challenge, Skin Shop (tile sets drawn on the canvas + table backdrops), achievements + Stats, first-layout coach, accessibility settings. Coins are cosmetic only.
- Store: `LAUNCH_CHECKLIST.md`, `store/LISTING-v0.2.md`, `store/screenshots/01–08.png`, `store/feature-graphic-1024x500.png`, Play Store guard workflow.
- Tests: `npm test` (vitest + meta/ads unit + store guard), `node tests/meta.browser.cjs http://localhost:PORT/` against `dist/`, plus the existing CDP regressions (`CHROME_BIN=… npm run test:touch-browser` / `test:focus-browser`, Node 22).
