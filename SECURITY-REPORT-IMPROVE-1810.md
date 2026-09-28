# MahjongCalm — Security Review Report (IMPROVE / Unreleased)

**Date:** 2026-09-28 18:11 PKT (Asia/Karachi, UTC+05:00)  
**Project:** `/workspace/factory/projects/mahjongcalm`  
**HEAD reviewed:** `867f64b` (`867f64ba8cd0bcbf68000704650ff985ad7d7204`) — feat: Unreleased polish — hint stock + layout Next cues  
**Base / prior:** `0f4e457` / MVP `0464160` — `SECURITY-REPORT.md` **PASS_WITH_NOTES** (do not regress)  
**Version:** 0.1.0 + Unreleased improve  
**Reviewer:** Security Reviewer (executor)  
**Gate:** `/workspace/factory/shared/security/RELEASE_GATE.md`  
**Verdict:** **PASS_WITH_NOTES**  
**Sign-off:** **CLEAR** (no ship blockers)  
**Method constraints:** No product code edits; no git push.

---

## Ship blockers

**None.**

No secrets/API keys in source or build, no untrusted-input XSS from IMPROVE surfaces, no unexpected network/telemetry/AdMob SDKs, production dependency audit clean (`npm audit --omit=dev` → 0 vulnerabilities). Prior PASS_WITH_NOTES posture held; one prior Low note remains open (static layout `innerHTML`).

---

## Master focus summary

| Focus | Result |
|-------|--------|
| 1. Hint counter integrity | **PASS** — `FREE_HINTS` / `formatHintStock`; HUD `textContent`; adsRemoved → unlimited; cannot go negative; rewarded path unchanged; free allotment from code constant, not a stored remaining |
| 2. Progress / Cleared UI XSS | **PASS_WITH_NOTES** — home progress `textContent`; Cleared/Not cleared/Next from booleans + static strings; name/description still via `innerHTML` from compile-time `LAYOUTS` only; crafted `clearedLayouts` ids cannot inject |
| 3. localStorage coerce | **PASS** — Array/String coerce + Set; Boolean mute/adsRemoved; `freeHintsUsed` ≥ 0 |
| Offline / ads stubs / PWA / secrets | **PASS** — no regression vs prior report |
| Dependencies | **PASS** — prod audit 0; vitest-only moderate (dev) |

---

## Delta findings (vs SECURITY-REPORT.md @ 0f4e457)

### D1 — Layout grid `innerHTML` still uses static LAYOUTS (+ new status/badge) (Low / note — **prior F1 OPEN**)

- **File:** `src/main.ts:95-107`
- **Evidence:** `grid.innerHTML = ''` then `btn.innerHTML = \`${badge}<span class="name">${layout.name}</span><span class="meta">${status} · … ${layout.description ?? ''}</span>\`` where:
  - `layout` iterates compile-time `LAYOUTS` (`src/layouts/index.ts`) — not localStorage / user input
  - `status` is boolean-derived `'Cleared ✓'` / `'Not cleared'` only (`isCleared = cleared.has(layout.id)`)
  - `badge` is hardcoded `'<span class="next-badge">Next</span>'` or `''` (`isNext` vs first uncleared static id)
- **Crafted `clearedLayouts` ids:** membership only (`Set.has(layout.id)` / `includes(l.id)`). Values never interpolated into HTML. Home line uses `$('#home-progress').textContent` with `next.name` from `LAYOUTS.find` (`src/main.ts:53-64`). Injecting `"<img onerror=…>"` as a cleared id does not match any layout id and cannot execute.
- **LAYOUTS strings:** all 12 `id`/`name`/`description` values are ASCII prose; no `<>&"` characters.
- **Risk:** Unchanged from prior F1 — not exploitable today; future CMS/user layouts with same pattern would be XSS.
- **Remediation (non-blocking):** Prefer `createElement` + `textContent` for name/meta/badge.

### D2 — Prior F2 `.gitignore` secret globs — **REMEDIATED**

- **Evidence:** `.gitignore` now includes `.env`, `.env.*`, `!.env.example` (landed in `50f60a2` docs commit on path to HEAD).
- **Status:** Closed relative to prior SECURITY-REPORT.md F2.

### D3 — Full `npm audit` vitest-only moderates (Info / note — **prior F3 unchanged**)

- `npm audit --omit=dev` → **0 vulnerabilities** (zero production dependencies).
- Full audit: 2 moderate in `@vitest/mocker` / `vitest` (GHSA-82fw-gwwq-j7x9) — **dev/test only**, not in `dist/`.
- Non-blocking; same acceptance as prior report.

**No new High/Critical/Medium findings in Unreleased delta.**

---

## Focus detail

### 1. Hint counter integrity

| Check | Evidence | Result |
|-------|----------|--------|
| Limit constant | `src/game/hints.ts:2` `FREE_HINTS = 3` | OK |
| Remaining math | `freeHintsRemaining`: `Math.max(0, freeLimit - Math.max(0, freeHintsUsed))` (`hints.ts:5-9`) | Cannot go negative |
| HUD label | `formatHintStock`: adsRemoved → `'Hints: unlimited'`; else `N free left` / `'Hints: ad'` (`hints.ts:18-26`) | OK |
| HUD sink | `refreshHintStock` → `#hud-hints` / `title` / `aria-label` via `textContent` / attributes (`main.ts:67-76`); also from `paint()` | No HTML injection |
| Exhaust → rewarded | `onHint`: if `freeHintsUsed >= FREE_HINTS` → `showRewarded('hint')`; else `bumpFreeHint()` (`main.ts:143-162`) | Rewarded path unchanged |
| adsRemoved | `showRewarded` auto-grants when `isAdsRemoved()` (`stubs.ts:50-53`); HUD shows unlimited; remove-ads refreshes stock (`main.ts:244-249`) | OK |
| Persist used count | Stores **used** (`freeHintsUsed`), not a trusted “remaining”; allotment always `FREE_HINTS − used` in code | Not blindly trusting storage for free allotment |
| Coerce | `Math.max(0, Number(parsed.freeHintsUsed) \|\| 0)` (`persist.ts:23`); `bumpFreeHint` increments only (`persist.ts:61-63`) | Non-negative |
| Tests | `tests/hints.test.ts` — clamps, ad, unlimited (2 tests) | Covered |

