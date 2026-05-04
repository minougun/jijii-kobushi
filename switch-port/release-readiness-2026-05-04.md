# Release Readiness 2026-05-04

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Web URL: `https://minougun.github.io/jijii-kobushi/`
GitHub: `https://github.com/minougun/jijii-kobushi`
Unity project: `/mnt/c/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/UnityProject`

## Current State

- Branch: `main`
- Local HEAD: `d068dee0ad7da0074c0aa57b07193b8f7f265750`
- Remote baseline: `origin/main` at `7e2a38bc91e5510f5fdab2cbd9d2ec5a49cba47e`
- Local branch is 37 commits ahead of `origin/main`.
- Working tree was clean after the local verification pass.

## Included Work

- Mobile/Web layout and cut-in preload work.
- Switch Stage 1 portable data pack, validator, runner, and Unity-facing handoff docs.
- Unity Stage 1 local prototype source, scene scaffold, all-stage smoke gates, and local player smoke build path.
- Stage 1 location correction to `うさぎ公園`.
- HOLD visibility fixes in the Unity prototype.
- BGM attribution display.
- Stage 7 and all-stage Hard balance tuning based on 10,000-run simulations.
- ED bonus mash balance tuning so Hard no longer requires unrealistically tight mash timing.

## Balance Result

Main game, 10,000-run simulator:

- 1周目 Hard late-stage clear rates:
  - `mountain`: 86%
  - `garage`: 85%
  - `redgate`: 88%
  - `finalhideout`: 88%
- 2周目 Hard late-stage clear rates:
  - `mountain`: 75%
  - `garage`: 71%
  - `redgate`: 74%
  - `finalhideout`: 72%

ED bonus:

- Hard loop 1: max mash 7, tightest mash 166ms.
- Hard loop 2: max mash 7, tightest mash 149ms.

## Verification Completed

- `npm run check`
- `npm run simulate:difficulty`
- `npm run simulate:ending`
- `npm run audit:timing`
- `npm run review:persona`
- `npm run validate:switch-stages`
- `npm run check:switch-stage1`
- Unity EditMode batch tests: 6/6 passed.
- Unity PlayMode batch tests: 7/7 passed.
- Unity Windows player smoke: exit code 0, `stage=誘拐の朝`, `location=うさぎ公園`.

Note: Unity player smoke was run with `-nographics`, so shader unsupported logs appeared in the player log. The smoke gate itself exited successfully.

## External Operations

Not executed:

- `git push`
- GitHub Pages deployment / production publish
- PR creation or merge
- Any Nintendo/Switch external submission

`Issue/PR: not_applicable` for this local verification pass.

## Suggested Next Gate

Before publishing, run a final `git status --short --branch`, then push `main` only after confirming the target remote is still `https://github.com/minougun/jijii-kobushi`.

