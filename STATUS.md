# MahjongCalm — Status

**Status:** READY_FOR_QA  
**Updated:** 2026-09-28T18:05:00+05:00 (PKT)  
**Version:** 0.1.0  
**Assignee:** Software Engineer (executor)  
**Project ID:** `proj_mahjongcalm_001`  
**Path:** `/workspace/factory/projects/mahjongcalm`
**Commit / HEAD:** `0464160300b5ad11eb7b7dd761f2e5c5b397da4d`

## Gates

| Gate | Result |
|------|--------|
| `npm test` | **10/10 passed** (engine 9 + ads 1) |
| `npm run build` | **green** (tsc + vite + PWA SW; base `/mahjongcalm/`) |

## Shipped (MVP)

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
