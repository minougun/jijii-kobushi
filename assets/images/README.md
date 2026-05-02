# Image Assets

This directory keeps only runtime image assets used by the game.
Reference-only candidates and old generated sources were removed on 2026-05-03.

## Active Opening

- `op-title-kakizome-hanshi-v1.png`
  - Use: active opening title still for the game's first screen.
  - Creation mode: built-in image generation.
  - Source date: 2026-04-30.
  - Runtime reference: `index.html`.

## Active Characters And Effects

- `jii-kobushi-chibi-character-sheet-v1.png`
  - Use: active character sheet for the in-game hero and enemies.
  - Runtime reference: `src/renderer.js`.

- `jii-kobushi-imagegen-atlas-v1.png`
  - Use: generated visual atlas for fallback enemy crops and legacy background strips.
  - Runtime reference: `src/renderer.js`.

- `kojiro-cutin.png`
  - Use: special move face cut-in banner.
  - Runtime reference: `src/renderer.js`.

- `super-steroid-x-horse-mask-v1.png`
  - Use: active final-boss standing sprite for `スーパーステロイドX`.
  - Runtime reference: `src/renderer.js`.

- `hasegawa-reveal-sprite-v7.png`
  - Use: active unmasked `長谷川` reveal sprite after `スーパーステロイドX` removes the horse headpiece.
  - Runtime reference: `src/renderer.js`.

## Active Backgrounds

Each stage background is WebP-first with a PNG fallback. Both formats are runtime assets.

- `stage-bg-shotengai-v1.webp` / `stage-bg-shotengai-v1.png`
- `stage-bg-warehouse-v1.webp` / `stage-bg-warehouse-v1.png`
- `stage-bg-riverside-v1.webp` / `stage-bg-riverside-v1.png`
- `stage-bg-mountain-v1.webp` / `stage-bg-mountain-v1.png`
- `stage-bg-garage-v1.webp` / `stage-bg-garage-v1.png`
- `stage-bg-redgate-v1.webp` / `stage-bg-redgate-v1.png`
- `stage-bg-finalhideout-v1.webp` / `stage-bg-finalhideout-v1.png`

Runtime reference: `src/renderer.js`.

## Active Overlay Motif

- `enka-wave-band.svg`
  - Use: active lower-half background band for intro and battle scenes.
  - Creation mode: hand-authored SVG asset.
  - Runtime reference: `src/renderer.js`.
