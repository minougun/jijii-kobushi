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
4. Expected result: `ProfilesMatchExpectedResults` passes.

The test loads:

```text
../stage1/shotengai.stage.json
../stage1/expected-results.json
```

It validates count-in, first note virtual time, judgement boundaries, mash grace/dedup, and all six profile results for Easy, Normal, and Hard.

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

## 3. Run Scene

1. Open `Assets/Scenes/Stage1Prototype.unity`.
2. Confirm the scene contains `Stage1PlaceholderRunner`.
3. Confirm `Stage1PlaceholderRunner` has `PlaceholderRendererBehaviour`.
4. Press Play.

Expected Play Mode behavior:

- Loads `switch-port/stage1/shotengai.stage.json`.
- Runs parity validation against `switch-port/stage1/expected-results.json`.
- Starts count-in at `3000ms`.
- Shows the first note virtual timeline as `4200ms`.
- Advances the Stage 1 battle timeline.
- Shows current note id, note type, battle time, and virtual time.
- Shows Result with clear, score, rank, maxCombo, and judge stats after the simulated chart finishes.

The scene uses placeholder `OnGUI` text only. Rendering migration is intentionally out of scope.

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
