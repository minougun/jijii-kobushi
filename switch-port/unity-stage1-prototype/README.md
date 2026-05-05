# Unity Stage 1 Local Prototype

This directory is a lightweight preparation area for a normal Unity local prototype. The tracked repo contents intentionally stop at portable C# source, Unity-facing test code, and local planning docs. Unity-generated folders such as `Library/`, `Temp/`, `Obj/`, and `UserSettings/` must stay untracked.

Recommended placement:

- Keep the prototype source in this repo under `UnityProject/Assets/Scripts/`.
- Create or open the actual Unity editor project locally from `UnityProject/` only when needed.
- Do not copy SDK, NDA, portal, certificate, key, or platform-specific files into this tree.

This keeps the Stage 1 prototype close to the port pack while avoiding large generated Unity project churn in Git.

## Scope

- Stage 1 playable parity remains the reference gate: `うさぎ公園` (`shotengai` remains the legacy internal JSON key/file name)
- All seven stage JSON packs can be loaded in the placeholder scene for data-path smoke testing
- Local Unity prototype only
- Placeholder rendering is acceptable
- JSON-driven chart and metadata
- Audio-clock-driven judgement
- Local BGM playback for the Stage 1 track when `assets/audio/koiwazurai.mp3` is available
- Automated parity tests against the Stage 1 portable runner

Out of scope:

- Final seven-stage gameplay progression and production stage-select UI
- Final renderer migration
- Production deployment
- External submission
- Platform-specific SDK, NDA, portal, certificate, or key material

## Stage 1 Port Pack

Use the tracked Stage 1 pack:

- `../stage1/shotengai.stage.json`
- `../stage1/unity-spec.md`
- `../stage1/expected-results.json`
- `../stage1/pseudocode-csharp.md`
- `../stage1/state-machine.md`
- `../stage1/test-cases.md`

The broader stage-pack smoke data lives under:

- `../stages/stage01-shotengai.stage.json`
- `../stages/stage02-warehouse.stage.json`
- `../stages/stage03-riverside.stage.json`
- `../stages/stage04-mountain.stage.json`
- `../stages/stage05-garage.stage.json`
- `../stages/stage06-redgate.stage.json`
- `../stages/stage07-finalhideout.stage.json`

Reference source paths:

- Local repo: `/mnt/c/Users/minou/jii-kobushi`
- Web URL: `https://minougun.github.io/jijii-kobushi/`
- GitHub: `https://github.com/minougun/jijii-kobushi`
- Handoff: `/mnt/c/Users/minou/jii-kobushi/docs/switch-port-handoff-2026-05-03.md`

## Implemented Prototype Core

The current prototype body lives under:

```text
UnityProject/Assets/Scripts/
```

Key files:

- `Data/StageData.cs`
- `Data/StageJsonLoader.cs`
- `Data/RuntimeAssetCatalog.cs`
- `Data/RuntimeAssetImportPlanner.cs`
- `Rhythm/RhythmJudge.cs`
- `Audio/AudioClock.cs`
- `Input/RhythmAction.cs`
- `Input/RhythmInputFrame.cs`
- `Input/IRhythmInputAdapter.cs`
- `Input/KeyboardGamepadInputAdapter.cs`
- `Battle/BattleSimulator.cs`
- `Battle/InteractiveBattleSession.cs`
- `Tests/ProfileTestRunner.cs`
- `UnityProject/Assets/Tests/EditMode/Stage1PortableParityTests.cs`
- `UnityProject/Assets/Tests/PlayMode/Stage1PrototypePlayModeSmokeTests.cs`
- `View/PlaceholderRendererBehaviour.cs`

Unity-facing files:

- `UnityProject/Packages/manifest.json`
- `UnityProject/ProjectSettings/ProjectVersion.txt`
- `UnityProject/Assets/Scenes/Stage1Prototype.unity`

`ProfileTestRunner` locates the tracked Stage 1 pack (`switch-port/stage1/shotengai.stage.json` and `switch-port/stage1/expected-results.json`), verifies that the stage location is `うさぎ公園`, simulates `perfect`, `steady`, `early`, `late`, `mash-weak`, and `mash-heavy` for Easy, Normal, and Hard, then compares clear, score, rank, maxCombo, judge counts, miss-by-type, and HP.

