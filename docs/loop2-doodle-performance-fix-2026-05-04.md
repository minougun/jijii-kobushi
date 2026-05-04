# Loop 2 Doodle Performance Fix 2026-05-04

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Web URL: `https://minougun.github.io/jijii-kobushi/`
GitHub: `https://github.com/minougun/jijii-kobushi`

## Cause

Loop 2+ battle/intro/rest screens use the doodle renderer. The static doodle background was being rebuilt every rendered frame:

- white fill
- random-looking pixel noise
- notebook grid lines
- stage title text
- sign and background doodles

The CSS rule `html.doodle-loop .shell { filter: contrast(...) saturate(...) }` also forced expensive full-surface compositing while the Canvas was animating.

## Fix

- Added a bounded offscreen Canvas cache for static loop-2 doodle backgrounds in `src/renderer.js`.
- `drawDoodleLoopScene()` now draws the cached background and only redraws animated characters, notes, hit effects, and the rhythm bar each frame.
- Removed the full-shell CSS `filter` from `src/styles.css`; the doodle look remains in the actual line/color styling.
- Bumped `renderer.js`, `main.js`, and `styles.css` cache-busting query strings.

## Verification

- `npm run check`
- `npm run review:persona`
- `npm run audit:timing`
- `npm run simulate:difficulty`
- local production-style asset fetch through `npm run serve`
