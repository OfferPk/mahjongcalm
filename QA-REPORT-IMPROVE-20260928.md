# QA Report — MahjongCalm Unreleased IMPROVE (post v0.1.0)

**Date:** 2026-09-28 18:12 PKT (Asia/Karachi)  
**Project:** `/workspace/factory/projects/mahjongcalm`  
**Version:** 0.1.0 + Unreleased polish  
**HEAD verified:** `867f64ba8cd0bcbf68000704650ff985ad7d7204` (`feat(mahjongcalm): Unreleased polish — hint stock + layout Next cues`)  
**Prior:** `QA-REPORT.md` (MVP v0.1.0 **PASS**)  
**Inbox IMPROVE:** `IMPROVE-mahjongcalm-20260928-1808.md`  
**QA:** Independent report only — no product source changes; no GitHub push; no agent messages  
**Overall:** **PASS**

---

## Summary

Unreleased polish at `867f64b` delivers both Master IMPROVE items: play HUD hint stock (`freeHintsUsed` / 3 free → ad stub / unlimited when adsRemoved), and layout clear progress (`Cleared ✓` / `Not cleared` + **Next** highlight + home `· Next: {name}` / `All layouts cleared`). Gates: **`npm test` 12/12**, **`npm run build` green**. `base: '/mahjongcalm/'` unchanged; still 12 layouts; no real AdMob / IAP. **0 new P0 / 0 new P1.**

| Severity | Count |
|----------|------:|
| Critical / P0 | 0 |
| High / P1     | 0 |
| Medium / P2   | 0 |
| Low / P3 (residual, carried + cosmetic) | 5 prior + docs notes |

**CLEAR for publish from QA (Unreleased IMPROVE):** **YES**

---

## Environment

| Item | Detail |
|------|--------|
| Methods | Source review (`hints.ts`, `main.ts`, `style.css`, `index.html`, layouts, ads stubs); commit `867f64b` diff; vitest; production build + dist string/CSS checks |
| Zone | Asia/Karachi (UTC+5); times PKT |
| Git | Local `master` at `867f64b` (ahead of origin by 1 improve commit); no push this QA |

---

## Automation

| Check | Result |
|-------|--------|
| `npm test` | **12/12 passed** — `tests/engine.test.ts` (9) + `tests/ads.test.ts` (1) + `tests/hints.test.ts` (2: remaining clamp + format free/ad/unlimited); vitest 3.2.7; exit 0 |
| `npm run build` | **green** — `tsc && vite build`; vite 6.4.3; PWA v1.3.0 `generateSW`; **12 precache entries** (38.20 KiB); `dist/sw.js` + workbox; asset hrefs under `/mahjongcalm/`; exit 0 |

---

## Master IMPROVE verification

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Hint remaining cue (`freeHintsUsed` / 3 free then ad stub) | **PASS** | `src/game/hints.ts`: `FREE_HINTS = 3`, `freeHintsRemaining`, `formatHintStock` → `Hints: N free left` / `Hints: ad` / `Hints: unlimited` (adsRemoved). HUD: `index.html` `#hud-hints` on `#btn-hint`; `refreshHintStock()` on paint, after free bump / rewarded path in `onHint`, after remove-ads, boot. `onHint`: if `freeHintsUsed >= FREE_HINTS` → `showRewarded('hint')` stub (cancel aborts); else `bumpFreeHint()`. Rewarded overlay path unchanged (`src/ads/stubs.ts`). Vitest `tests/hints.test.ts` 2/2. Dist JS retains `Hints: ad`, `Hints: unlimited`, template `Hints: ${n} free left`. |
| 2 | Layout clear progress (Cleared ✓ / Next highlight + home next name) | **PASS** | `renderLayoutGrid`: meta `Cleared ✓` / `Not cleared`; first uncleared gets class `next` + `<span class="next-badge">Next</span>`. CSS `.layout-card.next` border/accent + badge pill. `refreshHome`: `{cleared} / {total}` + `· Next: {name}` or `· All layouts cleared`. No new lock economy. Dist JS/CSS contain `Cleared ✓`, `Not cleared`, `next-badge`, `All layouts cleared`, `.layout-card.next`. |

### Guardrails (also verified)

| Item | Verdict | Evidence |
|------|---------|----------|
| `base: '/mahjongcalm/'` unchanged | **PASS** | `vite.config.ts`; dist HTML/SW register under `/mahjongcalm/` |
| No new layouts | **PASS** | Still 12 ids (turtle-lite … meadow) in `src/layouts/index.ts`; bundle lists all 12 |
| No real AdMob | **PASS** | Stubs only; no `ca-app-pub` / AdMob SDK in `src/` or product config |

---

## Findings

### P0 / P1 (ship blockers)

None.

### Residuals (non-blocking)

| ID | Severity | Title | Notes |
|----|----------|-------|-------|
| **MC-001** | **Low** | Mute flag without SFX | Carried from v0.1.0 QA — mute persists; no audio beeps. |
| **MC-002** | **Low** | `freeHintsUsed` never resets | Carried — lifetime counter; after 3 free, all future hints use rewarded stub. Hint stock cue now surfaces this clearly (IMPROVE intent). |
| **MC-003** | **Low** | No full solver / guaranteed solvability | Carried — even-face deal + shuffle only. |
| **MC-004** | **Low** | STATUS docs lag vs HEAD | STATUS claims READY_FOR_QA Unreleased improve; does not pin SHA `867f64b` explicitly. Cosmetic. |
| **MC-005** | **Low** | No live airplane-mode browser pass | Carried — SW + base paths verified structurally; headless offline reload not re-run this IMPROVE pass. |

No new P0/P1 introduced by Unreleased polish.

---

## Verdict

**PASS** — Unreleased IMPROVE at `867f64b` meets both Master checklist items with **0 P0 / 0 P1**. Gates 12/12 + build green. Base `/mahjongcalm/` intact; no AdMob; no new layouts.

**CLEAR from QA: YES** (Unreleased IMPROVE; dual-clear / push still Master’s gate).

Report only — no product code changes, no GitHub push, no agent messages.
