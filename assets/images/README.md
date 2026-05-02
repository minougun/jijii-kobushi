# Image Assets

- `op-title-scroll.png`
  - Use: legacy opening title still. Replaced because the paper read as a short strip rather than a kakizome-style long hanshi sheet.
  - Creation mode: composite raster asset. The title lettering comes from built-in image generation, then local alpha extraction removes the generated checkerboard preview background before compositing onto a vertical hanshi strip over a generated wooden floor.
  - Source date: 2026-04-30.
  - Reference image: user-provided vertical paper-strip title photo in this Codex session.
  - Prompt/style summary: a large vertical paper strip on a dark wooden floor with generated rough, heavy black brush lettering reading `爺コブシ`, framed like a low-budget Showa-era dramatic opening card. The floor is straight wooden planks, not wave or seigaiha patterning.
  - Rendering note: retained as a previous source/reference. `index.html` now uses `op-title-kakizome-hanshi-v1.png`.

- `op-title-kakizome-hanshi-v1.png`
  - Use: active opening title still for the game's first screen.
  - Creation mode: built-in image generation.
  - Source date: 2026-04-30.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_0c91b26f403a59340169f2e4cbcf3081919377d2c84a4999b4.png`.
  - Prompt/style summary: a straight, long vertical kakizome calligraphy paper sheet on dark wooden flooring, with exact vertical black sumi brush lettering `爺コブシ`, fully visible and centered.
  - Rendering note: `index.html` displays this file in the `opening` phase before the standard title/difficulty selection.

- `op-wood-floor-background-v1.png`
  - Use: generated wooden flooring background source for the opening title still.
  - Creation mode: built-in image generation.
  - Source date: 2026-04-30.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_01c1da0a6e3033540169f2b52712948191acf8f11619b26cd4.png`.
  - Prompt summary: warm top-down wooden flooring with horizontal planks, natural wood grain, soft vignette, no paper, no text, and no wave/water/seigaiha decoration.
  - Rendering note: cropped/resized to 960x540 and used as the base layer for `op-title-scroll.png`.

- `op-title-brush-calligraphy-v1.png`
  - Use: transparent generated brush-calligraphy source for the opening title.
  - Creation mode: built-in image generation, followed by local alpha extraction from the generated checkerboard preview background.
  - Source date: 2026-04-30.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_01c1da0a6e3033540169f2b12b0a1c81918163aad5120510d1.png`.
  - Prompt summary: transparent-background, vertical Japanese brush-calligraphy title text, exact text `爺コブシ`, deep black sumi ink, rough dry-brush edges, no extra words or background.
  - Rendering note: retained as the reusable transparent lettering layer; `op-title-scroll.png` is the active composited OP still.

- `super-steroid-x-horse-mask-v1.png`
  - Use: active final-boss standing sprite for `スーパーステロイドX`.
  - Creation mode: built-in image generation, followed by local edge-connected checkerboard background removal.
  - Source date: 2026-04-30.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_01c1da0a6e3033540169f2b7713aa08191980244b54cfc91e0.png`.
  - Prompt summary: elderly Japanese man in a large white horse headpiece, ordinary polo shirt, beige chinos, belt, loafers, relaxed chibi paper-cutout game sprite, transparent background.
  - Rendering note: `src/renderer.js` draws this asset before the generic chibi enemy sheet whenever the enemy kind is `steroidBoss`.

- `hasegawa-reveal-sprite-v7.png`
  - Use: active unmasked `長谷川` reveal sprite after `スーパーステロイドX` removes the horse headpiece.
  - Source date: 2026-05-03.
  - Source image: `/mnt/c/Users/minou/jii-kobushi/assets/images/hasegawa-reveal-sprite-v6.png`.
  - Reference image: `/mnt/c/Users/minou/jii-kobushi/assets/images/super-steroid-x-horse-mask-v1.png`.
  - Editing note: derived from the optimized transparent v6 sprite; only the polo shirt was recolored to the horse-mask boss's muted blue-gray, and the placket was standardized to two pale buttons. Face, pose, horse headpiece, pants, belt, shoes, outline, and transparency are preserved.
  - Rendering note: `src/renderer.js` loads this file for the 1st-loop final reveal `hasegawaReveal` path.

- `jii-kobushi-pop-paper-character-sheet-v1.png`
  - Use: previous pop-color candidate sheet for the in-game hero and enemies. It was too visually strong for the active world tone and is retained as a reference.
  - Creation mode: local raster style pass derived from `jii-kobushi-paper-puppet-character-sheet-v1.png`.
  - Source date: 2026-04-30.
  - Reference image: `/mnt/c/Users/minou/Downloads/jExk5rOBOhYxK7jvtVxfmojh.avif`.
  - Prompt/style summary: pop rhythm-game-inspired flat colors, thick black outlines, yellow backing, reduced texture, saturated red/purple/gold/blue accents, while keeping the original Kojiro and X結社 character identities.
  - Rendering note: retained for reference. The active runtime crop path now points at `jii-kobushi-chibi-character-sheet-v1.png`.

