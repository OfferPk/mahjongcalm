# HANDOFF — MahjongCalm Unreleased improve (post v0.1.1)

**Status:** READY_FOR_QA  
**Version:** 0.1.1 + Unreleased (Share + first-run howto)  
**Assignee executed:** SE3  
**Local:** `/workspace/factory/projects/mahjongcalm`  
**Push:** not done (await dual-clear)

## What landed

1. **Win Share** — `#btn-win-share` on `#overlay-win`; `buildWinShareText` → `MahjongCalm — cleared {layout} in N moves`; `navigator.share` when available else clipboard + toast “Copied share text”; offline-only (no URL/network).
2. **First-run howto (once)** — `mahjongcalm:howto` via `isHowtoSeen` / `markHowtoSeen`; boot auto-shows howto when missing; Got it → Home + persist; manual How to play unchanged; A2HS tip not fought (howto first, then home+A2HS OK).

## Out of scope (unchanged)

New layouts/faces, real AdMob, soft-lock redesign, online, `base: /mahjongcalm/`, hint remaining cue, Cleared/Next badges (already in v0.1.1).

## Verify

```bash
npm test
npm run build
# confirm vite base still /mahjongcalm/
```

## Key paths

- `src/game/share.ts` · `src/game/persist.ts` · `src/main.ts` · `index.html`
- `tests/share-howto.test.ts`
- `CHANGELOG.md` · `STATUS.md` · this `HANDOFF.md` · `GUIDE-roman-urdu.md`
