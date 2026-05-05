# Unity Stage Prototype Implementation Plan

This plan prepares a small Unity local prototype that keeps Stage 1 as the strict parity reference and uses the tracked all-stage JSON pack for placeholder seven-stage progression. The implementation tracks portable C# source and Unity-facing tests under `UnityProject/Assets/Scripts/` without committing generated Unity folders.

## Inputs

- Stage JSON: `../stage1/shotengai.stage.json`
- All-stage JSON pack: `../stages/*.stage.json`
- Unity spec: `../stage1/unity-spec.md`
- Expected results: `../stage1/expected-results.json`
- Pseudocode: `../stage1/pseudocode-csharp.md`
- State machine: `../stage1/state-machine.md`
- Test cases: `../stage1/test-cases.md`

Key timing constants:

- CountIn: `3.0s`
- CountInMs: `3000`
- First note battle time: `1200ms`
- First note virtual time: `4200ms`
- Judgement windows: Perfect `60ms`, Good `120ms`, Bad `190ms`, Miss otherwise
- Input grace: `250ms`
- Mash grace: `80ms`
- Mash dedup: `70ms`

## Phase 1: Data Contract

Implement JSON loader and typed data classes.

Deliverables:

- `JSON loader`
- `StageData`
- `NoteData`
- `DifficultyData`
- JSON parse smoke test for `../stage1/shotengai.stage.json`
- All-stage pack smoke test for `../stages/*.stage.json`

Acceptance:

- Stage id is `shotengai`.
- Easy/Normal/Hard chart counts match `106 / 150 / 187`.
- First note battle time is `1200ms`.
- BGM metadata loads as path `./assets/audio/koiwazurai.mp3`, gain `0.74`, track volume `0.78`, lead `220`.
- The all-stage pack loads seven stages in order and preserves stage number, subtitle, location, scenario payload, BGM path, chart shape, and note payloads.

Status: implemented in `UnityProject/Assets/Scripts/Data/StageData.cs`, `StageJsonLoader.cs`, and the all-stage smoke gate in `UnityProject/Assets/Scripts/Tests/ProfileTestRunner.cs`.

## Phase 2: Clock And Input

Implement `AudioClock` and `InputAdapter`.

Deliverables:

- `AudioClock`
- `InputAdapter`
- Simulated input event queue for tests

Acceptance:

- `AudioClock` exposes `elapsedMs`, `battleClockMs`, and `countInRemainingMs`.
- `battleClockMs = elapsedMs - 3000`.
- The first note virtual timestamp is `3000 + 1200 = 4200ms`.
- Pause/resume keeps pending note deadlines stable.
- Input events are timestamped with battle-clock milliseconds.

Status: implemented as the prototype `AudioClock` and simulated profile input in `BattleSimulator`.

## Phase 3: Rhythm Judgement

Implement `RhythmJudge`, `HoldJudge`, and mash handling.

Deliverables:

- `RhythmJudge`
- `HoldJudge`
- `MashJudge`

Acceptance:

- Tap `abs(offsetMs) <= 60` is Perfect.
- Tap `abs(offsetMs) <= 120` is Good.
- Tap `abs(offsetMs) <= 190` is Bad.
- Tap `abs(offsetMs) > 190` is Miss.
- `190ms` is Bad and `191ms` is Miss on both early and late sides.
- Hold rank is the lower rank of start and end.
- Mash counts taps inside `note.timeMs - 80` through `note.timeMs + durationMs + 80`.
- Mash ignores taps closer than `70ms` to the last counted tap.
- Mash over-count above `targetCount + 2` downgrades one rank.

Status: implemented in `UnityProject/Assets/Scripts/Rhythm/RhythmJudge.cs`.

## Phase 4: Battle Runtime

Implement `BattleController`.

Deliverables:

- `BattleController`
- Runtime state for HP, combo, maxCombo, judge stats, pending notes
- Pause, resume, retry, fail, and result transitions

Acceptance:

- State flow follows `../stage1/state-machine.md`.
- HP starts at `12`.
- Tap/Hold Miss subtracts `1` HP for Stage 1.
- Mash Miss does not subtract HP in the portable parity layer.
- HP `0` enters Failed for gameplay.
- Diagnostic test mode can continue resolving the full chart after HP reaches `0` to compare expected results.
- Chart completion with HP above `0` enters Result.

