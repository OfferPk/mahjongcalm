# QA Report — MahjongCalm Unreleased IMPROVE (post v0.1.1)

**Date:** 2026-09-28 18:19 PKT (Asia/Karachi)  
**Project:** `/workspace/factory/projects/mahjongcalm`  
**Version:** 0.1.1 + Unreleased polish (win Share + first-run howto)  
**HEAD verified:** `e222c60d092a105dd2eb2c6feb6112dc8b3b250d` (`feat(mahjongcalm): Unreleased polish — win Share + first-run howto`)  
**Parent:** `82c301c` (v0.1.1 release — **not amended**)  
**Prior:** `QA-REPORT-IMPROVE-20260928.md` (hint stock + Cleared/Next @ `867f64b` **PASS**); `QA-REPORT.md` (MVP v0.1.0)  
**Inbox IMPROVE:** `IMPROVE-mahjongcalm-20260928-1808.md` (tasks 1–2 Share + howto; hint/layout already shipped in 0.1.1 — **not re-tested**)  
**QA:** Independent report only — no product source changes; no GitHub push; no agent messages  
**Overall:** **PASS**

---

## Summary

Unreleased polish at `e222c60` delivers both Master IMPROVE items on top of shipped v0.1.1: win overlay Share (`navigator.share` → else clipboard + toast), and one-time first-run howto via `mahjongcalm:howto`. Gates: **`npm test` 17/17**, **`npm run build` green**. `base: '/mahjongcalm/'` unchanged; still 12 layouts; no real AdMob / IAP. Hint-stock / Cleared/Next pack left intact (out of scope). **0 new P0 / 0 new P1.**

| Severity | Count |
|----------|------:|
| Critical / P0 | 0 |
| High / P1     | 0 |
| Medium / P2   | 0 |
| Low / P3 (residual, carried + cosmetic) | prior MC-* + docs note |

**CLEAR for publish from QA (Unreleased IMPROVE post v0.1.1):** **YES**

---

## Environment

| Item | Detail |
|------|--------|
| Methods | Source review (`share.ts`, `persist.ts` howto helpers, `main.ts` `shareWin`/`copyShare`/boot, `index.html` `#btn-win-share` + howto); commit `e222c60` diff vs `82c301c`; vitest; production build + dist string checks |
| Zone | Asia/Karachi (UTC+5); times PKT |
| Git | Local at `e222c60` (parent `82c301c` v0.1.1); no push this QA |

---

## Automation

| Check | Result |
|-------|--------|
| `npm test` | **17/17 passed** — `tests/engine.test.ts` (9) + `tests/ads.test.ts` (1) + `tests/hints.test.ts` (2) + `tests/share-howto.test.ts` (5: share text + howto seen helpers); vitest 3.2.7; exit 0 |
| `npm run build` | **green** — `tsc && vite build`; vite 6.4.3; PWA v1.3.0 `generateSW`; **12 precache entries** (39.29 KiB); `dist/sw.js` + workbox; asset hrefs under `/mahjongcalm/`; exit 0 |

---

## Master IMPROVE verification

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Win Share — `navigator.share` else clipboard + toast | **PASS** | `index.html` `#overlay-win` has `#btn-win-share` Share. `src/game/share.ts` `buildWinShareText` → `MahjongCalm — cleared {name} in N moves` (floor/clamp/blank→`layout`). `main.ts` `shareWin()`: if `navigator.share` → `{ title: 'MahjongCalm', text }` with `.catch` → `copyShare`; else `copyShare`. `copyShare`: `navigator.clipboard.writeText` then toast **Copied share text**; clipboard fail / missing → `legacyCopy` (`execCommand`) + same toast. Wired `#btn-win-share` → `shareWin`. Dist JS retains `navigator.share`, `MahjongCalm — cleared`, `Copied share text`. Vitest 3/3 on builder. Offline-only (no network share URL required). |
| 2 | First-run howto once (`mahjongcalm:howto`) | **PASS** | `persist.ts`: `HOWTO_KEY = 'mahjongcalm:howto'`; `isHowtoSeen()` (`=== '1'`), `markHowtoSeen()` set `'1'`; separate from `mahjongcalm:v1` blob. Boot: `if (!isHowtoSeen()) showScreen('howto')` else home. `#btn-howto-ok` → `markHowtoSeen()` + home. Manual `#btn-howto` still opens howto without clearing later-launch skip. Dist JS retains `mahjongcalm:howto`. Vitest 2/2 on helpers. |

### Guardrails (also verified)

| Item | Verdict | Evidence |
|------|---------|----------|
| `base: '/mahjongcalm/'` unchanged | **PASS** | `vite.config.ts`; dist HTML/SW register under `/mahjongcalm/` |
| Hint-stock / Cleared/Next not rebuilt (out of scope) | **PASS** | Commit touches Share/howto + docs/tests only; prior cue strings still in dist (`Hints: ad`, `All layouts cleared`, Cleared/Next cards) |
| No new layouts | **PASS** | Still 12 ids in bundle |
| No real AdMob | **PASS** | Stubs only; no product AdMob SDK wiring beyond prior stub mention |
| Parent v0.1.1 not amended | **PASS** | `e222c60` parent = `82c301c` |

---

## Findings

### P0 / P1 (ship blockers)

None.

### Residuals (non-blocking)

| ID | Severity | Title | Notes |
|----|----------|-------|-------|
| **MC-001** | **Low** | Mute flag without SFX | Carried — mute persists; no audio beeps. |
| **MC-002** | **Low** | `freeHintsUsed` never resets | Carried — lifetime counter; stock cue already shipped in v0.1.1. |
| **MC-003** | **Low** | No full solver / guaranteed solvability | Carried — even-face deal + shuffle only. |
| **MC-004** | **Low** | STATUS still READY_FOR_QA vs CLEAR | Cosmetic — STATUS pins Unreleased improve @ READY_FOR_QA; after this PASS Master should flip publish gate. |
| **MC-005** | **Low** | No live airplane-mode browser pass | Carried — SW + base paths verified structurally. |
| **MC-006** | **Low** | Share cancel → clipboard fallback | `navigator.share(...).catch` copies + toasts even on user dismiss; acceptable MVP, not a ship block. |
| **MC-007** | **Low** | A2HS may show during first-run howto | `#a2hs` unhidden in `wireUi` before howto/home branch; tip is outside `.screen` so can appear while howto is up. Acceptance allows howto then home+A2HS; no conflict with persist. |

---

## Verdict

**PASS** — both Master items hold; automation green; **no new P0/P1**.  
**CLEAR from QA (Unreleased IMPROVE post v0.1.1):** **YES**