Client can still lower `freeHintsUsed` in localStorage (offline self-advantage) — same by-design note as prior report; not a ship blocker.

### 2. Progress / Cleared UI XSS

| Surface | Sink | Data source | Result |
|---------|------|-------------|--------|
| Home progress | `textContent` (`main.ts:64`) | counts + `LAYOUTS[].name` or static “All layouts cleared” | Safe |
| Layout cards Cleared/Not cleared | string literals into `innerHTML` | boolean `cleared.has(layout.id)` | Safe (static) |
| Next badge | hardcoded HTML span | boolean `isNext` | Safe (static) |
| name / description | `innerHTML` interpolation | `LAYOUTS` only | Static — see D1 |
| Win meta / toast / settings / ads overlays | `textContent` | layout names / stub reasons | Safe |

### 3. localStorage coerce (`src/game/persist.ts`)

- Key: `mahjongcalm:v1`
- Fields: `clearedLayouts: string[]`, `mute`, `adsRemoved`, `freeHintsUsed` — progress/flags only; **no credentials**
- `clearedLayouts`: `Array.isArray` → `map(String)` → `Set` dedupe; else `[]`
- `mute` / `adsRemoved`: `Boolean(...)`
- `freeHintsUsed`: `Math.max(0, Number(...) || 0)`
- try/catch on read/write (quota / private mode)
- Unchanged integrity vs prior PASS; IMPROVE consumers still use membership / counts / `textContent` labels

---

## Checklist (RELEASE_GATE)

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Authn / sessions / tokens | N/A → PASS | No accounts, cookies, or tokens |
| 2 | Authz / IDOR / roles | N/A → PASS | Client-only game; no privileged routes |
| 3 | Secrets & config | PASS | No keys; ads stubs; `.gitignore` now covers `.env*` (D2) |
| 4 | API surface & rate limits | N/A → PASS | No app API |
| 5 | Injection (XSS / eval / HTML) | PASS_WITH_NOTES | D1 only; no `eval` / `document.write` / `outerHTML` / `insertAdjacentHTML` besides clear+static layout cards |
| 6 | Uploads & file access | N/A → PASS | None |
| 7 | Dependencies & supply chain | PASS | Prod audit clean; D3 vitest-only |
| 8 | Logging / error leakage | PASS | Ad stub in-memory log only |
| 9 | Transport (TLS / cookies / HSTS) | N/A → PASS | Static host; no cookie auth |
| 10 | Admin / debug surfaces | PASS | None |

### MVP / prior regression — Still OK

| Area | Status |
|------|--------|
| Ads stubs (no AdMob / network) | Still OK — `src/ads/stubs.ts` UI overlays + `textContent` |
| Offline / no telemetry | Still OK — no app `fetch` / `sendBeacon` / gtag / admob / `ca-app-pub` in `src/` / `public/` / `index.html`; dist only Vite modulepreload `fetch` |
| PWA base `/mahjongcalm/` | Still OK — `vite.config.ts` `base: '/mahjongcalm/'`; `dist/registerSW.js` scope `/mahjongcalm/`; manifest `scope`/`start_url` `./` |
| Secrets in repo / dist | Still OK — none found |
| Persist coerce / no credentials | Still OK |
| Canvas faces | Still OK — geometric draws only |

---

## Commands run (evidence)

| Command | Result |
|---------|--------|
| `git rev-parse HEAD` | `867f64ba8cd0bcbf68000704650ff985ad7d7204` |
| `npm test` | **12/12 passed** (engine 9 + ads 1 + hints 2) |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` (full) | 2 moderate (vitest / @vitest/mocker only) |
| Grep sinks / network / secrets | As above |
| LAYOUTS string scan | No `<>&"` in id/name/description |

**Not done (per brief):** no product code edits; no git push.

---

## Notes

- Client-controlled `localStorage` (cleared layouts, adsRemoved stub, freeHintsUsed) remains tamperable by design for an offline game — not a ship blocker with no server trust boundary.
- Prior F1 (layout `innerHTML`) intentionally left open; IMPROVE added Cleared/Next cues but kept data sources static/boolean — **no regression, no new exploit path**.
- Prior F2 (`.gitignore` `.env*`) closed in tree at HEAD.
- `registerSw()` in `src/main.ts` remains a no-op; production SW registration via `vite-plugin-pwa` → `dist/registerSW.js` (verified).

---

## Sign-off

**Verdict:** PASS_WITH_NOTES  
**Ship blockers:** none  
**Prior layout-innerHTML note:** still open (Low); not a blocker; crafted clearedLayouts ids cannot inject  
**MVP regression:** Still OK (offline, ads stubs, PWA base, secrets, coerce)  
**Sign-off:** **CLEAR** — eligible for QA / dual-clear path once Product/QA gates pass. Address D1 as polish; D2 done; D3 optional Vitest upgrade.