Status: implemented as deterministic full-chart simulation in `UnityProject/Assets/Scripts/Battle/BattleSimulator.cs`.

## Phase 5: Result Calculation

Implement `ResultCalculator`.

Deliverables:

- Score calculation
- Rank thresholds
- Clear flag
- Result DTO

Acceptance:

- Perfect Easy, Normal, and Hard produce score `9800`, rank `S`, miss `0`.
- Rank thresholds are `S >= 8400`, `A >= 7000`, `B >= 5400`, otherwise `C`.
- `maxCombo` resets only on Miss.
- Result includes score, rank, maxCombo, Perfect/Good/Bad/Miss counts, HP, and clear.

Status: implemented in `BattleSimulator` result calculation.

## Phase 6: Automated Parity Tests

Implement `TestRunner`.

Deliverables:

- `Stage1PortableTestRunner`
- Profile generator for:
  - `perfect`
  - `steady`
  - `early`
  - `late`
  - `mash-weak`
  - `mash-heavy`
- JSON comparison against `../stage1/expected-results.json`

Acceptance:

- `perfect` is S with Miss 0 for Easy, Normal, and Hard.
- `steady` is S with Miss 0 for Easy, Normal, and Hard.
- `early` and `late` hit Bad/Miss according to the `190ms / 191ms` boundary.
- `mash-weak` fails only mash notes.
- `mash-heavy` produces overmash Good results with Miss 0.
- Test output is deterministic and does not require final rendering.

Status: implemented in `UnityProject/Assets/Scripts/Tests/ProfileTestRunner.cs` and `Stage1PortableParityTests.cs`. Stage 1 remains the exact expected-results parity gate. All seven stage packs now also have generated `*.expected-results.json` files, and Unity EditMode validates six profiles across Easy/Normal/Hard for every stage.

## Phase 7: Placeholder Runtime View

Implement the local Editor placeholder view.

Deliverables:

- Minimal debug scene
- Difficulty selector
- Start/retry controls
- Current time display
- HP/combo/judge display
- Result summary display

Acceptance:

- Rendering is a consumer of battle state, not the clock authority.
- Judgement remains driven by `AudioClock` and timestamped input events.
- Placeholder visuals can be replaced later without changing the portable core.

Status: `UnityProject/Assets/Scripts/View/PlaceholderRendererBehaviour.cs` provides the local Editor scene driver. `UnityProject/Assets/Scenes/Stage1Prototype.unity` loads JSON, runs Stage 1 parity validation when Stage 1 is active, advances count-in and the selected stage timeline, displays the result, and can advance cleared results through all seven tracked stage packs. The old split-out `PlaceholderRenderer.cs` debug helper was removed during cleanup; no final renderer work is included.

## Phase 8: All-Stage Placeholder Progression

Implement all-stage loading and progression as a local Editor smoke path.

Deliverables:

- Stage switching over `../stages/stage01-*.stage.json` through `stage07-*.stage.json`
- Result-panel `Next Stage` progression after clear
- Stage subtitle and location assertions for every stage
- Final-stage ED bonus handoff

Acceptance:

- Stage 1 still loads as `誘拐の朝 / うさぎ公園`.
- Stage 3 loads as `内部破壊の稽古 / 伊藤道場`.
- Stage 7 loads as `白馬の正体 / X結社本部`.
- All seven stages match generated expected profile results for `perfect`, `steady`, `early`, `late`, `mash-weak`, and `mash-heavy`.
- A debug perfect-clear run can advance from Stage 1 through Stage 7 in PlayMode.
- Stage 7 clear exposes `ED Bonus` rather than another `Next Stage` transition.

Status: implemented in `PlaceholderRendererBehaviour` and covered by `PlaceholderRendererCanPerfectClearAllSevenStagesInOrder`.

## Stop Condition

Stop after the local prototype can run the six Stage 1 profile tests, smoke-load all seven stage packs, and complete a debug perfect-clear pass through the seven placeholder stages. Do not implement final renderer work, production deployment, external portal work, or platform-specific integration in this phase.
