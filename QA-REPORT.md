# QA Report — MahjongCalm MVP v0.1.0

**Date:** 2026-09-28 18:04 PKT (Asia/Karachi)  
**Project:** `/workspace/factory/projects/mahjongcalm`  
**Version:** 0.1.0  
**HEAD verified:** `0f4e457a736e9b211ab9f726244ff1727dd59170` (`docs: record MVP commit SHA in STATUS`; MVP body at `0464160`)  
**PRD:** `/workspace/factory/research/PRD-mahjongcalm.md`  
**BUILD:** `/workspace/factory/research/BUILD-mahjongcalm.md`  
**STATUS claim:** READY_FOR_QA — `npm test` 10/10; build green (tsc + Vite + PWA SW; base `/mahjongcalm/`)  
**QA:** Independent pass (report only — no product source changes; no GitHub push; no agent messages)  
**Overall:** **PASS**

---

## Summary

MVP scope holds against PRD §5 / §8 and BUILD acceptance. Geometric faces (**26**), **12** even-count layouts, free-tile + match engine, hint (3 free → rewarded stub) + shuffle, ads/remove-ads stubs with overlays, Home / select / play / win / settings, `localStorage` progress, README + GUIDE-roman-urdu, offline PWA under `base: '/mahjongcalm/'`, no licensed art. Automation: **`npm test` 10/10**, **`npm run build` green**. Preview smoke on `http://127.0.0.1:4179/mahjongcalm/` — shell/manifest/SW/assets **200**. No P0/P1 ship blockers.

| Severity | Count |
|----------|------:|
| Critical / P0 | 0 |
| High / P1     | 0 |
| Medium / P2   | 0 |
| Low / P3 (residual) | 4 |

**CLEAR for publish from QA:** **YES** (host under `base: /mahjongcalm/`).

---

## Environment

| Item | Detail |
|------|--------|
| Runtime | `npm run preview -- --host 127.0.0.1 --port 4179` → `http://127.0.0.1:4179/mahjongcalm/` |
| Methods | PRD/BUILD/STATUS/README/GUIDE; source review (`faces`, `layouts`, `engine`, `persist`, `ads/stubs`, `main`, `ui/canvas`, PWA); SSR deal smoke (12 layouts); `npm test`; `npm run build`; HTTP smoke of `dist/` |
| Zone | Asia/Karachi (UTC+5); times PKT |
| Git | Local `master` at `0f4e457`; no push performed this QA |

---

## Automation

| Check | Result |
|-------|--------|
| `npm test` | **10/10 passed** — `tests/engine.test.ts` (9: free-tile×3, match/select×2, deal parity×3, meadow smoke×1) + `tests/ads.test.ts` (1: interstitial/rewarded/purchaseRemoveAds/isAdsRemoved); vitest 3.2.7; exit 0 |
| `npm run build` | **green** — `tsc && vite build`; vite 6.4.3; PWA v1.3.0 `generateSW`; **12 precache entries** (36.71 KiB); `dist/sw.js` + `workbox-*.js` + `registerSW.js`; asset hrefs under `/mahjongcalm/`; exit 0 |

---

## Master / PRD-BUILD scope verification

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Geometric original tiles (~26 faces) | **PASS** | `src/game/faces.ts`: **26** `FaceDef` entries (`c-teal`…`pt-lime`); shapes circle/square/diamond/triangle/hex/star/cross/ring/bars/dots/wave/petal; calm palette; comments + README explicitly no Chinese characters / no licensed mahjong themes. Canvas draws via `src/ui/canvas.ts` `drawShape`. |
| 2 | 12 layouts | **PASS** | `src/layouts/index.ts` **12** ids: turtle-lite, pyramid, bridge, diamond, fortress, steps, twin-peaks, ring, cross, lotus, hourglass, meadow. All even tile counts (16–32); SSR `dealLayout` parity OK + ≥1 free tile each. Vitest asserts 8–12 layouts + even counts. |
| 3 | Free-tile + match engine | **PASS** | `src/game/engine.ts`: top-clear + left/right open rule; `isFree` / `facesMatch` / `selectTile` / win on empty board. Unit tests cover both-sides blocked, stacked block, free after neighbor remove, match/win. README documents classic turtle rule. |
| 4 | Hint (3 free then rewarded stub) + shuffle | **PASS** | `FREE_HINTS = 3` in `main.ts`; `bumpFreeHint` / `freeHintsUsed` in persist; after 3 → `showRewarded('hint')` overlay; `applyHint` / `findHintPair`; `shuffleRemaining` Fisher–Yates faces in place. HUD 💡 + Shuffle button wired. |
| 5 | Ads + remove-ads stubs/overlays | **PASS** | `src/ads/stubs.ts`: `showInterstitial`, `showRewarded`, `purchaseRemoveAds`, `isAdsRemoved` — no AdMob keys. UI overlays `#overlay-interstitial` / `#overlay-reward`; win/menu/retry interstitial; Settings remove-ads. Ads unit test + no SDK strings in JS bundle. |
| 6 | Home / select / play / win / settings | **PASS** | `index.html` screens: `home`, `layouts`, `play`, `settings` (+ `howto`). Win = `#overlay-win` (Next / Replay / Layouts / Home). Preview HTML lists all `data-screen` values. |
| 7 | localStorage progress | **PASS** | Key `mahjongcalm:v1`: `clearedLayouts`, `mute`, `adsRemoved`, `freeHintsUsed`. `markLayoutCleared` on win; home shows `N / 12`. |
| 8 | README + GUIDE-roman-urdu.md | **PASS** | Both at project root; README links GUIDE; free-tile rule, features table, base path, IP disclaimer. GUIDE Roman Urdu §§1–9 style (what / download / reqs / install / features / troubleshooting / privacy notes). |
| 9 | Offline-only; no licensed art | **PASS** | Static Vite PWA; SW registers `/mahjongcalm/sw.js` scope `/mahjongcalm/`; precache shell+assets; no gameplay `fetch`/AdMob/CDN in `src/`; icons are original geometric SVG/PNG; README/CHANGELOG disclaim Vita / licensed themes. |

