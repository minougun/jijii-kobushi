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
- Unity-side ED bonus interactive session for tap/hold/mash API parity, including overlap-safe mash sections in the ED chart.
- Unity prototype ED bonus video/audio integration: the local Play Mode runner now resolves the Web original ED video assets through the runtime manifest, uses `VideoPlayer.time` as the ED bonus clock when available, and falls back to the deterministic rhythm clock in headless/unavailable environments.
- Unity prototype final result aggregation: the local Play Mode runner now keeps seven-stage result summaries through the ED bonus handoff and displays a Web-like final result panel with total rank, stage average, stage total, ED beat bonus, and compact per-stage rows.
- Unity prototype run-progress architecture: seven-stage result aggregation now lives in `RunProgressTracker` with EditMode coverage for record/replace/reset behavior, so the view behaviour no longer owns score averaging and final-rank calculations.
- Unity prototype stage-pack architecture: the seven-stage file/id/title/location order now lives in `StagePackCatalog`, shared by the Play Mode renderer and parity runner to prevent stage-flow drift.
- First-loop ED video replacement: live-action video track was replaced with a fully illustrated in-game anime-style sequence while preserving the original ED audio.
- Loop-2-and-later ED video replacement: the doodle ED is now derived from the illustrated first-loop ED instead of the older live-action-shaped sequence.
- ED loading optimization: the ED `<video>` no longer carries an initial `src`; the first-loop video is assigned only when the ED starts.
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
- Unity EditMode batch tests: 10/10 passed.
- Unity PlayMode batch tests: 8/8 passed.
- Unity Windows player smoke: exit code 0, `stage=誘拐の朝`, `location=うさぎ公園`.
- 2026-05-05 continuation: Unity portable parity: pass (`stages=7`, `stageProfileResults=252`, `endingProfileResults=36`, `runtimeAssets=35`).
- 2026-05-05 continuation: Unity PlayMode batch tests: 9/9 passed after the ED video asset smoke assertion.
- 2026-05-05 continuation: Unity PlayMode batch tests: 9/9 passed after adding the seven-stage result carryover assertion into the ED bonus handoff.
- 2026-05-05 continuation: Unity Windows player smoke: exit code 0, `stage=誘拐の朝`, `location=うさぎ公園`, `clock=audio`.
- 2026-05-05 continuation: Switch-port cleanup removed unused placeholder debug renderer code (`PlaceholderRenderer`/`PlaceholderFrame`, unused timeline/default-path helpers). Commented-out code and hidden UI leftovers were re-scanned; no actionable leftovers remained.
- 2026-05-05 continuation: run-progress tracking was extracted from `PlaceholderRendererBehaviour` into `RunProgressTracker`; `npm run check:switch-port` passed immediately after the refactor and after adding the tracker EditMode test.
- 2026-05-05 continuation: duplicated stage pack arrays were replaced with `StagePackCatalog`; `npm run check:switch-port` and standalone C# all-stage smoke passed after the change.
- 2026-05-05 continuation: PlayMode stage progression tests now read expected titles/locations from `StagePackCatalog`; Unity PlayMode batch tests regenerated `unity-playmode-results.xml` with 9/9 passed.
- 2026-05-05 continuation: stage background lookup now derives `stage-bg-<id>-v1.png` paths from `StagePackCatalog`; `npm run check:switch-port`, standalone C# all-stage smoke, and Unity portable parity passed after the change.
- 2026-05-05 continuation: ED bonus perfect-input generation was extracted into `EndingBonusPerfectInputPlanner`; `npm run check:switch-port`, standalone C# ED smoke, and Unity portable parity passed after the change.
- 2026-05-05 continuation: stage battle perfect-input generation was extracted into `StagePerfectInputPlanner`; `npm run check:switch-port`, standalone C# all-stage smoke, Unity portable parity, Unity PlayMode 9/9, Unity EditMode 20/20, and `npm run check` passed after the change.
- 2026-05-05 continuation: keyboard/generic-gamepad controls were centralized in `RhythmInputBindingProfile` so later platform controller mappings can replace bindings without changing rhythm judgement or the Play Mode runner.
- 2026-05-05 continuation: stale Unity prototype docs were updated after cleanup so they no longer refer to the removed `PlaceholderRenderer.cs` helper or obsolete Resource-copy paths.
- 2026-05-05 continuation: runtime asset path resolution was centralized in `RuntimeAssetPathUtility.ResolveRuntimePath`; the Play Mode renderer now shares the same StreamingAssets-first/local-Web-original fallback path as EditMode tests.
- 2026-05-05 continuation: low-level IMGUI rectangle and meter drawing was extracted into `PrototypeGui`, reducing `PlaceholderRendererBehaviour` surface area before the production UI migration.
- 2026-05-05 continuation: reusable result-card drawing helpers were extracted into `PrototypeResultPanel`, further separating temporary IMGUI presentation pieces from the Unity scene driver.
- 2026-05-05 continuation: rhythm-lane note marker rendering was extracted into `PrototypeRhythmLane`, isolating temporary lane presentation from stage/ED session state.
- 2026-05-05 continuation: HUD, stage info, and judge-summary panel rendering was extracted into `PrototypeStatusPanel`, keeping `PlaceholderRendererBehaviour` closer to orchestration only.
- 2026-05-05 continuation: temporary footer controls and on-screen Tap/Hold buttons were extracted into `PrototypeFooterControls`, leaving the scene driver to provide callbacks and state only.
- 2026-05-05 continuation: platform-neutral run-save snapshots were added to the Unity prototype. The save contract mirrors the Web run-slot split (`FirstLoop` / `LoopPlus`), carries cleared-stage progress to the next stage, resets completed runs to the next loop, and keeps the storage behind `IRunSaveStore` so the later Switch save API can replace the current memory store.
- 2026-05-05 continuation: standalone C# CLI parity now includes a run-save smoke gate (`Stage1PortableCli.exe --save` and `--all-stages`), covering save snapshot creation and progress restoration without relying on Unity Test Runner XML output.
- 2026-05-05 continuation: run-save snapshots now have a deterministic UTF-8 codec and `FileRunSaveStore`. Japanese stage titles are Base64 encoded inside the save rows, and the CLI smoke gate verifies encode/decode plus file save/load round trips.
- 2026-05-05 continuation: the Unity Play Mode placeholder now wires run saves into the footer with `Save`/`Load` controls. Runtime storage uses `FileRunSaveStore` at `Application.persistentDataPath/JiiKobushiRunSaves` with a memory-store fallback, keeping the later Switch storage replacement isolated behind `IRunSaveStore`.
- 2026-05-05 continuation: Unity PlayMode smoke now asserts that run-save data is written as an actual `first-loop.jksave` file and can be loaded back into Stage 2 progress. PlayMode batch tests passed 10/10 after this gate.
- 2026-05-05 continuation: local Windows prototype build and `-jijiiSmokeQuit` player smoke were rerun after the run-save footer work; the player exited with `stage=誘拐の朝`, `location=うさぎ公園`, and `clock=audio`.
- 2026-05-05 continuation: keyboard/generic-gamepad save and load actions were added to the input abstraction (`F5`/left shoulder to save, `F9`/right shoulder to load), so run-save controls no longer depend on the temporary OnGUI footer.
- 2026-05-05 continuation: the Unity runtime visual asset map now includes the Web chibi character-sheet contract (`5x2` grid, player variants, and all current enemy kinds), plus cut-in and final-reveal asset paths, with EditMode coverage against the runtime asset manifest.
- 2026-05-05 continuation: the Unity placeholder renderer now loads the Web chibi character sheet through the runtime asset resolver and draws the current player/enemy sprite pair from the same sprite indices used by the Web renderer. PlayMode smoke asserts that the character sheet loads.
- 2026-05-05 continuation: the Unity placeholder renderer now also loads `kojiro-cutin.png` through the runtime asset resolver and flashes it during finisher-note windows, with PlayMode smoke coverage for the cut-in texture load.
- 2026-05-05 continuation: the Unity final-stage result panel now loads and displays `hasegawa-reveal-sprite-v7.png`, with PlayMode smoke coverage on the Stage 7 pack.
- 2026-05-05 continuation: stage intros now open as a page-advancing overlay in the Unity placeholder. BGM/count-in wait until the intro lines are advanced, and PlayMode smoke covers the Stage 1 intro gate.
- 2026-05-05 continuation: the Unity placeholder now draws the current stage BGM attribution line (`Music: PeriTune`) at the lower-left of stage screens, with EditMode coverage across all seven stage packs.
- 2026-05-05 continuation: the Windows player smoke gate now advances the stage intro before exiting and asserts that the built player reaches the BGM-backed battle clock.
- 2026-05-05 continuation: an ED-specific Windows player smoke gate (`-jijiiSmokeEnding`) was added to clear the final stage, enter ED bonus mode, resolve the ED video asset, and wait for the ED clock or deterministic fallback.
- 2026-05-05 continuation: an all-stage Windows player smoke gate (`-jijiiSmokeAllStages`) was added to load stages 1-7 in the built player, advance intro gates, wait for each battle clock, perfect-clear each chart, and verify the final ED handoff state.
- 2026-05-05 continuation: a loop-plus Windows player smoke gate (`-jijiiSmokeLoopPlus`) was added to run all seven hard-mode loop 2 charts in the built player and verify the loop-plus ED video asset (`./assets/video/ending-loop2.mp4`) before exiting.
- 2026-05-05 continuation: the Windows prototype build now stages the runtime asset manifest into ignored `StreamingAssets/JiiKobushi/` before `BuildPipeline.BuildPlayer`, using local files when present and `git show HEAD:<asset>` for sparse Web-original assets. The staging report passed with 35/35 assets staged, 21 restored from Git, and zero missing/failed copies before the rebuilt player passed the stage, all-stage, loop-plus, and ED smoke gates.
- 2026-05-05 continuation: the Unity Play Mode runner now starts with a Web-like opening overlay that loads the tracked `op-title-kakizome-hanshi-v1.png`, presents Easy/Normal/Hard selection, and only reveals the preloaded Stage 1 intro after the start action.
- 2026-05-05 continuation: the temporary opening overlay drawing was extracted into `PrototypeOpeningScreen`, reducing `PlaceholderRendererBehaviour` before the production UI migration while keeping the same PlayMode opening smoke coverage.
- 2026-05-05 continuation: repeated temporary IMGUI texture decoding paths were centralized in `PrototypeTextureLoader`, so background, opening still, character sheet, cut-in, and final reveal assets now share one runtime load/status path.
- 2026-05-05 continuation: stage intro, BGM attribution, and ED video preview drawing were extracted into `PrototypeScenarioPanel`, further shrinking the temporary scene driver without changing the PlayMode smoke expectations.
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
- The largest newly added tracked files are portable JSON stage packs under `switch-port/stages/`; `assets/video/ending.mp4` is also intentionally updated and is smaller than the previous first-loop ED video.
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
