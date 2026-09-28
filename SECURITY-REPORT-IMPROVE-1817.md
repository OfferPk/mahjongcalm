# MahjongCalm — Security Review Report (IMPROVE / Unreleased post-v0.1.1)

**Date:** 2026-09-28 18:18 PKT (Asia/Karachi, UTC+05:00)  
**Project:** `/workspace/factory/projects/mahjongcalm`  
**HEAD reviewed:** `e222c60` (`e222c60d092a105dd2eb2c6feb6112dc8b3b250d`) — feat: Unreleased polish — win Share + first-run howto  
**Base / prior:** `867f64b` — `SECURITY-REPORT-IMPROVE-1810.md` **PASS_WITH_NOTES** CLEAR; MVP `SECURITY-REPORT.md` (do not regress)  
**Version:** 0.1.1 + Unreleased improve (win Share + first-run howto)  
**Reviewer:** Security Reviewer (executor)  
**Gate:** `/workspace/factory/shared/security/RELEASE_GATE.md`  
**Verdict:** **PASS_WITH_NOTES**  
**Sign-off:** **CLEAR** (no ship blockers)  
**Method constraints:** No product code edits; no git push.

---

## Ship blockers

**None.**

No secrets/API keys in source or build, no XSS via share string / toast / howto flag, no unexpected network from share or howto (offline PWA; clipboard / `navigator.share` only), production dependency audit clean (`npm audit --omit=dev` → 0 vulnerabilities). Prior PASS_WITH_NOTES posture held; prior Low F1 (static layout `innerHTML`) remains open. Prior F2 `.gitignore` `.env*` remains remediated.

---

## Master focus summary

| Focus | Result |
|-------|--------|
| 1. share/clipboard text safe | **PASS** — `buildWinShareText` pure; name from `getLayout`→`LAYOUTS` (fallback `state.layoutId` from same static deal); toast static `'Copied share text'` via `textContent`; `textarea.value` / clipboard / `navigator.share` text APIs only — no HTML sink for share string |
| 2. howto localStorage flag | **PASS** — key `mahjongcalm:howto`; value always `'1'`; `=== '1'` boolean gate only; never interpolated into HTML; static howto markup in `index.html`; Got it → `markHowtoSeen()` then home |
| 3. no unexpected network | **PASS** — no `fetch` / beacon / XHR / analytics / AdMob in `src/` / `public/` / `index.html` from share or howto; share uses Web Share / clipboard only (no `url` field); ads stubs unchanged |
| Hint / Cleared / prior MVP | **Still OK** — no regression |
| Dependencies | **PASS** — prod audit 0; vitest-only moderate (dev) |

---

## Delta findings (vs SECURITY-REPORT-IMPROVE-1810 @ 867f64b)

### D1 — Layout grid `innerHTML` still uses static LAYOUTS (Low / note — **prior F1 OPEN**)

- **File:** `src/main.ts:140-152`
- **Evidence:** Unchanged pattern — `grid.innerHTML = ''` then `btn.innerHTML` with `layout.name` / `layout.description` / boolean-derived status / hardcoded Next badge from compile-time `LAYOUTS` only.
- **Crafted `clearedLayouts` ids:** membership only; values never interpolated into HTML.
- **LAYOUTS strings:** all 12 `id`/`name`/`description` ASCII prose; no `<>&"` characters (rescanned).
- **Risk:** Unchanged — not exploitable today; future CMS/user layouts with same pattern would be XSS.
- **Remediation (non-blocking):** Prefer `createElement` + `textContent`.

### D2 — Prior F2 `.gitignore` secret globs — **still REMEDIATED**

- **Evidence:** `.gitignore` lines 7–9: `.env`, `.env.*`, `!.env.example`.

### D3 — Full `npm audit` vitest-only moderates (Info / note — **prior F3 unchanged**)

- `npm audit --omit=dev` → **0 vulnerabilities** (zero production dependencies).
- Full audit: 2 moderate in `@vitest/mocker` / `vitest` (GHSA-82fw-gwwq-j7x9) — **dev/test only**, not in `dist/`.
- Non-blocking; same acceptance as prior reports.

