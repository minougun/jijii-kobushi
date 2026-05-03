# Unity Stage 1 Prototype File Map

This is the proposed file layout for a future normal Unity local prototype. These files are not created yet. Create them only after the lightweight plan is accepted and a Unity project directory is intentionally initialized.

## Proposed Unity Project Root

```text
switch-port/unity-stage1-prototype/UnityProject/
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

## Data

```text
Assets/Scripts/Data/StageData.cs
Assets/Scripts/Data/AudioData.cs
Assets/Scripts/Data/PlayerData.cs
Assets/Scripts/Data/EnemyData.cs
Assets/Scripts/Data/DifficultyData.cs
Assets/Scripts/Data/NoteData.cs
Assets/Scripts/Data/StageJsonLoader.cs
Assets/Scripts/Data/ExpectedResultsData.cs
```

Purpose:

- Load `shotengai.stage.json`.
- Load `expected-results.json`.
- Preserve JSON chart values as data, not generated C# constants.

## Rhythm

```text
Assets/Scripts/Rhythm/JudgeRank.cs
Assets/Scripts/Rhythm/NoteType.cs
Assets/Scripts/Rhythm/JudgeResult.cs
Assets/Scripts/Rhythm/RhythmJudge.cs
Assets/Scripts/Rhythm/HoldJudge.cs
Assets/Scripts/Rhythm/MashJudge.cs
Assets/Scripts/Rhythm/RhythmInputEvent.cs
```

Purpose:

- Implement tap, hold, and mash judgement.
- Keep judgement independent from Unity rendering and physical controller mapping.
- Match Perfect `60ms`, Good `120ms`, Bad `190ms`, Miss otherwise.

## Audio

```text
Assets/Scripts/Audio/AudioClock.cs
Assets/Scripts/Audio/AudioPlaybackAdapter.cs
Assets/Scripts/Audio/AudioDriftMonitor.cs
```

Purpose:

- Make audio time the master clock.
- Apply CountIn `3.0s`.
- Expose battle clock and virtual timeline.
- Detect/resync audio drift in the local prototype.

## Input

```text
Assets/Scripts/Input/RhythmAction.cs
Assets/Scripts/Input/InputAdapter.cs
Assets/Scripts/Input/KeyboardInputAdapter.cs
Assets/Scripts/Input/GamepadInputAdapter.cs
Assets/Scripts/Input/AutomatedProfileInputAdapter.cs
```

Purpose:

- Map physical or automated input into timestamped logical rhythm events.
- Share one input event path for live play and tests.

## Battle

```text
Assets/Scripts/Battle/BattleState.cs
Assets/Scripts/Battle/BattleController.cs
Assets/Scripts/Battle/StageRunState.cs
Assets/Scripts/Battle/PendingNoteTracker.cs
Assets/Scripts/Battle/SaveSnapshot.cs
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
Assets/Scripts/Tests/Stage1PortableTestRunner.cs
Assets/Scripts/Tests/ProfileInputFactory.cs
Assets/Scripts/Tests/JudgementBoundaryTests.cs
Assets/Scripts/Tests/MashTimingTests.cs
Assets/Scripts/Tests/HoldTimingTests.cs
Assets/Scripts/Tests/CountInTimelineTests.cs
```

Purpose:

- Run `perfect`, `steady`, `early`, `late`, `mash-weak`, and `mash-heavy`.
- Verify `60/120/190/191ms` boundaries.
- Verify input grace `250ms`, mash grace `80ms`, mash dedup `70ms`.
- Verify first note virtual time `4200ms`.

## Placeholder View

```text
Assets/Scripts/View/PlaceholderRenderer.cs
Assets/Scripts/View/DebugHudView.cs
Assets/Scripts/View/ResultView.cs
Assets/Scripts/View/DifficultySelectView.cs
```

Purpose:

- Draw placeholder notes and debug text.
- Avoid coupling rhythm judgement to rendering.
- Provide enough UI to start, retry, pause, and inspect results.

## Scenes And Resources

```text
Assets/Scenes/Stage1Prototype.unity
Assets/Resources/Stage1/shotengai.stage.json
Assets/Resources/Stage1/expected-results.json
Assets/Audio/koiwazurai.mp3
```

Notes:

- Resource copies should be made from `switch-port/stage1/` and project assets only after the Unity project is intentionally created.
- Do not place external portal, SDK, certificate, or private documentation files under this tree.
