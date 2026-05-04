# Unity Stage Prototype File Map

This is the proposed and partially implemented file layout for a normal Unity local prototype. Stage 1 remains the exact parity reference, and the all-stage pack is available for placeholder progression. The repo tracks portable C# source under `UnityProject/Assets/Scripts/`, while generated Unity folders remain ignored.

## Proposed Unity Project Root

```text
switch-port/unity-stage1-prototype/UnityProject/
```

Tracked Unity project entry files:

```text
Packages/manifest.json
ProjectSettings/ProjectVersion.txt
Assets/Scenes/Stage1Prototype.unity
```

Keep the tracked Stage 1 port pack outside Unity-generated folders:

```text
switch-port/stage1/
  shotengai.stage.json
  unity-spec.md
  expected-results.json
  pseudocode-csharp.md
  state-machine.md
  test-cases.md
```

Keep the tracked all-stage portable pack outside Unity-generated folders:

```text
switch-port/stages/
  stage01-shotengai.stage.json
  stage02-warehouse.stage.json
  stage03-riverside.stage.json
  stage04-mountain.stage.json
  stage05-garage.stage.json
  stage06-redgate.stage.json
  stage07-finalhideout.stage.json
```

## Data

```text
Assets/Scripts/Data/StageData.cs
Assets/Scripts/Data/StageJsonLoader.cs
```

Purpose:

- Load `shotengai.stage.json`.
- Load `expected-results.json`.
- Load `switch-port/stages/*.stage.json` for placeholder stage switching.
- Preserve JSON chart values as data, not generated C# constants.

## Rhythm

```text
Assets/Scripts/Rhythm/RhythmJudge.cs
```

Purpose:

- Implement tap, hold, and mash judgement.
- Keep judgement independent from Unity rendering and physical controller mapping.
- Match Perfect `60ms`, Good `120ms`, Bad `190ms`, Miss otherwise.

## Audio

```text
Assets/Scripts/Audio/AudioClock.cs
```

Purpose:

- Make audio time the master clock.
- Apply CountIn `3.0s`.
- Expose battle clock and virtual timeline.
- Detect/resync audio drift in the local prototype.

## Input

```text
Assets/Scripts/Input/RhythmAction.cs
Assets/Scripts/Input/RhythmInputFrame.cs
Assets/Scripts/Input/IRhythmInputAdapter.cs
Assets/Scripts/Input/InputAdapter.cs
Assets/Scripts/Input/KeyboardInputAdapter.cs
Assets/Scripts/Input/GamepadInputAdapter.cs
Assets/Scripts/Input/AutomatedProfileInputAdapter.cs
```

Purpose:

- Map physical or automated input into timestamped logical rhythm events.
- Share one input event path for live play and tests.

Current local prototype implementation:

```text
Assets/Scripts/Input/RhythmAction.cs
Assets/Scripts/Input/RhythmInputFrame.cs
Assets/Scripts/Input/IRhythmInputAdapter.cs
Assets/Scripts/Input/KeyboardGamepadInputAdapter.cs
```

It maps the temporary keyboard/gamepad controls into `TapOrMash`, `HoldDown`, `HoldUp`, `Pause`, and `Restart`. Dedicated platform mappings can replace this adapter later without changing `InteractiveBattleSession`.

## Battle

```text
Assets/Scripts/Battle/BattleSimulator.cs
```

Purpose:

- Own Boot, LoadStage, CountIn, Battle, Paused, Result, Failed, Retry, Exit flow.
- Track note resolution, HP, combo, maxCombo, and judge stats.
- Save local diagnostic snapshots.

## Results

```text
Assets/Scripts/Results/RunResult.cs
Assets/Scripts/Results/ResultCalculator.cs
Assets/Scripts/Results/ResultComparer.cs
```

Purpose:

- Calculate score/rank/clear.
- Compare Unity results with `expected-results.json`.

## Tests

```text
Assets/Scripts/Tests/ProfileTestRunner.cs
Assets/Scripts/Tests/Stage1PortableParityTests.cs
Assets/Scripts/Tests/Stage1PortableCli.cs
```

Purpose:

- Run `perfect`, `steady`, `early`, `late`, `mash-weak`, and `mash-heavy`.
- Verify `60/120/190/191ms` boundaries.
- Verify input grace `250ms`, mash grace `80ms`, mash dedup `70ms`.
- Verify first note virtual time `4200ms`.
- Smoke-load all seven stage packs and validate stage order, labels, BGM files, chart summaries, note payloads, and perfect-run sanity.
- PlayMode-test all-stage debug perfect-clear progression through Stage 7.

## Placeholder View

```text
Assets/Scripts/View/PlaceholderRenderer.cs
Assets/Scripts/View/PlaceholderRendererBehaviour.cs
```

Purpose:

- Draw placeholder notes and debug text.
- Avoid coupling rhythm judgement to rendering.
- Provide enough UI to start, retry, pause, and inspect results.
- Let the local Unity Editor run JSON load, count-in, timeline progress, and result display in one scene.

## Scenes And Resources

```text
Assets/Scenes/Stage1Prototype.unity
Assets/Resources/Stage1/shotengai.stage.json
Assets/Resources/Stage1/expected-results.json
Assets/Audio/koiwazurai.mp3
```

Notes:

- The current placeholder scene reads `switch-port/stage1/` directly through `ProfileTestRunner.ResolveStagePackPath`.
- The current placeholder scene reads all-stage progression data through `switch-port/stages/` and `ProfileTestRunner.ResolveAllStagePackPath`.
- Resource copies should be made from `switch-port/stage1/` and project assets only after the Unity project needs packaged runtime assets.
- Do not place external portal, SDK, certificate, or private documentation files under this tree.