It also runs an all-stage smoke gate over `switch-port/stages/`. The gate loads all seven stage packs, checks the expected stage id/title/location order, BGM asset path existence, shared timing constants, loop-1 and loop-plus chart summaries, note id order, note type payloads, and a perfect-run S-rank simulation for each difficulty.

`Stage1PrototypePlayModeSmokeTests` starts the playable placeholder runner in Play Mode, verifies that the Stage 1 session loads, confirms the location remains `うさぎ公園`, checks that the local BGM file referenced by the JSON can be found before manual playtesting, smoke-loads Stage 3 and Stage 7 from the all-stage pack, verifies that a cleared result can advance to Stage 2, confirms scenario lines load from the stage JSON, verifies file-backed run save/load, runs a debug perfect-clear pass through all seven stage packs in order, and confirms the final stage can hand off to the playable ED bonus chart.

`RunSaveSnapshot` and `RunSaveService` define the portable save contract before wiring in any platform API. The Play Mode placeholder now uses `FileRunSaveStore` under `Application.persistentDataPath/JiiKobushiRunSaves`, with `MemoryRunSaveStore` as a fallback if file storage cannot be initialized. Later Switch work should replace only the `IRunSaveStore` implementation. `FileRunSaveStore` and `RunSaveCodec` provide a deterministic UTF-8 save payload for local smoke tests and future platform-storage adaptation. The snapshot preserves difficulty, loop, stage number, HP, total score, and compact stage result rows. Cleared non-final stages resume at the next stage, final-stage completion resumes at the next loop's Stage 1, and defeat snapshots keep the same stage with HP restored for retry.

`InteractiveBattleSession` is the first playable prototype layer. It advances the same audio-clock timeline, accepts tap/mash and hold inputs, resolves miss timeouts, applies enemy damage on missed tap/hold notes, and returns score/rank/result data using the same scoring function as the simulator.

It also supports the first pause/resume path: pause freezes the battle clock and note expiry, suspends rhythm input consumption, and pauses BGM playback when an `AudioSource` is active.

HP 0 now enters an explicit `Failed` phase, while full chart completion with HP remaining enters `Result`. The placeholder result panel mirrors this distinction with `FAILED` versus `RESULT` headings.

`EndingBonusInteractiveSession` mirrors the ED bonus tap/hold/mash API against the portable ED chart. The ED chart can place tap notes inside mash spans, so this session resolves overlapping notes by time window instead of using the stricter one-note-at-a-time stage cursor.

In Play Mode, the ED bonus now attempts to load the Web original ED video path from the portable ending pack (`./assets/video/ending.mp4` for loop 1 and `./assets/video/ending-loop2.mp4` for loop 2+). When Unity can prepare the video, `VideoPlayer.time` becomes the ED bonus clock and the same preview texture is drawn behind the rhythm lane. If the video file is unavailable or cannot be prepared in a headless environment, the prototype falls back to the deterministic rhythm clock so parity tests remain stable.

`RuntimeAssetCatalog` loads `../assets/runtime-assets.json` and resolves Web original asset paths such as `./assets/audio/koiwazurai.mp3` into Unity-readable files. Runtime lookup now goes through `RuntimeAssetPathUtility.ResolveRuntimePath`, preferring `StreamingAssets/JiiKobushi/...` when staged files exist, then falling back to the Web original local repo path for Editor work. This keeps asset lookup tied to the Web manifest instead of ad hoc directory walking. `RuntimeAssetImportPlanner` remains the import-readiness checker and separates blocking manifest gaps from local skip-worktree image warnings.

`RuntimeAssetStreamingStage` can copy currently available local runtime files into `UnityProject/Assets/StreamingAssets/JiiKobushi/` for packaged-player smoke tests. The generated binaries are intentionally ignored; the source of truth remains the Web original asset manifest and tracked Git objects.

`StageRuntimeVisualAssets` maps the seven portable stage ids to the Web original PNG background sources and fixes the current Web chibi character-sheet sprite contract for the player and enemy kinds. `PlaceholderRendererBehaviour` loads backgrounds through the same runtime asset resolver, so the Editor and built smoke player can draw staged `StreamingAssets` backgrounds when available while still falling back to local Web-original files during development. The character-sheet map keeps the Unity port aligned with the Web `renderer.js` sprite indices until the final renderer replaces the placeholder IMGUI layer.

