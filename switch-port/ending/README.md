# Switch Ending Bonus Portable Pack

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Web URL: `https://minougun.github.io/jijii-kobushi/`
GitHub: `https://github.com/minougun/jijii-kobushi`

This folder tracks the portable data contract for the Web ending bonus game. The Web version plays the ending video audio as the backing track and overlays the same tap / hold / mash rhythm rules used by the main game.

## Files

- `ending-bonus.stage.json`: Loop 1 and Loop 2 ending bonus charts for Easy / Normal / Hard.
- `ending-bonus.expected-results.json`: Deterministic parity results for six input profiles across both loops and all difficulties.

## Regeneration

```bash
npm run export:switch-ending-bonus
npm run validate:switch-ending-bonus
```

`validate:switch-ending-bonus` regenerates the expected payload in memory and fails if the tracked files drift from `src/ending-bonus.js` or `src/rhythm.js`.

## Porting Notes

- Use the real ending video audio as the clock source when the video is available.
- Use `fallbackDurationMs` when the runtime cannot read video duration before chart setup.
- Loop 2 and later use the loop-plus ED video source and the loop-adjusted chart config.
- Mash notes are constrained to at least 105ms per required tap in the generated chart summaries.
