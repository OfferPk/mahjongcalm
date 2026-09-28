# HANDOFF — MahjongCalm Unreleased improve (post v0.1.0)

**Status:** READY_FOR_QA  
**Version:** 0.1.0 + Unreleased  
**Assignee executed:** SE2 (Master assignment; brief suggested SE1)  
**Local:** `/workspace/factory/projects/mahjongcalm`  
**Push:** not done (await dual-clear)

## What landed

1. **Hint remaining cue** — `src/game/hints.ts` (`FREE_HINTS`, `freeHintsRemaining`, `formatHintStock`); play HUD `#hud-hints` on `#btn-hint`; refresh after free bump / paint / remove-ads; rewarded stub path unchanged.
2. **Layout clear progress clarity** — `renderLayoutGrid` meta prefixes + `.next` / Next badge; `refreshHome` Next name or All cleared.

## Out of scope (unchanged)

New layouts/faces, real AdMob, soft-lock redesign, online, `base: /mahjongcalm/`.

## Verify

```bash
npm test
npm run build
# confirm vite base still /mahjongcalm/
```

## Key paths

- `src/game/hints.ts` · `src/main.ts` · `index.html` · `src/style.css`
- `tests/hints.test.ts`
- `CHANGELOG.md` · `STATUS.md` · this `HANDOFF.md`