- `jii-kobushi-loose-paper-character-sheet-v1.png`
  - Use: retained reference/candidate sheet for the in-game hero and enemies.
  - Creation mode: local raster style pass derived from `jii-kobushi-paper-puppet-character-sheet-v1.png`.
  - Source date: 2026-04-30.
  - Prompt/style summary: relaxed paper-puppet pass with softer charcoal outlines, restrained saturation, preserved paper texture, and enough costume color to keep each character readable in the enka game world.
  - Rendering note: retained for reference after persona review found it weaker than both the pre-cutout chibi art and the original paper-puppet sheet. The active runtime crop path now points at `jii-kobushi-chibi-character-sheet-v1.png`.

- `jii-kobushi-paper-puppet-character-sheet-v1.png`
  - Use: previous active paper-puppet character sheet. It is retained as the stage-identity reference for future refinements.
  - Generation mode: built-in image generation tool.
  - Source prompt date: 2026-04-30.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_0453a7b91628e3450169f2829a2c3081919750140198116960.png`.
  - Prompt summary: flat paper-puppet concept sheet with thick black outlines, elderly red-tracksuit Kojiro, purple kimono Kojiro, masked/hooded/scientist/armored/operator/boss enemy variants, paper texture, and tabletop cutout shadows.
  - Rendering note: retained as the reference for paper-stage silhouette and cutout shadow treatment. The active runtime crop path now points at `jii-kobushi-chibi-character-sheet-v1.png`.

- `jii-kobushi-chibi-character-sheet-v1.png`
  - Use: active character sheet for the in-game hero and enemies.
  - Generation mode: built-in image generation tool.
  - Source prompt date: 2026-04-30.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_05308d43be55ad090169f2527419708191be468bef6c407833.png`.
  - Prompt summary: 5x2 sheet of cute chibi RPG-style full-body character assets for stage 1 Kojiro, kimono Kojiro, masked underlings, hooded agent, scientist, armored brute, scout, operator, captain, and final boss.
  - Rendering note: `src/renderer.js` uses the sheet as a 5x2 sprite grid, removes the edge-connected light checker background, trims with larger padding so full-body characters do not clip, and draws the sprites with the paper-cutout shadow treatment retained from the paper-puppet direction.

- `jii-kobushi-imagegen-atlas-v1.png`
  - Use: primary generated visual atlas for enemies and stage backgrounds.
  - Generation mode: built-in image generation tool.
  - Source prompt date: 2026-04-29.
  - Prompt summary: single 2D browser game art atlas containing Tateishi Kojiro in stage-1 red tracksuit with 500ml drink bottle, Kojiro in deep purple kimono with microphone, masked secret-society enemy variants, and three pixel-art-inspired background strips for park, warehouse, and final hideout.
  - Rendering note: `src/renderer.js` crops the atlas at runtime. Character crops remove edge-connected light background pixels; background strips remain opaque and are scaled into the Canvas scene.

- `stage-bg-shotengai-v1.png`
  - Use: active generated Stage 1 background, `誘拐の朝`.
  - Runtime note: `stage-bg-shotengai-v1.webp` is loaded first; this PNG remains the fallback source.
  - Generation mode: built-in image generation tool, resized locally to 960x540 for runtime.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_0ce839819b80093d0169f2f74ed09c8191af34e0e12d37165c.png`.
  - Prompt summary: morning Japanese neighborhood park, no characters, no text, no signs, wide side-view rhythm-game background.

- `stage-bg-warehouse-v1.png`
  - Use: active generated Stage 2 background, `港の倉庫`.
  - Runtime note: `stage-bg-warehouse-v1.webp` is loaded first; this PNG remains the fallback source.
  - Generation mode: built-in image generation tool, resized locally to 960x540 for runtime.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_0ce839819b80093d0169f2f78b8d8481918a85b9da8f9c497f.png`.
  - Prompt summary: harbor warehouse loading bay, crates, shutters, cool work lights, no characters, no text, no signs.

- `stage-bg-riverside-v1.png`
  - Use: active generated Stage 3 background, `伊藤道場`.
  - Runtime note: `stage-bg-riverside-v1.webp` is loaded first; this PNG remains the fallback source.
  - Generation mode: built-in image generation tool, resized locally to 960x540 for runtime.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_0ce839819b80093d0169f2f7d3ce04819199e1475feccce0c1.png`.
  - Prompt summary: old Japanese training dojo interior by a riverside, no characters, no text, no calligraphy.

- `stage-bg-mountain-v1.png`
  - Use: active generated Stage 4 background, `峠道`.
  - Runtime note: `stage-bg-mountain-v1.webp` is loaded first; this PNG remains the fallback source.
  - Generation mode: built-in image generation tool, resized locally to 960x540 for runtime.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_0ce839819b80093d0169f2f81da09c819192c0912b53e35714.png`.
  - Prompt summary: Japanese mountain pass road at dusk with guardrails and forest, no characters, no text, no signs.

