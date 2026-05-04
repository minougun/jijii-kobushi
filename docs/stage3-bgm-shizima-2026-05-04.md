# Stage 3 BGM Replacement 2026-05-04

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Web URL: `https://minougun.github.io/jijii-kobushi/`
GitHub: `https://github.com/minougun/jijii-kobushi`

## Change

- Stage 3 `伊藤道場` now uses `shizima4.mp3` / `BGM_TRACKS.shizima` instead of reusing Stage 1 `koiwazurai.mp3`.
- Stage 3 BPM was adjusted from `84` to `85`, matching PeriTune's published `Shizima4` BPM.
- The stage BGM profile now uses `cue: "静寂 道場"`, `overlay: "low"`, and `tone: "night"` for a quieter dojo training mood.

## Source

- Official track page: `https://peritune.com/blog/2021/06/06/shizima4/`
- Official usage page: `https://peritune.com/about/`
- Official free material list: `https://peritune.com/freematerial_list/`

The license and commercial-use decision should always follow the current official PeriTune pages, not this memo.

## Verification

- `npm run check`
- `npm run audit:timing`
- `npm run simulate:difficulty`
