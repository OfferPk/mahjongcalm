# MahjongCalm — Security Review Report

**Date:** 2026-09-28 18:05 PKT (Asia/Karachi, UTC+05:00)  
**Project:** `/workspace/factory/projects/mahjongcalm`  
**HEAD reviewed:** `0f4e457` (`0f4e457a736e9b211ab9f726244ff1727dd59170`) — docs STATUS; MVP feat `0464160`  
**Version:** 0.1.0  
**Reviewer:** Security Reviewer (executor)  
**Gate:** `/workspace/factory/shared/security/RELEASE_GATE.md`  
**Verdict:** **PASS_WITH_NOTES**  
**Sign-off:** **CLEAR** (no ship blockers)

---

## Ship blockers

**None.**

No secrets/API keys in source or build, no untrusted-input XSS, no unexpected network/telemetry/AdMob SDKs, no privileged auth surface, production dependency audit clean (`npm audit --omit=dev` → 0 vulnerabilities).

---

## Master focus summary

| Focus | Result |
|-------|--------|
| 1. localStorage integrity | **PASS** — parse harden + coerce; no credentials |
| 2. XSS in UI | **PASS_WITH_NOTES** — most sinks use `textContent`; one static `innerHTML` (layouts) |
| 3. Ads stubs | **PASS** — UI overlays only; no AdMob keys / network ads |
| 4. PWA / base path | **PASS** — `base: '/mahjongcalm/'`; SW scope `/mahjongcalm/`; precache scoped |
| 5. Secrets | **PASS** — none in repo / dist |
| 6. Offline-only / telemetry | **PASS** — no app `fetch` / beacon / analytics |

---

## Findings

### F1 — Layout grid uses `innerHTML` with static layout strings (Low / note)

- **File:** `src/main.ts:74-79`
- **Evidence:** `grid.innerHTML = ''` then `btn.innerHTML = \`<span class="name">${layout.name}</span>...\`` where `layout` comes from compiled `LAYOUTS` (`src/layouts/index.ts`), not from `localStorage` or user input.
- **Risk:** Not exploitable in current MVP (names/descriptions are fixed ASCII prose, no `<`/`&`). Future CMS/user layouts would become XSS if the same pattern is reused.
- **Remediation (non-blocking):** Prefer `createElement` + `textContent` for name/meta spans (defense in depth).
- **Other UI sinks:** toast, HUD, win meta, ads overlays, settings all use `textContent` (`src/main.ts:46,56,61-67,90-92,109,145,161-162`). Canvas face labels are geometric draws only (`src/ui/canvas.ts`, `src/game/faces.ts`) — no HTML text injection.

### F2 — `.gitignore` omits common secret patterns (Info / note)

- **File:** `.gitignore` (lines 1–5: `node_modules`, `dist`, `.DS_Store`, `*.local`, `.dev-logs`)
- **Evidence:** No `.env`, `.env.*`, or credential globs. No `.env` files present; no secret-like paths tracked in git.
- **Risk:** Accidental commit of future AdMob/IAP env files.
- **Remediation (non-blocking):** Add `.env`, `.env.*`, `!.env.example` before introducing real keys.

### F3 — Full `npm audit` moderate findings are Vitest-only (Info / note)

- **Evidence:** `npm audit --omit=dev` → **0 vulnerabilities** (zero production dependencies). Full audit: 2 moderate in `@vitest/mocker` / `vitest` (GHSA-82fw-gwwq-j7x9) — **dev/test tree only**, not shipped in `dist/`.
- **Risk:** Local/CI Vitest misuse only; not a runtime ship risk for the offline PWA.
- **Remediation (non-blocking):** Plan Vitest upgrade when convenient; do not expose Vitest tooling to untrusted networks.

---

## Checklist (RELEASE_GATE)

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Authn / sessions / tokens | N/A → PASS | No accounts, cookies, or tokens |
| 2 | Authz / IDOR / roles | N/A → PASS | Client-only game; no privileged routes |
| 3 | Secrets & config | PASS | No keys; ads are stubs (`src/ads/stubs.ts`) |
| 4 | API surface & rate limits | N/A → PASS | No app API |
| 5 | Injection (XSS / eval / HTML) | PASS_WITH_NOTES | See F1; no `eval` / `document.write` / `outerHTML` / `insertAdjacentHTML` |
| 6 | Uploads & file access | N/A → PASS | None |
| 7 | Dependencies & supply chain | PASS | Prod audit clean; F3 notes vitest-only |
| 8 | Logging / error leakage | PASS | Ad stub in-memory log only; no remote logging |
| 9 | Transport (TLS / cookies / HSTS) | N/A → PASS | Static Pages host responsibility; no cookie auth |
| 10 | Admin / debug surfaces | PASS | No debug endpoints |

### Focus detail

**localStorage (`src/game/persist.ts`)**  
- Key: `mahjongcalm:v1`  
- Fields: `clearedLayouts: string[]`, `mute`, `adsRemoved`, `freeHintsUsed` — progress/flags only; **no credentials**  
- Hardening: `try/catch` on read/write; `Array.isArray` + `map(String)` + `Set` dedupe; `Boolean(...)`; `Math.max(0, Number(...) \|\| 0)`  
- Consumed as Set membership / counts / button labels via `textContent` — not HTML-interpolated  

**Ads stubs (`src/ads/stubs.ts`)**  
- `showInterstitial` / `showRewarded` / `purchaseRemoveAds` / `isAdsRemoved`  
- Presenters write overlay copy with `textContent`; no SDK, no `ca-app-pub`, no network  

**PWA / base**  
- `vite.config.ts`: `base: '/mahjongcalm/'`; Workbox `globPatterns` for static assets; `manifest: false` (uses `public/manifest.webmanifest` with `scope`/`start_url` `./`)  
- Build evidence: `dist/registerSW.js` registers `/mahjongcalm/sw.js` with `{ scope: '/mahjongcalm/' }`; `dist/index.html` asset hrefs under `/mahjongcalm/`; SW precache limited to app assets + NavigationRoute → `index.html`  

**Offline / telemetry**  
- Grep: no app `fetch(`, `sendBeacon`, `gtag`, `analytics`, `admob` in `src/` / `public/` / `index.html`  
- Bundle contains only Vite modulepreload `fetch` polyfill (same-origin assets), not product telemetry  

---

## Commands run (evidence)

| Command | Result |
|---------|--------|
| `git rev-parse HEAD` | `0f4e457a736e9b211ab9f726244ff1727dd59170` |
| `npm test` | **10/10 passed** (engine 9 + ads 1) |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` (full) | 2 moderate (vitest / @vitest/mocker only) |
| Grep sinks / network / secrets | As above; no committed secrets |

**Not done (per brief):** no product code edits; no git push.

---

## Notes

- Client-controlled `localStorage` progress (cleared layouts, adsRemoved stub) is tamperable by design for an offline game — not a ship blocker with no server trust boundary.
- `src/main.ts` `registerSw()` is a no-op; production registration is injected by `vite-plugin-pwa` into `dist/index.html` → `registerSW.js` (verified).
- STATUS.md still lists MVP commit `0464160`; reviewed tree HEAD is docs commit `0f4e457` on top of that MVP.

---

## Sign-off

**Verdict:** PASS_WITH_NOTES  
**Ship blockers:** none  
**Sign-off:** **CLEAR** — eligible for QA / dual-clear publish path once Product/QA gates pass. Address F1–F3 as polish, not blockers.

