# MahjongCalm — Status

**Status:** READY_FOR_QA  
**Updated:** 2026-09-28T18:16:30+05:00 (PKT)  
**Version:** 0.1.1 + Unreleased improve  
**Assignee:** Software Engineer 3 (SE3)  
**Project ID:** `proj_mahjongcalm_001`  
**Path:** `/workspace/factory/projects/mahjongcalm`

## Gates

| Gate | Result |
|------|--------|
| `npm test` | **17/17 passed** (engine 9 + ads 1 + hints 2 + share-howto 5) |
| `npm run build` | **green** (tsc + vite + PWA SW; base `/mahjongcalm/`) |

## Unreleased improve (READY_FOR_QA)

Post-v0.1.1 polish pack (inbox `IMPROVE-mahjongcalm-20260928-1808.md` tasks 1–2 only; hint+layout already shipped in 0.1.1 — not rebuilt):

1. **Win Share** — `#btn-win-share` on Cleared! overlay; text `MahjongCalm — cleared {layout name} in N moves`; `navigator.share` or clipboard + toast; offline-only.
2. **First-run howto (once)** — missing `mahjongcalm:howto` → auto howto; Got it → Home + persist; later launches skip; manual How to play always; A2HS after howto OK.

See `CHANGELOG.md` → Unreleased · `HANDOFF.md`.

## Shipped

### v0.1.1
- Hint remaining cue + layout Cleared/Next progress clarity

### v0.1.0
- Vite + TS + Canvas + PWA (`base: /mahjongcalm/`)
- Classic free-tile rule + match + win; 12 layouts; geometric faces
- Hint + Shuffle; ads stubs; mute + progress localStorage

## Notes

- No licensed mahjong art / Vita branding
- No git push until Master dual-clear
- No real AdMob / IAP keys
- Do not amend v0.1.0 / v0.1.1 release commits
- Do not rebuild hint-stock or Cleared/Next layout pack