`KeyboardGamepadInputAdapter` maps the temporary keyboard/gamepad controls into logical rhythm actions through `RhythmInputBindingProfile`. `PlaceholderRendererBehaviour` consumes those actions instead of reading physical keys directly, so later controller mappings can be swapped without touching battle judgement.
The same input path now covers run-save controls: `F5` / generic shoulder-left saves the current run slot, and `F9` / generic shoulder-right loads the current loop slot.

`PlaceholderRendererBehaviour` now includes a temporary playable HUD: HP, score, combo, judge counts, current note, scenario preview, result panel, Prev/Next stage buttons, footer `Save`/`Load` buttons, result-panel `Next Stage` progression, final-stage `ED Bonus` handoff, and a simple rhythm lane that draws upcoming `TAP`, `HOLD`, and `MASH` notes against a gold hit line. Low-level IMGUI rectangle and meter drawing lives in `PrototypeGui`, reusable status panels live in `PrototypeStatusPanel`, footer/input controls live in `PrototypeFooterControls`, result-card pieces live in `PrototypeResultPanel`, and note-lane presentation lives in `PrototypeRhythmLane`, keeping the scene driver focused on game state and layout. `HOLD` notes include a yellow `RELEASE` marker at the note end so the button-up timing is visible.

The local result panel mirrors the Web original result-screen redesign: a large rank badge, score headline, stat tiles, and clearer stage/ED actions instead of raw debug text. It is still IMGUI placeholder rendering, but the information hierarchy now follows the commercial-style Web result card.

The playable placeholder now keeps a run-level stage result list while advancing through the seven stage packs. After the final stage hands off to the ED bonus, the ED result panel shows the same broad structure as the Web original final screen: total rank, stage average, stage total, ED beat bonus, and compact per-stage rank/combo/accuracy rows.

Run-level result aggregation is owned by `Assets/Scripts/Battle/RunProgressTracker.cs`, not the view behaviour. The tracker records or replaces each stage summary, resets on difficulty/loop changes, calculates the stage total and average, and derives the final rank through the same score thresholds as `BattleSimulator`.

The seven-stage order is owned by `Assets/Scripts/Data/StagePackCatalog.cs`. The Play Mode renderer and parity runner both resolve stage file names, ids, titles, and location labels through this catalog so the visible Unity stage flow cannot drift from the validation gates.

PlayMode progression tests also use `StagePackCatalog` for expected titles and locations, keeping manual scene flow, data validation, and Unity smoke tests on the same stage order.

Stage background paths are now derived from `StagePackCatalog` through `StageRuntimeVisualAssets`, so the background lookup cannot keep a separate stale stage-id map.

The ED bonus handoff uses the portable ED chart, the same placeholder rhythm lane/input buttons, and the Web original video/audio asset when Unity can prepare it. The deterministic rhythm clock remains as the fallback path for CI/headless validation.

ED bonus debug-perfect input generation is owned by `Assets/Scripts/Battle/EndingBonusPerfectInputPlanner.cs`. The Play Mode runner and EditMode parity tests both use the same planner, so mash-safe perfect input scheduling does not drift between UI smoke tests and deterministic validation.

Stage battle debug-perfect input generation is owned by `Assets/Scripts/Battle/StagePerfectInputPlanner.cs`. The Play Mode runner and EditMode parity tests both use the same planner, so tap/hold/mash perfect-clear scheduling does not drift between manual smoke shortcuts and simulator parity checks.

In Play Mode, `PlaceholderRendererBehaviour` loads the Stage 1 BGM from the tracked Web asset path in the JSON (`./assets/audio/koiwazurai.mp3`) and drives the battle clock from Unity DSP time while the clip is playing. If the local BGM file cannot be found or decoded, it falls back to the deterministic `deltaTime` clock and shows the fallback status in the HUD.

`Assets/Editor/Stage1PrototypeSceneSetup.cs` adds the `Jijii Kobushi > Setup Stage 1 Prototype Scene` editor menu. It makes `Stage1Prototype.unity` visible in Scene view by adding a Main Camera, Directional Light, placeholder stage board, gold hit line, and Tap/Hold/Mash marker cubes.

`Assets/Editor/Stage1PrototypeBuild.cs` adds the `Jijii Kobushi > Build Windows Prototype` editor menu and a batch-mode `BuildWindowsPrototype` method. This is a local standalone player smoke build only; it does not use Nintendo SDK material or external submission tooling.