### D4 — New: win Share surface (no finding)

- Covered under Master focus 1; no High/Critical/Medium.

### D5 — New: first-run howto flag (no finding)

- Covered under Master focus 2; no High/Critical/Medium.

**No new High/Critical/Medium findings in Unreleased delta (e222c60).**

---

## Focus detail

### 1. share/clipboard text safe

| Check | Evidence | Result |
|-------|----------|--------|
| Builder pure / offline | `src/game/share.ts:1-6` — comment + `buildWinShareText`; no I/O | OK |
| Format | `` `MahjongCalm — cleared ${name} in ${n} moves` ``; name trim/fallback `'layout'`; moves `floor` + `max(0,…)` | OK |
| Name source | `shareWin` (`main.ts:85-96`): `getLayout(state.layoutId)?.name ?? state.layoutId`; `getLayout` = `LAYOUTS.find` (`layouts/index.ts:267-269`); `state.layoutId` set only via `createGame(LAYOUTS[i])` (`main.ts:169-172`) | Static id map only |
| Share API | `navigator.share({ title: 'MahjongCalm', text })` — **no `url`**; catch → clipboard | OK |
| Clipboard | `navigator.clipboard.writeText(text)` or `legacyCopy` via `textarea.value = text` (`main.ts:56-83`) — not `innerHTML` | OK |
| Toast | Always static `'Copied share text'` via `toast()` → `#toast.textContent` (`main.ts:46-54`, `72-73`) — **share string never enters toast/DOM HTML** | OK |
| Win meta | `$('#win-meta').textContent` (`main.ts:183`) — parallel safe sink | OK |
| Wire | `#btn-win-share` → `shareWin()` (`main.ts:321`; `index.html:98`) | OK |
| Tests | `tests/share-howto.test.ts` — format, floor/clamp, blank name (3 tests) | Covered |

XSS via share string: **not applicable** in-app — text never assigned to HTML sinks. External share targets receive plain text.

### 2. howto localStorage flag

| Check | Evidence | Result |
|-------|----------|--------|
| Key | `HOWTO_KEY = 'mahjongcalm:howto'` (`persist.ts:66-67`) — separate from `mahjongcalm:v1` blob | OK |
| Write | `markHowtoSeen()` sets `'1'` only (`persist.ts:77-83`) | OK |
| Read | `isHowtoSeen()` → `getItem(HOWTO_KEY) === '1'` boolean (`persist.ts:69-75`) | OK |
| First-run | Boot: `if (!isHowtoSeen()) showScreen('howto')` else home (`main.ts:382-386`) | Once until Got it |
| Got it | `#btn-howto-ok` → `markHowtoSeen()` + home (`main.ts:274-278`; `index.html:43`) | Persists |
| Flag vs HTML | Flag value **never** interpolated into HTML/`innerHTML`/`textContent`; only gates `showScreen('howto'\|'home')` which toggles `.hidden` by `dataset.screen` (`main.ts:40-44`) | OK |
| Howto content | Static markup in `index.html:33-45` | OK |
| Manual reopen | `#btn-howto` → `showScreen('howto')` without clearing flag (`main.ts:273`) — intentional re-read; flag still not in HTML | OK |
| Tests | `tests/share-howto.test.ts` — false until mark; persists `'1'` (2 tests) | Covered |

Tampering localStorage to clear/set `'1'` only affects whether howto shows — no injection path.

### 3. no unexpected network

| Surface | Evidence | Result |
|---------|----------|--------|
| App `src/` / `public/` / `index.html` | No `fetch` / `sendBeacon` / `XMLHttpRequest` / `WebSocket` / `gtag` / `admob` / `ca-app-pub` (only SVG `xmlns` URLs) | OK |
| Share / howto paths | No network calls; Web Share + clipboard only | OK |
| Ads | `src/ads/stubs.ts` — UI overlays + `textContent`; no network | Still OK |
| Dist | Vite modulepreload `fetch` in bundled asset only (same as prior); PWA SW via `vite-plugin-pwa` | Still OK |
| PWA base | `vite.config.ts` `base: '/mahjongcalm/'` | Still OK |

