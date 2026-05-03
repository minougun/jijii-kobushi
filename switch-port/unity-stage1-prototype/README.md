# Unity Stage 1 Local Prototype

This directory is a lightweight preparation area for a normal Unity local prototype. The tracked repo contents intentionally stop at portable C# source, Unity-facing test code, and local planning docs. Unity-generated folders such as `Library/`, `Temp/`, `Obj/`, and `UserSettings/` must stay untracked.

Recommended placement:

- Keep the prototype source in this repo under `UnityProject/Assets/Scripts/`.
- Create or open the actual Unity editor project locally from `UnityProject/` only when needed.
- Do not copy SDK, NDA, portal, certificate, key, or platform-specific files into this tree.

This keeps the Stage 1 prototype close to the port pack while avoiding large generated Unity project churn in Git.

## Scope

- Stage 1 only: `うさぎ公園` (`shotengai` remains the legacy internal JSON key/file name)
- Local Unity prototype only
- Placeholder rendering is acceptable
- JSON-driven chart and metadata
- Audio-clock-driven judgement
- Local BGM playback for the Stage 1 track when `assets/audio/koiwazurai.mp3` is available
- Automated parity tests against the Stage 1 portable runner

Out of scope:

- Full seven-stage support
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
- `View/PlaceholderRenderer.cs`
- `View/PlaceholderRendererBehaviour.cs`

Unity-facing files:

- `UnityProject/Packages/manifest.json`
- `UnityProject/ProjectSettings/ProjectVersion.txt`
- `UnityProject/Assets/Scenes/Stage1Prototype.unity`

`ProfileTestRunner` locates the tracked Stage 1 pack (`switch-port/stage1/shotengai.stage.json` and `switch-port/stage1/expected-results.json`), verifies that the stage location is `うさぎ公園`, simulates `perfect`, `steady`, `early`, `late`, `mash-weak`, and `mash-heavy` for Easy, Normal, and Hard, then compares clear, score, rank, maxCombo, judge counts, miss-by-type, and HP.

`Stage1PrototypePlayModeSmokeTests` starts the playable placeholder runner in Play Mode, verifies that the Stage 1 session loads, confirms the location remains `うさぎ公園`, and checks that the local BGM file referenced by the JSON can be found before manual playtesting.

`InteractiveBattleSession` is the first playable prototype layer. It advances the same audio-clock timeline, accepts tap/mash and hold inputs, resolves miss timeouts, applies enemy damage on missed tap/hold notes, and returns score/rank/result data using the same scoring function as the simulator.

`KeyboardGamepadInputAdapter` maps the temporary keyboard/gamepad controls into logical rhythm actions. `PlaceholderRendererBehaviour` consumes those actions instead of reading physical keys directly, so later controller mappings can be swapped without touching battle judgement.

`PlaceholderRendererBehaviour` now includes a temporary playable HUD: HP, score, combo, judge counts, current note, result panel, and a simple rhythm lane that draws upcoming `TAP`, `HOLD`, and `MASH` notes against a gold hit line.

In Play Mode, `PlaceholderRendererBehaviour` loads the Stage 1 BGM from the tracked Web asset path in the JSON (`./assets/audio/koiwazurai.mp3`) and drives the battle clock from Unity DSP time while the clip is playing. If the local BGM file cannot be found or decoded, it falls back to the deterministic `deltaTime` clock and shows the fallback status in the HUD.

`Assets/Editor/Stage1PrototypeSceneSetup.cs` adds the `Jijii Kobushi > Setup Stage 1 Prototype Scene` editor menu. It makes `Stage1Prototype.unity` visible in Scene view by adding a Main Camera, Directional Light, placeholder stage board, gold hit line, and Tap/Hold/Mash marker cubes.

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

## Recommended Local Verification

Before comparing Unity results, run the JS reference:

```bash
cd /mnt/c/Users/minou/jii-kobushi
npm run check
npm run check:switch-stage1
```

Unity test output should be compared to `../stage1/expected-results.json`, not hand-entered chart constants.

Manual Play Mode controls:

- `Space` or `Z`: tap / mash
- Gamepad `A` / Submit: tap / mash
- `X` or `J`: hold down / hold release
- Gamepad `B`: hold down / hold release
- `Enter`: restart
- Gamepad `Start`: restart
- On-screen `Tap / Mash`, `Hold`, `Restart`, and difficulty buttons provide the same local placeholder controls.
