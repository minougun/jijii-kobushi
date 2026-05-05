# Unity Editor Check Procedure

This procedure is for the local Unity prototype only.

Local repo:

```text
/mnt/c/Users/minou/jii-kobushi
```

Open this Unity project:

```text
/mnt/c/Users/minou/jii-kobushi/switch-port/unity-stage1-prototype/UnityProject
```

Do not add generated folders or files to Git:

```text
Library/
Temp/
Obj/
Logs/
UserSettings/
Build/
Builds/
*.csproj
*.sln
```

## 1. Open

1. Open Unity Hub.
2. Add project from disk.
3. Select `switch-port/unity-stage1-prototype/UnityProject`.
4. Let Unity import the project.
5. Confirm Console has no compile errors.

If Unity asks to upgrade the project version, accept only for this local prototype. Keep generated files untracked.

## 2. Run Tests

1. Open `Window > General > Test Runner`.
2. Select `EditMode`.
3. Run `Stage1PortableParityTests`.
4. Expected result: all `Stage1PortableParityTests` pass.
5. Select `PlayMode`.
6. Run `Stage1PrototypePlayModeSmokeTests`.
7. Expected result: the placeholder runner loads Stage 1, confirms `うさぎ公園`, and finds the local BGM file referenced by the JSON.

The test loads:

```text
../stage1/shotengai.stage.json
../stage1/expected-results.json
```

It validates count-in, first note virtual time, judgement boundaries, mash grace/dedup, all six profile results for Easy, Normal, and Hard, plus manual-session parity for a perfect interactive run and a timeout miss/damage case.

CLI equivalent:

```bash
"/mnt/c/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" \
  -batchmode -nographics \
  -projectPath "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\UnityProject" \
  -runTests \
  -testPlatform EditMode \
  -testResults "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\unity-editmode-results.xml" \
  -logFile "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\unity-editmode-tests.log"
```

Generated `unity-*-results.xml` and `*.log` files are local verification artifacts and should not be committed.

PlayMode CLI equivalent:

```bash
"/mnt/c/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" \
  -batchmode -nographics \
  -projectPath "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\UnityProject" \
  -runTests \
  -testPlatform PlayMode \
  -testResults "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\unity-playmode-results.xml" \
  -logFile "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\unity-playmode-tests.log"
```

Local player build smoke:

```bash
"/mnt/c/Program Files/Unity/Hub/Editor/2022.3.62f3/Editor/Unity.exe" \
  -batchmode \
  -projectPath "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\UnityProject" \
  -executeMethod JijiiKobushi.Stage1Prototype.EditorTools.Stage1PrototypeBuild.BuildWindowsPrototype \
  -buildOutput "Builds\Windows\Stage1Prototype.exe" \
  -logFile "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\unity-build-windows.log" \
  -quit
```

Expected build smoke behavior:

- `UnityProject/Builds/Windows/Stage1Prototype.exe` exists.
- `Builds/` remains ignored and must not be committed.
- The log contains `Windows prototype build succeeded`.

Generated player launch smoke:

```bash
switch-port/unity-stage1-prototype/UnityProject/Builds/Windows/Stage1Prototype.exe \
  -batchmode \
  -nographics \
  -jijiiSmokeQuit \
  -logFile "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\unity-player-smoke.log"
```

Expected player smoke behavior:

- The process exits with code `0`.
- The log contains `Jijii Kobushi player smoke quit`.
- The smoke line includes `stage=誘拐の朝` and `location=うさぎ公園`.
- The smoke line includes `introOpen=False`, `reachedBattleClock=True`, and `clock=audio` when the local BGM can be loaded.

Generated all-stage player launch smoke:

```bash
switch-port/unity-stage1-prototype/UnityProject/Builds/Windows/Stage1Prototype.exe \
  -batchmode \
  -nographics \
  -jijiiSmokeAllStages \
  -logFile "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\unity-player-allstages-smoke.log"
```

Expected all-stage smoke behavior:

- The process exits with code `0`.
- The log contains `Jijii Kobushi all-stage smoke quit`.
- The smoke line includes `visited=7`, `runResults=7`, `finalRank=S`, and `canStartEnding=True`.

Generated ED player launch smoke:

```bash
switch-port/unity-stage1-prototype/UnityProject/Builds/Windows/Stage1Prototype.exe \
  -batchmode \
  -nographics \
  -jijiiSmokeEnding \
  -logFile "C:\Users\minou\jii-kobushi\switch-port\unity-stage1-prototype\unity-player-ending-smoke.log"
```

Expected ED smoke behavior:

