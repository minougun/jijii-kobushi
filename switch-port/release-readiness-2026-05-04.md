# Release Readiness 2026-05-04

Local repo: `/mnt/c/Users/minou/jii-kobushi`
Web URL: `https://minougun.github.io/jijii-kobushi/`
GitHub: `https://github.com/minougun/jijii-kobushi`
Unity project: `/mnt/c/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/UnityProject`

## Current State

- Branch: `main`
- Remote baseline: `origin/main` at `7e2a38bc91e5510f5fdab2cbd9d2ec5a49cba47e`
- Current local HEAD is intentionally checked at release time with `git rev-parse HEAD` so this document does not become stale when the document itself is committed.
- The local ahead count is intentionally checked at release time with `git rev-list --count origin/main..HEAD`.
- Working tree was clean after the local verification pass.

## Included Work

- Mobile/Web layout and cut-in preload work.
- Switch Stage 1 portable data pack, validator, runner, and Unity-facing handoff docs.
- Unity Stage 1 local prototype source, scene scaffold, all-stage smoke gates, and local player smoke build path.
- ED bonus portable chart pack, expected profile results, and Unity-side parity checks.
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
- `npm run check:switch-ending`
- `npm run check:switch-port`
- Unity EditMode batch tests: 7/7 passed.
- Unity PlayMode batch tests: 7/7 passed.
- Unity Windows player smoke: exit code 0, `stage=誘拐の朝`, `location=うさぎ公園`.
- Added all-stage expected profile results after this pass:
  - `npm run export:switch-stage-results`
  - `npm run validate:switch-stage-results`
  - Unity EditMode now covers 7 tests, including 126 all-stage profile parity checks.
- Added ED bonus expected profile results after this pass:
  - `npm run export:switch-ending-bonus`
  - `npm run validate:switch-ending-bonus`
  - Standalone C# CLI covers 36 ED bonus profile parity checks.
  - Unity-side portable validation covers 7 stage packs, 126 stage profile checks, and 36 ED bonus profile checks.
  - `ProjectSettings/TagManager.asset` was normalized so Unity no longer reports a YAML parse warning for the prototype project.

Note: Unity player smoke was run with `-nographics`, so shader unsupported logs appeared in the player log. The smoke gate itself exited successfully.

## Pre-push Audit

- Remote verified: `origin` fetch/push points to `https://github.com/minougun/jijii-kobushi.git`.
- Ahead range: `origin/main..HEAD` contains the local commits that have not yet been pushed; confirm the current count with `git rev-list --count origin/main..HEAD` immediately before any external publication.
- No Unity generated folders are included in the ahead diff:
  - `Library/`
  - `Temp/`
  - `Obj/`
  - `UserSettings/`
  - `Build/`
  - `Builds/`
  - `Logs/`
  - `*.csproj`
  - `*.sln`
  - `unity-*.log`
  - `unity-*.xml`
- Secret scan over the ahead diff found no real secret values. Hits were limited to ordinary parser variable names such as `token` and blank Unity settings keys such as `metroCertificatePassword:` / `ps4NPTitleSecret:`.
- The largest newly added tracked files are portable JSON stage packs under `switch-port/stages/`; no new audio/video binaries are included in the ahead diff.
- Local image/video files are intentionally sparse/skip-worktree in this workspace. `npm run check` verifies those assets through the tracked Git objects when local working-tree files are absent.

## External Operations

Not executed:

- `git push`
- GitHub Pages deployment / production publish
- PR creation or merge
- Any Nintendo/Switch external submission

`Issue/PR: not_applicable` for this local verification pass.

## Suggested Next Gate

Before publishing, run a final `git status --short --branch`, then push `main` only after confirming the target remote is still `https://github.com/minougun/jijii-kobushi`.
