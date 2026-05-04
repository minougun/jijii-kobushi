# Web Restore With ED Exception 2026-05-04

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Web URL: `https://minougun.github.io/jijii-kobushi/`
GitHub: `https://github.com/minougun/jijii-kobushi`

## Goal

Restore the browser game behavior and UI to the state before the Switch port work, while keeping the ED video replacement work.

## Baseline

- Web restore baseline: `9de9b36 Fix mobile layout and cut-in preload`
- Kept ED changes:
  - `assets/video/ending.mp4`
  - `assets/video/ending-loop2.mp4`
  - ED video lazy loading and cache-busted ED URLs in `src/main.js`

## Web Files Restored

- `src/stages.js`
- `src/styles.css`
- `index.html`, except the ED video tag remains `preload="none"` and the script URL is cache-busted.

## Verification

- `npm run check`
- `npm run simulate:difficulty`
- `npm run audit:timing`
- `npm run check:switch-ending`

`npm run check:switch-port` was intentionally not used as the gate for this web rollback because the Switch export packs are based on later port-work stage data and will need their own regeneration if the restored web stage data becomes the new Switch baseline.