### Also verified

| Item | Verdict | Evidence |
|------|---------|----------|
| Vite `base: '/mahjongcalm/'` | **PASS** | `vite.config.ts`; dist asset/manifest/SW paths all `/mahjongcalm/...`; preview 200 under that base. |
| PWA manifest / A2HS | **PASS** | `public/manifest.webmanifest` standalone; 192/512 icons; A2HS banner in UI. |
| Deal even parity all layouts | **PASS** | SSR: all 12 even + `dealParityOk`; `assertEvenLayouts()`. |
| No git push | **PASS** | QA performed report-only; branch remains local `master`. |

---

## Preview smoke (HTTP)

| URL (under `/mahjongcalm`) | Result |
|----------------------------|--------|
| `/` | 200 HTML — MahjongCalm, home/layouts/play/settings/howto, win + ad stub overlays, registerSW |
| `/manifest.webmanifest` | 200 — name MahjongCalm, display standalone |
| `/sw.js` | 200 — workbox generateSW |
| `/registerSW.js` | 200 — register `/mahjongcalm/sw.js` scope `/mahjongcalm/` |
| `/assets/index-*.js`, `*.css` | 200 |
| `/icons/icon-192.png`, `/favicon.svg` | 200 |

---

## PRD acceptance mapping (§8)

| Criterion | Result |
|-----------|--------|
| 8–12 playable layouts; match/free rules correct | **PASS** (12 layouts; engine tests + deal smoke) |
| Hint finds legal pair when one exists; shuffle doesn’t crash | **PASS** (`findHintPair` / meadow shuffle test) |
| PWA offline; works under `/mahjongcalm/` base | **PASS** (structural SW + base paths; no live airplane toggle this pass) |
| Ads/remove-ads stubs wired | **PASS** |
| `npm test` + `npm run build` | **PASS** (10/10 + green) |
| README + GUIDE-roman-urdu; original geometric art only | **PASS** |
| No live-ops / licensed IP / gambling | **PASS** |

---

## Findings

### P0 / P1 (ship blockers)

None.

### Residuals (non-blocking)

| ID | Severity | Title | Notes |
|----|----------|-------|-------|
| **MC-001** | **Low** | Mute flag without SFX | Settings toggles persist `mute` but no audio beeps yet. Acceptable v0.1 stub (same pattern as peer offline games). |
| **MC-002** | **Low** | `freeHintsUsed` never resets | Counter is lifetime in `localStorage`; after 3 free hints globally, all future hints require rewarded stub. Matches “after N free” MVP; per-layout reset not required. |
| **MC-003** | **Low** | No full solver / guaranteed solvability | Even-face deal + shuffle; PRD allowed deal+solver *or* pre-validated; no exhaustive solver smoke per layout. Manual clearability left to players + shuffle. |
| **MC-004** | **Low** | STATUS.md SHA vs HEAD | STATUS records MVP body `0464160`; HEAD is `0f4e457` (docs-only STATUS update). Product tree matches; cosmetic docs lag only. |
| **MC-005** | **Low** | No live airplane-mode browser pass | SW + zero game network + localStorage verified; full offline reload in headless browser not executed. Same residual bar as peer PWAs. |

---

## Verdict

**PASS** — MVP v0.1.0 meets Master/PRD-BUILD scope with **0 P0 / 0 P1**.  

**CLEAR for publish from QA: YES** (publish under GitHub Pages path `/mahjongcalm/`; dual-clear / push still Master’s gate).

Report only — no product code changes, no GitHub push, no agent messages.