---

## Checklist (RELEASE_GATE)

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Authn / sessions / tokens | N/A → PASS | No accounts, cookies, or tokens |
| 2 | Authz / IDOR / roles | N/A → PASS | Client-only game; no privileged routes |
| 3 | Secrets & config | PASS | No keys; ads stubs; `.gitignore` `.env*` (D2) |
| 4 | API surface & rate limits | N/A → PASS | No app API |
| 5 | Injection (XSS / eval / HTML) | PASS_WITH_NOTES | D1/F1 only; share/howto/toast safe; no `eval` / `document.write` / `outerHTML` / `insertAdjacentHTML` |
| 6 | Uploads & file access | N/A → PASS | None |
| 7 | Dependencies & supply chain | PASS | Prod audit clean; D3 vitest-only |
| 8 | Logging / error leakage | PASS | Ad stub in-memory log only |
| 9 | Transport (TLS / cookies / HSTS) | N/A → PASS | Static host; no cookie auth |
| 10 | Admin / debug surfaces | PASS | None |

### MVP / prior regression — Still OK

| Area | Status |
|------|--------|
| Ads stubs (no AdMob / network) | Still OK |
| Offline / no telemetry | Still OK — share/howto add no network |
| PWA base `/mahjongcalm/` | Still OK |
| Secrets in repo / dist | Still OK — none found |
| Persist coerce / no credentials | Still OK (`mahjongcalm:v1` + separate howto flag) |
| Hint stock / Cleared UI | Still OK — HUD/`home-progress`/`win-meta` via `textContent`; Cleared/Next boolean+static |
| Canvas faces | Still OK — geometric draws only |
| Prior F1 layout innerHTML | **OPEN** (Low note) — no regression, no new exploit |
| Prior F2 `.gitignore` `.env*` | **REMEDIATED** (held) |

---

## Commands run (evidence)

| Command | Result |
|---------|--------|
| `git rev-parse HEAD` | `e222c60d092a105dd2eb2c6feb6112dc8b3b250d` |
| `date` | 2026-09-28 18:18 PKT |
| `npm test` | **17/17 passed** (engine 9 + ads 1 + hints 2 + share-howto 5) |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` (full) | 2 moderate (vitest / @vitest/mocker only) |
| Grep sinks / network / secrets / howto / share | As above |
| LAYOUTS string scan | No `<>&"` in id/name/description |

**Not done (per brief):** no product code edits; no git push.

---

## Notes

- Client-controlled `localStorage` (`mahjongcalm:v1` + `mahjongcalm:howto`) remains tamperable by design for an offline game — not a ship blocker with no server trust boundary.
- Prior F1 (layout `innerHTML`) intentionally left open; share/howto delta does not touch that sink — **no regression, no new exploit path**.
- Prior F2 (`.gitignore` `.env*`) remains closed.
- `registerSw()` in `src/main.ts` remains a no-op; production SW registration via `vite-plugin-pwa` → `dist/registerSW.js` (unchanged posture).
- Share text could theoretically contain odd characters if future layouts added unsafe names into `LAYOUTS` *and* those names were later put into HTML sinks; today names are static-safe and share path uses text APIs / `textContent` only.

---

## Sign-off

**Verdict:** PASS_WITH_NOTES  
**Ship blockers:** none  
**Prior layout-innerHTML note (F1):** still open (Low); not a blocker; crafted clearedLayouts ids cannot inject  
**Prior F2 `.env*` gitignore:** remediated (held)  
**MVP / IMPROVE-1810 regression:** Still OK (offline, ads stubs, PWA base, secrets, coerce, hint, Cleared)  
**Sign-off:** **CLEAR** — eligible for QA / dual-clear path once Product/QA gates pass. Address D1/F1 as polish; D3 optional Vitest upgrade.
