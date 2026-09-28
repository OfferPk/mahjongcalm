# MahjongCalm — Status

**Status:** READY_FOR_QA  
**Updated:** 2026-09-28T18:15:00+05:00 (PKT)  
**Version:** 0.1.0 + Unreleased improve  
**Assignee:** Software Engineer 2 (SE2)  
**Project ID:** `proj_mahjongcalm_001`  
**Path:** `/workspace/factory/projects/mahjongcalm`

## Gates

| Gate | Result |
|------|--------|
| `npm test` | **12/12 passed** (engine 9 + ads 1 + hints 2) |
| `npm run build` | **green** (tsc + vite + PWA SW; base `/mahjongcalm/`) |

## Unreleased improve (READY_FOR_QA)

Post-ship polish pack (inbox `IMPROVE-mahjongcalm-20260928-1808.md`):

1. **Hint remaining cue** — HUD stock on `#btn-hint` (`Hints: N free left` / `Hints: ad` / `Hints: unlimited` when adsRemoved); refresh after free bump; rewarded overlay path kept.
2. **Layout clear progress clarity** — card meta `Cleared ✓ ·` / `Not cleared ·`; first uncleared **Next** badge; home `· Next: {name}` or `All layouts cleared`. No new lock economy.

See `CHANGELOG.md` → Unreleased · `HANDOFF.md`.

## Shipped (MVP v0.1.0)

- Vite + TS + Canvas + PWA (`base: /mahjongcalm/`)
- Classic free-tile rule + match + win; even-face deal
- 12 handcrafted layouts; ~26 geometric faces (original)
- Hint + Shuffle; Home / layouts / play / win / settings
- Ads stubs + remove-ads; mute + progress localStorage
- Vitest: free rule, match, deal parity, meadow smoke, ads
- README + GUIDE-roman-urdu.md + CHANGELOG 0.1.0

## Notes

- No licensed mahjong art / Vita branding
- No git push until Master dual-clear
- No real AdMob / IAP keys
- Do not amend v0.1.0 release commit
