# Balance Simulation 2026-05-04

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Web URL: `https://minougun.github.io/jijii-kobushi/`

## Goal

Use the existing 10,000-run difficulty simulator to remove late Hard-stage choke points without flattening Easy and Normal.

Target shape:

- Easy: tutorial-friendly and broadly clearable.
- Normal: stable clear for a mode-matched player, with score/rank still leaving room to improve.
- Hard loop 1: late stages should feel demanding, not impossible.
- Hard loop 2: harder than loop 1, but not a coin-flip wall for a skilled player.

## Before

`npm run simulate:difficulty` before this pass showed the late Hard stages were too strict:

| Scope | mountain | garage | redgate | finalhideout |
| --- | ---: | ---: | ---: | ---: |
| Hard loop 1 clear | 84% | 62% | 77% | 74% |
| Hard loop 2 clear | 47% | 50% | 64% | 59% |

The biggest issue was not Easy/Normal. It was Hard-stage HP pressure after stage 4, especially 2周目.

## Change

Added Hard-only stage relief in `src/stages.js`.

- `HARD_STAGE_RELIEF`: applies to Hard loop 1+ for stages 4-7.
- `HARD_LOOP_STAGE_RELIEF`: applies only from loop 2 onward for stages 4-7.
- Easy/Normal chart density, HP, and damage factors are unchanged.
- Stage 7 mash cap from the previous fix remains unchanged.

## After

`npm run simulate:difficulty` after the pass:

| Scope | mountain | garage | redgate | finalhideout |
| --- | ---: | ---: | ---: | ---: |
| Hard loop 1 clear | 86% | 85% | 88% | 88% |
| Hard loop 2 clear | 75% | 71% | 74% | 72% |

Cross-check:

- Skilled same-player Hard loop 1: avg clear 92%, min clear 85%.
- Skilled same-player Hard loop 2: avg clear 82%, min clear 71%.

This keeps Hard above Normal in density and execution demand, while removing the previous late-stage wall.

## Verification

- `npm run check`
- `npm run simulate:difficulty`