The Stage 1 JSON uses dictionary-shaped objects and profile keys such as `mash-weak`, so the prototype does not use Unity `JsonUtility` for these files. It uses a small dependency-free loader in `StageJsonLoader.cs` and maps only the fields needed by the Stage 1 prototype.

Editor check procedure:

- `editor-check-procedure.md`

## Prototype Success Criteria

The local prototype is ready for the next decision gate when it can:

1. Load `../stage1/shotengai.stage.json`.
2. Run Easy, Normal, and Hard with an audio-clock timeline.
3. Apply count-in `3.0s`.
4. Place the first note at virtual timeline `4200ms`.
5. Judge tap, hold, and mash according to `../stage1/unity-spec.md`.
6. Produce score, rank, maxCombo, judge counts, HP, and clear.
7. Match `../stage1/expected-results.json` for `perfect`, `steady`, `early`, `late`, `mash-weak`, and `mash-heavy`.
8. Allow manual local play in `Stage1Prototype.unity` with keyboard or placeholder OnGUI buttons.
9. Load the Stage 1 BGM locally and keep the manual timeline synced to the audio clock when available.
10. Pause and resume the local run without advancing note deadlines or leaving BGM playing.
11. Load all seven tracked stage packs in Unity-side tests and verify stage order, labels, BGM paths, loop-1 and loop-plus chart shape, and perfect-run sanity.
12. Load the ED bonus portable pack and match Loop 1 / Loop 2 expected results for all three difficulties and six input profiles.

## Recommended Local Verification

Before comparing Unity results, run the JS reference:

```bash
cd /mnt/c/Users/minou/jii-kobushi
npm run check
npm run check:switch-stage1
npm run validate:switch-stages
npm run check:switch-ending
```

Unity test output should be compared to `../stage1/expected-results.json`, not hand-entered chart constants.

The standalone C# CLI can also run the Unity-side all-stage smoke gate:

```bash
switch-port/unity-stage1-prototype/Stage1PortableCli.exe --all-stages
```

`--all-stages` also runs the ED bonus parity gate and runtime asset catalog smoke gate. The ED-only gate is:

```bash
switch-port/unity-stage1-prototype/Stage1PortableCli.exe --ending
```

The asset-only gate is:

```bash
switch-port/unity-stage1-prototype/Stage1PortableCli.exe --assets
```

The save-contract smoke gate is:

```bash
switch-port/unity-stage1-prototype/Stage1PortableCli.exe --save
```

When Unity Test Runner does not emit a fresh XML file in batch mode, use the editor validation method. It compiles in Unity and runs the same portable parity gates:

```bash
"/mnt/c/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" \
  -batchmode \
  -projectPath "C:/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/UnityProject" \
  -executeMethod JijiiKobushi.Stage1Prototype.EditorTools.Stage1PrototypeValidation.RunPortableParityChecks \
  -validationOutput "C:/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/unity-portable-parity.txt" \
  -logFile "C:/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/unity-validation.log" \
  -quit
```

Unity batch mode can also build a local Windows smoke player:

```bash
"/mnt/c/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" \
  -batchmode \
  -projectPath "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\UnityProject" \
  -executeMethod JijiiKobushi.Stage1Prototype.EditorTools.Stage1PrototypeBuild.BuildWindowsPrototype \
  -buildOutput "Builds\Windows\Stage1Prototype.exe" \
  -logFile "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\unity-build-windows.log" \
  -quit
```

The `Builds/` directory is ignored and should stay out of Git.

The generated player also supports a local smoke-exit flag:

```bash
switch-port/unity-stage1-prototype/UnityProject/Builds/Windows/Stage1Prototype.exe \
  -batchmode \
  -nographics \
  -jijiiSmokeQuit \
  -logFile "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\unity-player-smoke.log"
```

This verifies that the built player starts, loads the Stage 1 data, writes a smoke line, and exits without human input.

Manual Play Mode controls:

- `Space` or `Z`: tap / mash
- Gamepad `A` / Submit: tap / mash
- `X` or `J`: hold down / hold release
- Gamepad `B`: hold down / hold release
- `P` or `Esc`: pause / resume
- `Enter`: restart
- `F5`: save current run slot
- `F9`: load current loop slot
- Gamepad `Select`: pause / resume
- Gamepad `Start`: restart
- Generic gamepad left/right shoulder: save / load current run slot
- On-screen `Tap / Mash`, `Hold`, `Save`, `Load`, `Pause/Resume`, `Restart`, and difficulty buttons provide the same local placeholder controls.
