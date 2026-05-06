# eShop Media Asset Plan

Date: 2026-05-06

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Web URL: `https://minougun.github.io/jijii-kobushi/`
GitHub: `https://github.com/minougun/jijii-kobushi`

## NDA-safe Status

Exact eShop pixel dimensions, file types, upload slots, and validation rules must be taken from the approved Nintendo portal. This plan defines content and capture intent only.

## Current Runtime Visual Sources

- Opening still: `assets/images/op-title-kakizome-hanshi-v1.png`
- Character sheet: `assets/images/jii-kobushi-chibi-character-sheet-v1.png`
- Special cut-in: `assets/images/kojiro-cutin.png`
- Final reveal: `assets/images/hasegawa-reveal-sprite-v7.png`
- Stage backgrounds:
  - `assets/images/stage-bg-shotengai-v1.webp`
  - `assets/images/stage-bg-warehouse-v1.webp`
  - `assets/images/stage-bg-riverside-v1.webp`
  - `assets/images/stage-bg-mountain-v1.webp`
  - `assets/images/stage-bg-garage-v1.webp`
  - `assets/images/stage-bg-redgate-v1.webp`
  - `assets/images/stage-bg-finalhideout-v1.webp`
- ED videos:
  - `assets/video/ending.mp4`
  - `assets/video/ending-loop2.mp4`

## Screenshot Shot List

Use final portal-required aspect ratios after approval. Capture from the Switch build when possible. Until then, use the Unity local prototype only for composition rehearsal.

1. Opening title
   - Shows the vertical `爺コブシ` opening still.
   - Purpose: brand recognition.

2. Stage 1 battle: うさぎ公園
   - Shows Kojiro, `黒腕章の使い`, rhythm lane, HP/score UI.
   - Purpose: first-time gameplay clarity.

3. Stage 3 dojo: 爺コブシ training
   - Shows Ito Dojo and the moment before/after internal destruction unlock.
   - Purpose: story hook and skill unlock.

4. Stage 5 or 6 battle pressure
   - Shows denser notes, enemy attack feel, and commercial result UI if relevant.
   - Purpose: rhythm challenge.

5. Stage 7 final boss
   - Shows `スーパーステロイドX` without revealing too much of the unmasking.
   - Purpose: boss escalation.

6. ED bonus
   - Shows video preview plus rhythm lane.
   - Purpose: post-clear bonus value.

7. Loop 2 doodle mode
   - Shows the deliberately rough doodle-style alternate presentation.
   - Purpose: replayability twist.

## Icon Direction

Recommended icon concept:

- Face-forward Kojiro with microphone.
- Large brush-style `爺` or `爺コブシ` mark.
- High contrast background, not too text-heavy.
- Avoid tiny rhythm-lane details.
- Keep visible at small sizes.
- Match the Web favicon/OGP hook so browser sharing and eShop browsing feel like the same product.

Candidate source elements:

- `kojiro-cutin.png` for Kojiro face energy.
- `op-title-kakizome-hanshi-v1.png` for brush identity.
- `jii-kobushi-chibi-character-sheet-v1.png` for in-game character consistency.

Open task:

- [ ] Generate or hand-compose a final icon after portal size requirements are known.
- [ ] Verify legibility at icon sizes used by Nintendo UI.
- [ ] Confirm no hidden third-party text or logos.
- [ ] Prepare a Web OGP card variant from the same composition if the current opening-still preview underperforms in social previews.

## Trailer Plan

Target trailer structure:

1. 0-3s: Opening still and title.
2. 3-8s: Kidnapping premise and Kojiro taking the mic.
3. 8-20s: Tap/hold/mash gameplay across Stage 1/2.
4. 20-32s: Ito Dojo and `爺コブシ・内部破壊`.
5. 32-45s: Secret Society X enemy montage.
6. 45-55s: Super Steroid X tease.
7. 55-65s: ED bonus and loop-2 doodle twist.
8. End card: title, release window, supported language/platform text after portal confirmation.

Trailer capture checklist:

- [ ] Capture from Switch hardware if possible.
- [ ] Avoid showing dev kit UI, debug overlays, mouse cursor, browser chrome, or Unity Editor UI.
- [ ] Use final BGM levels and no unlicensed temporary audio.
- [ ] Avoid spoilers around the final unmasking unless used as a deliberate marketing beat.
- [ ] Confirm store trailer specs in portal before encoding.

## Media QA

- [ ] All screenshots are from current game state, not old Web-only visuals.
- [ ] No Portal/NDA/devkit text visible.
- [ ] No OS notifications or usernames visible.
- [ ] Captures represent actual Switch build performance.
- [ ] ED video is animated, not the earlier live-action source.
- [ ] Loop 2 screenshot clearly communicates intentional doodle mode, not broken rendering.