- `stage-bg-garage-v1.png`
  - Use: active generated Stage 5 background, `改造車庫`.
  - Runtime note: `stage-bg-garage-v1.webp` is loaded first; this PNG remains the fallback source.
  - Generation mode: built-in image generation tool, resized locally to 960x540 for runtime.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_0ce839819b80093d0169f2f87d671c81918ae72436849dbc33.png`.
  - Prompt summary: modified car garage and audio weapon workshop, speakers, cables, warning lights, no characters, no text.

- `stage-bg-redgate-v1.png`
  - Use: active generated Stage 6 background, `赤門`.
  - Runtime note: `stage-bg-redgate-v1.webp` is loaded first; this PNG remains the fallback source.
  - Generation mode: built-in image generation tool, resized locally to 960x540 for runtime.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_0ce839819b80093d0169f2f8c6b4588191a4302dd60aaaaa52.png`.
  - Prompt summary: ominous red gate courtyard at night, lanterns and black walls, no characters, no text.

- `stage-bg-finalhideout-v1.png`
  - Use: active generated Stage 7 background, `X結社本部`.
  - Runtime note: `stage-bg-finalhideout-v1.webp` is loaded first; this PNG remains the fallback source.
  - Generation mode: built-in image generation tool, resized locally to 960x540 for runtime.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dd73c-a423-77d2-9c9f-672d24a0aaba/ig_0ce839819b80093d0169f2f93d3a50819197ad8a7496809608.png`.
  - Prompt summary: dark final hideout hall, throne-like stage, purple-black shadows and gold lamps, no characters, no text.

- `enka-wave-band.svg`
  - Use: active lower-half background band for intro and battle scenes.
  - Creation mode: hand-authored SVG asset.
  - Source date: 2026-04-30.
  - Prompt summary: dark enka-style seigaiha/wave motif with gold and cream linework, subtle center glow, and top/bottom shade layers.
  - Rendering note: `src/renderer.js` loads this as an `Image` and draws it into the lower Canvas band. The previous Canvas-drawn wave paths remain replaced by this SVG asset, with only a simple gradient fallback while the SVG is still loading.

- `kojiro-hetauma-imagegen-v1.png`
  - Use: reference/candidate protagonist sheet for Tateishi Kojiro. It is not currently the active in-game hero; `src/renderer.js` now uses `jii-kobushi-chibi-character-sheet-v1.png` first and falls back to the loose Canvas `drawLooseHero()` path only while the active sheet is not ready.
  - Generation mode: built-in image generation tool.
  - Source prompt date: 2026-04-29.
  - Source path: `/home/minougun/.codex-wsl/generated_images/019dc5ad-2486-7840-88e5-b213f4c5ca2b/ig_0359402d1e6b393f0169f16042bf948191a4d5e236a44e73c5.png`.
  - Prompt summary: two loose hand-drawn, hetauma-style full-body variants of Tateishi Kojiro: stage-1 red tracksuit with 500ml PET bottle and later-stage purple kimono with microphone.
  - Rendering note: `src/renderer.js` crops each full-body sprite and removes edge-connected light background pixels at runtime.

- `kojiro-spritesheet-v1.png`
  - Use: reference-only 2026-04-28 stage 2 onward Kojiro sprite candidate. The active in-game hero is `jii-kobushi-chibi-character-sheet-v1.png`.
  - Generation mode: built-in image generation tool.
  - Source prompt date: 2026-04-28.
  - Prompt summary: 4x2 pixel-art sprite sheet of Tateishi Kojiro, an elderly Japanese enka singer in a deep purple kimono with microphone, white collar, silver obi, gold wave pattern, grey side hair, tabi/sandals, and arcade side-scroller style poses.
  - Rendering note: the generated sheet has a white background; `src/renderer.js` removes only the white background connected to the image edges at runtime so white collar/tabi details remain visible.

- `kojiro-stage1-red-jersey-spritesheet-v1.png`
  - Use: reference-only 2026-04-28 stage 1 red tracksuit Kojiro sprite candidate. The active in-game hero is `jii-kobushi-chibi-character-sheet-v1.png`.
  - Generation mode: built-in image generation tool.
  - Source prompt date: 2026-04-28.
  - Prompt summary: 4x2 pixel-art sprite sheet of Tateishi Kojiro as a two-head-tall elderly Japanese enka singer in a red tracksuit, with microphone, grey side hair, strong eyebrows, black shoes, and eight rhythm-action poses.
  - Rendering note: the generated sheet has a light checker pattern; `src/renderer.js` removes edge-connected light neutral pixels at runtime.

- `kojiro-cutin.png`
  - Use: special move face cut-in banner.
  - Generation mode: built-in image generation tool.
  - Source prompt date: 2026-04-27.
  - Prompt summary: previous wide anime-style cut-in illustration of the elderly Japanese grandfather hero, with only the red kimono/haori recolored to deep purple. The face, microphone, fist pose, night speed lines, and cherry blossom petals remain from the prior design. No logo or readable text.
  - Reference role: user-provided image was used only as color direction for the purple kimono.