- The process exits with code `0`.
- The log contains `Jijii Kobushi ending smoke quit`.
- The smoke line includes `mode=endingBonus`, `videoAssetExists=True`, and `reachedEndingClock=True`.

## 3. Run Scene

1. Open `Assets/Scenes/Stage1Prototype.unity`.
2. Confirm the scene contains `Stage1PlaceholderRunner`.
3. Confirm `Stage1PlaceholderRunner` has `PlaceholderRendererBehaviour`.
4. Confirm Scene view shows the temporary stage board, gold hit line, and Tap/Hold/Mash marker cubes.
5. Press Play.

Expected Play Mode behavior:

- Loads `switch-port/stage1/shotengai.stage.json`.
- Runs parity validation against `switch-port/stage1/expected-results.json`.
- Shows the Stage 1 intro text overlay before count-in.
- Starts BGM/count-in only after all intro lines are advanced with `Tap / Mash` or the overlay button.
- Starts count-in at `3000ms`.
- Shows the first note virtual timeline as `4200ms`.
- Shows the Stage 1 location as `うさぎ公園`.
- Loads local BGM from `assets/audio/koiwazurai.mp3` and drives the Stage 1 battle timeline from Unity DSP time when the clip is available.
- Falls back to deterministic `deltaTime` timeline only if the local BGM file cannot be found or decoded.
- Advances the Stage 1 battle timeline at `playbackSpeed`.
- Shows current note id, note type, battle time, and virtual time.
- Shows a short scenario preview from the loaded stage JSON and a clear/failure scenario line in the result panel.
- Shows a placeholder HUD with HP, score, rank, current combo, judge counts, and a rhythm lane.
- Shows `Music: PeriTune` at the lower-left of stage screens.
- Draws upcoming `TAP`, `HOLD`, and `MASH` notes moving toward the gold hit line.
- Draws a yellow `RELEASE` marker at the end of each `HOLD` note so the release timing is visible.
- Accepts keyboard input: `Space`/`Z` for tap or mash, `X`/`J` down/up for hold, `P`/`Esc` for pause/resume, `Enter` for restart, `F5` for save, and `F9` for load.
- Accepts default gamepad-style input: `A`/Submit for tap or mash, `B` for hold down/up, `Select` for pause/resume, `Start` for restart, shoulder-left for save, and shoulder-right for load.
- Accepts placeholder OnGUI input buttons: `Tap / Mash`, `Hold`, `Save`, `Load`, `Pause/Resume`, `Restart`, `Prev/Next`, and Easy/Normal/Hard. During stage intro, `Tap / Mash` advances the scenario instead of sending a battle note input.
- Uses the all-stage JSON pack under `switch-port/stages/` for placeholder stage switching. Stage 1 still runs the stricter `expected-results.json` parity gate when loaded.
- EditMode tests now also run a Unity-side all-stage smoke gate over `switch-port/stages/`, checking stage order, titles, locations, BGM asset paths, chart summaries, note payload shape, and perfect-run sanity for Easy/Normal/Hard.
- Shows `Next Stage` in the result panel after a cleared stage and advances to the next stage pack. Failed stages keep `Next Stage` disabled and use `Retry`.
- PlayMode tests include a debug perfect-clear route through all seven tracked stage packs, checking each stage number, subtitle, location, intro payload, result line, and final-stage stop condition.
- Pauses BGM and freezes note deadlines while paused, then resumes from the preserved clock position.
- Applies miss timeout and enemy damage for missed tap/hold notes.
- Shows Result with clear, score, rank, maxCombo, HP, and judge stats after the chart finishes or HP reaches zero.

The scene still uses placeholder `OnGUI` rendering. Final art, animation, audio playback, and production UI migration are intentionally out of scope.

If the scene looks empty, run this editor menu and reopen the scene:

```text
Jijii Kobushi > Setup Stage 1 Prototype Scene
```

The menu recreates `Stage1PlaceholderRunner`, `Main Camera`, `Directional Light`, the visible placeholder board, the gold hit line, and note marker cubes. It also resets `difficulty=normal` and `playbackSpeed=1` on the runner.

## 4. If Console Errors Appear

Fix only local Unity prototype files:

```text
UnityProject/Assets/Scripts/
UnityProject/Assets/Scenes/
UnityProject/Packages/
UnityProject/ProjectSettings/
```

Do not touch external platform materials, ignored docs exports, deployment, push, or generated Unity folders.

After fixing, rerun:

```bash
cd /mnt/c/Users/minou/jii-kobushi
npm run check
npm run check:switch-stage1
```
