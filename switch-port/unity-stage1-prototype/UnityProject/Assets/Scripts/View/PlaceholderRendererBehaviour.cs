#if UNITY_5_3_OR_NEWER
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class PlaceholderRendererBehaviour : MonoBehaviour
    {
        private static readonly string[] StagePackFiles =
        {
            "stage01-shotengai.stage.json",
            "stage02-warehouse.stage.json",
            "stage03-riverside.stage.json",
            "stage04-mountain.stage.json",
            "stage05-garage.stage.json",
            "stage06-redgate.stage.json",
            "stage07-finalhideout.stage.json"
        };

        [SerializeField] private string difficulty = "normal";
        [SerializeField] private float playbackSpeed = 1f;
        [SerializeField] private bool useAudioClock = true;
        [SerializeField] private int stageNumber = 1;

        private readonly PlaceholderRenderer placeholderRenderer = new PlaceholderRenderer();
        private StageExport stage;
        private InteractiveBattleSession session;
        private List<NoteData> chart;
        private string stageJsonPath = "";
        private string expectedJsonPath = "";
        private string status = "Not loaded";
        private string audioStatus = "BGM not loaded";
        private string error = "";
        private bool holdButtonWasDown;
        private IRhythmInputAdapter inputAdapter;
        private AudioSource audioSource;
        private double audioStartedDspTime;
        private double audioPausedDspTime;
        private bool audioReady;
        private bool audioStarted;
        private bool audioFallbackClock;
        private bool completionHandled;
        private bool paused;
        private Coroutine audioLoadRoutine;
        private GUIStyle titleStyle;
        private GUIStyle labelStyle;
        private GUIStyle panelLabelStyle;
        private GUIStyle strongStyle;
        private GUIStyle noteStyle;

        private void Start()
        {
            inputAdapter = new KeyboardGamepadInputAdapter();
            LoadAndStart();
            if (HasCommandLineFlag("-jijiiSmokeQuit"))
            {
                StartCoroutine(QuitAfterSmokeFrame());
            }
        }

        public bool DebugSessionLoaded
        {
            get { return session != null && string.IsNullOrEmpty(error); }
        }

        public string DebugError
        {
            get { return error; }
        }

        public string DebugAudioStatus
        {
            get { return audioStatus; }
        }

        public string DebugClockMode
        {
            get { return ClockMode; }
        }

        public string DebugStageLocation
        {
            get
            {
                if (stage == null || stage.Stage == null) return "";
                return stage.Stage.LocationName;
            }
        }

        public string DebugStageTitle
        {
            get
            {
                if (stage == null || stage.Stage == null) return "";
                return stage.Stage.Title;
            }
        }

        public int DebugIntroLineCount
        {
            get
            {
                if (stage == null || stage.Scenario == null || stage.Scenario.IntroLines == null) return 0;
                return stage.Scenario.IntroLines.Count;
            }
        }

        public string DebugResultScenarioLine
        {
            get { return ResultScenarioLine; }
        }

        public int DebugStageNumber
        {
            get { return CurrentStageNumber; }
        }

        public bool DebugCanAdvanceToNextStage
        {
            get { return CanAdvanceToNextStage; }
        }

        public void DebugAdvanceToNextStage()
        {
            AdvanceToNextStage();
        }

        public bool DebugBgmFileExists
        {
            get
            {
                if (stage == null || stage.Audio == null || stage.Audio.Bgm == null) return false;
                return !string.IsNullOrEmpty(ResolveRepoRelativePath(stage.Audio.Bgm.AssetSrc));
            }
        }

        public bool DebugAudioIsPlaying
        {
            get { return audioSource != null && audioSource.isPlaying; }
        }

        public bool DebugPaused
        {
            get { return paused; }
        }

        public void DebugTogglePause()
        {
            TogglePause();
        }

        public void DebugSeekBattleClockMs(int battleClockMs)
        {
            if (session == null) return;
            session.SeekBattleClockMs(battleClockMs);
            HandleSessionComplete();
        }

        public void DebugLoadStageNumber(int value)
        {
            stageNumber = Mathf.Clamp(value, 1, StagePackFiles.Length);
            LoadAndStart();
        }

        public void DebugCompleteStagePerfect()
        {
            if (session == null || stage == null || chart == null) return;
            for (var i = 0; i < chart.Count && !session.IsComplete; i += 1)
            {
                var note = session.CurrentNote;
                if (note == null) break;
                session.SeekBattleClockMs(note.TimeMs);

                if (note.Type == "tap")
                {
                    session.Tap();
                }
                else if (note.Type == "hold")
                {
                    session.HoldDown();
                    session.SeekBattleClockMs(note.TimeMs + note.DurationMs);
                    session.HoldUp();
                }
                else if (note.Type == "mash")
                {
                    DebugPlayPerfectMash(note);
                    session.SeekBattleClockMs(note.TimeMs + note.DurationMs + stage.Rhythm.MashInputGraceMs + 1);
                }
            }

            HandleSessionComplete();
        }

        private void Update()
        {
            if (session == null) return;
            if (session.IsComplete)
            {
                HandleSessionComplete();
                return;
            }

            if (inputAdapter == null) inputAdapter = new KeyboardGamepadInputAdapter();
            var input = inputAdapter.PollFrame();
            if (HandleControlInput(input)) return;
            if (paused) return;

            if (audioStarted)
            {
                var elapsedMs = (int)Math.Round((AudioSettings.dspTime - audioStartedDspTime) * 1000.0 * Mathf.Max(0.1f, playbackSpeed), MidpointRounding.AwayFromZero);
                session.SeekElapsedMs(elapsedMs);
            }
            else if (useAudioClock && !audioFallbackClock)
            {
                return;
            }
            else
            {
                var deltaMs = (int)Math.Round(Time.deltaTime * 1000.0f * Mathf.Max(0.1f, playbackSpeed), MidpointRounding.AwayFromZero);
                session.AdvanceMs(deltaMs);
            }

            if (session.IsComplete)
            {
                HandleSessionComplete();
                return;
            }

            ApplyRhythmInput(input);
        }

        private void OnGUI()
        {
            EnsureStyles();
            FillRect(new Rect(0, 0, Screen.width, Screen.height), new Color(0.07f, 0.07f, 0.08f));

            const int margin = 24;
            var width = Mathf.Max(720, Screen.width - margin * 2);
            var mainRect = new Rect(margin, margin, width, Mathf.Max(500, Screen.height - margin * 2));
            FillRect(mainRect, new Color(0.96f, 0.94f, 0.88f));
            StrokeRect(mainRect, new Color(0.12f, 0.11f, 0.1f), 3);

            if (!string.IsNullOrEmpty(error))
            {
                GUI.Label(new Rect(mainRect.x + 20, mainRect.y + 20, mainRect.width - 40, 220), error, labelStyle);
                DrawFooterControls(mainRect);
                return;
            }

            DrawHud(mainRect);
            DrawStagePanel(mainRect);

            if (session != null)
            {
                DrawRhythmLane(mainRect);
                DrawJudgePanel(mainRect);
                if (IsComplete) DrawResultPanel(mainRect);
            }
            else
            {
                GUI.Label(new Rect(mainRect.x + 24, mainRect.y + 160, 1000, 24), status, labelStyle);
            }

            DrawFooterControls(mainRect);
        }

        private void DrawHud(Rect mainRect)
        {
            var result = session != null ? session.BuildResult() : null;
            var titleRect = new Rect(mainRect.x + 24, mainRect.y + 18, 420, 42);
            GUI.Label(titleRect, "JII KOBUSHI STAGE " + CurrentStageNumber, titleStyle);
            GUI.Label(new Rect(mainRect.x + 26, mainRect.y + 58, 720, 24), "phase=" + Phase + "  difficulty=" + difficulty + "  speed=" + playbackSpeed + "x  clock=" + ClockMode, labelStyle);

            var hpRect = new Rect(mainRect.x + mainRect.width - 340, mainRect.y + 24, 290, 26);
            DrawMeter(hpRect, session != null ? session.RemainingHp : 0, session != null ? session.MaxHp : 1, new Color(0.08f, 0.66f, 0.28f), "HP");
            GUI.Label(new Rect(hpRect.x, hpRect.y + 32, 290, 24), "score=" + (result != null ? result.Score : 0) + "  rank=" + (result != null ? result.Rank : "-"), labelStyle);
        }

        private void DrawStagePanel(Rect mainRect)
        {
            var panel = new Rect(mainRect.x + 24, mainRect.y + 96, mainRect.width - 48, 170);
            FillRect(panel, new Color(0.15f, 0.14f, 0.13f));
            StrokeRect(panel, new Color(0.05f, 0.05f, 0.05f), 2);
            GUI.Label(new Rect(panel.x + 24, panel.y + 18, 460, 34), StageHeading, strongStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 54, panel.width - 48, 42), IntroPreview, panelLabelStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 98, 960, 24), "Space/Z/A: tap or mash    X/J/B: hold down, release at HOLD END    P/Esc/Select: pause    Enter/Start: restart", panelLabelStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 122, panel.width - 48, 24), "current: " + CurrentNoteLabel, panelLabelStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 146, panel.width - 48, 24), status + "  " + audioStatus, panelLabelStyle);
        }

        private void DrawRhythmLane(Rect mainRect)
        {
            var lane = new Rect(mainRect.x + 24, mainRect.y + 290, mainRect.width - 48, 132);
            FillRect(lane, new Color(0.98f, 0.98f, 0.96f));
            StrokeRect(lane, new Color(0.12f, 0.11f, 0.1f), 2);

            var hitX = lane.x + 150;
            FillRect(new Rect(hitX, lane.y + 10, 5, lane.height - 20), new Color(0.95f, 0.72f, 0.1f));
            GUI.Label(new Rect(lane.x + 18, lane.y + 18, 110, 24), "HIT LINE", strongStyle);

            if (chart != null && session != null)
            {
                const float lookAheadMs = 2600f;
                const float pastMs = 380f;
                var battleMs = session.BattleClockMs;
                for (var i = 0; i < chart.Count; i += 1)
                {
                    if (i < session.CurrentNoteIndex) continue;

                    var note = chart[i];
                    var delta = note.TimeMs - battleMs;
                    var keepActiveHoldVisible = note.Type == "hold" && session.IsHoldActiveForNoteIndex(i);
                    if (keepActiveHoldVisible)
                    {
                        var endDelta = note.TimeMs + note.DurationMs - battleMs;
                        if (endDelta < -pastMs || delta > lookAheadMs) continue;
                    }
                    else if (delta < -pastMs || delta > lookAheadMs)
                    {
                        continue;
                    }

                    var x = hitX + (delta / lookAheadMs) * (lane.width - 210);
                    DrawNoteMarker(note, x, lane, hitX, lookAheadMs, keepActiveHoldVisible);
                }
            }

            if (session != null && session.CountInRemainingMs > 0)
            {
                GUI.Label(new Rect(lane.x + lane.width * 0.44f, lane.y + 42, 220, 46), "COUNT " + Mathf.CeilToInt(session.CountInRemainingMs / 1000f), titleStyle);
            }
        }

        private void DrawNoteMarker(NoteData note, float x, Rect lane, float hitX, float lookAheadMs, bool keepActiveHoldVisible)
        {
            var y = lane.y + 58;
            var color = new Color(0.09f, 0.42f, 0.88f);
            var label = "TAP";
            var width = 54f;
            var endX = x;

            if (note.Type == "hold")
            {
                color = new Color(0.55f, 0.28f, 0.86f);
                label = "HOLD";
                endX = hitX + ((note.TimeMs + note.DurationMs - session.BattleClockMs) / lookAheadMs) * (lane.width - 210);
                if (keepActiveHoldVisible)
                {
                    var laneLeft = lane.x + 8;
                    var laneRight = lane.x + lane.width - 10;
                    x = Mathf.Clamp(x, laneLeft, laneRight);
                    width = Mathf.Max(12f, Mathf.Clamp(endX, laneLeft, laneRight) - x);
                }
                else
                {
                    width = Mathf.Max(70f, endX - x);
                }
            }
            else if (note.Type == "mash")
            {
                color = new Color(0.87f, 0.21f, 0.18f);
                label = "MASH";
                width = Mathf.Max(76f, note.DurationMs * 0.1f);
            }

            var rect = new Rect(x, y, width, 34);
            FillRect(rect, color);
            StrokeRect(rect, new Color(0.05f, 0.05f, 0.05f), 2);
            GUI.Label(rect, label, noteStyle);

            if (note.Type == "hold")
            {
                var releaseX = Mathf.Clamp(endX, lane.x + 8, lane.x + lane.width - 10);
                FillRect(new Rect(releaseX - 3, y - 10, 6, 54), new Color(1f, 0.92f, 0.24f));
                StrokeRect(new Rect(releaseX - 8, y - 14, 16, 62), new Color(0.05f, 0.05f, 0.05f), 2);
                GUI.Label(new Rect(releaseX - 44, y - 34, 88, 22), "RELEASE", noteStyle);
                GUI.Label(new Rect(releaseX - 28, y + 38, 56, 22), "END", noteStyle);
            }
        }

        private void DrawJudgePanel(Rect mainRect)
        {
            var panel = new Rect(mainRect.x + 24, mainRect.y + 442, mainRect.width - 48, 62);
            FillRect(panel, new Color(0.12f, 0.11f, 0.1f));
            var result = session.BuildResult();
            GUI.Label(new Rect(panel.x + 18, panel.y + 10, 360, 26), session.LastJudgeText, strongStyle);
            GUI.Label(new Rect(panel.x + 400, panel.y + 10, 520, 26), "combo=" + session.Combo + "  max=" + session.MaxCombo + "  notes=" + session.ResolvedCount + "/" + session.TotalNotes, panelLabelStyle);
            GUI.Label(new Rect(panel.x + 18, panel.y + 34, 720, 22), "perfect/good/bad/miss=" + result.Stats.Perfect + "/" + result.Stats.Good + "/" + result.Stats.Bad + "/" + result.Stats.Miss, panelLabelStyle);
        }

        private void DrawResultPanel(Rect mainRect)
        {
            var result = session.BuildResult();
            var panel = new Rect(mainRect.x + mainRect.width - 390, mainRect.y + 510, 340, 152);
            FillRect(panel, new Color(1f, 1f, 1f));
            StrokeRect(panel, new Color(0.12f, 0.11f, 0.1f), 2);
            GUI.Label(new Rect(panel.x + 18, panel.y + 12, 300, 30), ResultHeading + " " + result.Rank, titleStyle);
            GUI.Label(new Rect(panel.x + 18, panel.y + 48, 300, 22), "clear=" + result.Clear + " score=" + result.Score + " maxCombo=" + result.MaxCombo, labelStyle);
            GUI.Label(new Rect(panel.x + 18, panel.y + 72, 304, 34), ResultScenarioLine, labelStyle);

            var previousEnabled = GUI.enabled;
            GUI.enabled = previousEnabled && CanAdvanceToNextStage;
            if (GUI.Button(new Rect(panel.x + 18, panel.y + 108, 144, 34), "Next Stage"))
            {
                AdvanceToNextStage();
            }
            GUI.enabled = previousEnabled;

            if (GUI.Button(new Rect(panel.x + 176, panel.y + 108, 144, 34), "Retry"))
            {
                LoadAndStart();
            }
        }

        private void DrawFooterControls(Rect mainRect)
        {
            var top = mainRect.y + mainRect.height - 74;
            DrawDifficultyButtons((int)mainRect.x + 24, (int)top + 6);

            if (GUI.Button(new Rect(mainRect.x + 392, top + 2, 72, 48), "Prev"))
            {
                ChangeStage(-1);
            }

            if (GUI.Button(new Rect(mainRect.x + 472, top + 2, 72, 48), "Next"))
            {
                ChangeStage(1);
            }

            if (GUI.Button(new Rect(mainRect.x + 552, top + 2, 110, 48), "Restart"))
            {
                LoadAndStart();
            }

            if (GUI.Button(new Rect(mainRect.x + 670, top + 2, 110, 48), paused ? "Resume" : "Pause"))
            {
                TogglePause();
            }

            DrawInputButtons((int)mainRect.x + 792, (int)top);
        }

        private void LoadAndStart()
        {
            try
            {
                error = "";
                stageNumber = Mathf.Clamp(stageNumber, 1, StagePackFiles.Length);
                stageJsonPath = ProfileTestRunner.ResolveAllStagePackPath(StagePackFiles[CurrentStageIndex]);
                expectedJsonPath = ProfileTestRunner.ResolveStagePackPath("expected-results.json");

                if (CurrentStageIndex == 0)
                {
                    ProfileTestRunner.RunAll(stageJsonPath, expectedJsonPath);
                }
                stage = StageJsonLoader.LoadStage(stageJsonPath);

                if (!stage.Charts.ContainsKey(difficulty)) difficulty = "normal";
                chart = stage.Charts[difficulty];
                session = new InteractiveBattleSession(stage, difficulty);
                holdButtonWasDown = false;
                completionHandled = false;
                paused = false;
                StopBgm();
                status = "Loaded Stage " + CurrentStageNumber + " from " + Path.GetFileName(stageJsonPath) + StageParityStatus + ". First note virtual timeline is " + (session.CountInMs + chart[0].TimeMs) + "ms.";
                PrepareBgm();
            }
            catch (Exception ex)
            {
                error = ex.ToString();
                status = "Load failed";
                Debug.LogException(ex);
            }
        }

        private bool HandleControlInput(RhythmInputFrame input)
        {
            if (input.RestartDown)
            {
                LoadAndStart();
                return true;
            }

            if (input.PauseDown)
            {
                TogglePause();
                return true;
            }

            return false;
        }

        private void ChangeStage(int delta)
        {
            stageNumber = Mathf.Clamp(CurrentStageNumber + delta, 1, StagePackFiles.Length);
            LoadAndStart();
        }

        private void AdvanceToNextStage()
        {
            if (!CanAdvanceToNextStage) return;
            stageNumber = CurrentStageNumber + 1;
            LoadAndStart();
        }

        private void ApplyRhythmInput(RhythmInputFrame input)
        {
            if (input.TapOrMashDown)
            {
                session.Tap();
            }

            if (input.HoldDown)
            {
                session.HoldDown();
            }

            if (input.HoldUp)
            {
                session.HoldUp();
            }
        }

        private PlaceholderFrame BuildFrame()
        {
            var result = session.BuildResult();
            return new PlaceholderFrame
            {
                TimelineMs = session.ElapsedMs,
                BattleClockMs = session.BattleClockMs,
                RemainingHp = session.RemainingHp,
                MaxCombo = session.MaxCombo,
                Stats = result.Stats,
                RecentNotes = result.Samples
            };
        }

        private bool IsComplete
        {
            get { return session != null && session.IsComplete; }
        }

        private string Phase
        {
            get
            {
                if (session == null) return "Boot";
                if (paused) return "Paused";
                if (session.CountInRemainingMs > 0) return "CountIn " + session.CountInRemainingMs + "ms";
                if (session.IsFailed) return "Failed";
                if (session.IsCleared) return "Result";
                return "Battle";
            }
        }

        private void DebugPlayPerfectMash(NoteData note)
        {
            var target = Mathf.Max(1, note.TargetCount);
            var gap = target <= 1
                ? 0
                : Mathf.Max(stage.Rhythm.MashDedupMinGapMs, (note.DurationMs - 20) / (target - 1));
            for (var i = 0; i < target; i += 1)
            {
                session.SeekBattleClockMs(note.TimeMs + 10 + i * gap);
                session.Tap();
            }
        }

        private string ResultHeading
        {
            get
            {
                if (session == null) return "RESULT";
                if (session.IsFailed) return "FAILED";
                return CurrentStageIndex >= StagePackFiles.Length - 1 ? "COMPLETE" : "RESULT";
            }
        }

        private int CurrentStageIndex
        {
            get { return Mathf.Clamp(stageNumber, 1, StagePackFiles.Length) - 1; }
        }

        private int CurrentStageNumber
        {
            get { return CurrentStageIndex + 1; }
        }

        private bool CanAdvanceToNextStage
        {
            get
            {
                return session != null &&
                    session.IsCleared &&
                    CurrentStageIndex < StagePackFiles.Length - 1;
            }
        }

        private string StageParityStatus
        {
            get { return CurrentStageIndex == 0 ? " with parity tests passed" : ""; }
        }

        private string CurrentNoteLabel
        {
            get
            {
                if (session == null || chart == null || chart.Count == 0) return "none";
                var note = session.CurrentNote;
                if (note == null) return "complete";

                var release = note.Type == "hold"
                    ? " releaseAt=" + (note.TimeMs + note.DurationMs) + "ms"
                    : "";
                return note.Id + " type=" + note.Type + " battleMs=" + note.TimeMs + release + " virtualMs=" + (session.CountInMs + note.TimeMs);
            }
        }

        private string StageHeading
        {
            get
            {
                if (stage == null || stage.Stage == null) return "誘拐の朝 / うさぎ公園";
                if (string.IsNullOrEmpty(stage.Stage.LocationName)) return stage.Stage.Title;
                return stage.Stage.Title + " / " + stage.Stage.LocationName;
            }
        }

        private string IntroPreview
        {
            get
            {
                if (stage == null || stage.Scenario == null || stage.Scenario.IntroLines == null || stage.Scenario.IntroLines.Count == 0)
                {
                    return "scenario: -";
                }
                return "intro: " + stage.Scenario.IntroLines[0];
            }
        }

        private string ResultScenarioLine
        {
            get
            {
                if (session == null || stage == null || stage.Scenario == null) return "";
                if (session.IsFailed) return "もう一度、拍を取り戻せ。";
                if (CurrentStageIndex >= StagePackFiles.Length - 1 && stage.Scenario.FinalRevealLines.Count > 0)
                {
                    return stage.Scenario.FinalRevealLines[0];
                }
                return stage.Scenario.ClearLine;
            }
        }

        private string ClockMode
        {
            get
            {
                if (!useAudioClock) return "delta";
                if (audioStarted) return "audio";
                if (audioReady) return "audio-ready";
                if (audioFallbackClock) return "delta-fallback";
                return "audio-loading";
            }
        }

        private void PrepareBgm()
        {
            audioReady = false;
            audioStarted = false;
            audioFallbackClock = !useAudioClock;
            audioStatus = useAudioClock ? "BGM loading..." : "BGM disabled";
            if (!useAudioClock || stage == null || stage.Audio == null || stage.Audio.Bgm == null) return;

            if (audioLoadRoutine != null)
            {
                StopCoroutine(audioLoadRoutine);
                audioLoadRoutine = null;
            }

            audioLoadRoutine = StartCoroutine(LoadBgmClip());
        }

        private IEnumerator LoadBgmClip()
        {
            var bgmPath = ResolveRepoRelativePath(stage.Audio.Bgm.AssetSrc);
            if (string.IsNullOrEmpty(bgmPath))
            {
                audioStatus = "BGM file not found: " + stage.Audio.Bgm.AssetSrc;
                audioFallbackClock = true;
                yield break;
            }

            using (var request = UnityWebRequestMultimedia.GetAudioClip(ToFileUri(bgmPath), AudioType.MPEG))
            {
                yield return request.SendWebRequest();

                if (request.result != UnityWebRequest.Result.Success)
                {
                    audioStatus = "BGM load failed: " + request.error;
                    audioFallbackClock = true;
                    yield break;
                }

                var clip = DownloadHandlerAudioClip.GetContent(request);
                if (clip == null)
                {
                    audioStatus = "BGM load failed: empty clip";
                    audioFallbackClock = true;
                    yield break;
                }

                if (audioSource == null) audioSource = gameObject.AddComponent<AudioSource>();
                audioSource.clip = clip;
                audioSource.playOnAwake = false;
                audioSource.loop = false;
                audioSource.volume = Mathf.Clamp01((float)(stage.Audio.Bgm.TrackVolume * stage.Audio.Bgm.Gain));
                audioSource.pitch = Mathf.Max(0.1f, playbackSpeed);
                audioReady = true;
                audioStatus = "BGM ready: " + Path.GetFileName(bgmPath);
                if (paused)
                {
                    audioStatus = "BGM ready: paused";
                    yield break;
                }
                StartBgm();
            }
        }

        private IEnumerator QuitAfterSmokeFrame()
        {
            yield return null;

            var exitCode = string.IsNullOrEmpty(error) && session != null ? 0 : 1;
            Debug.Log(
                "Jijii Kobushi player smoke quit: exitCode=" + exitCode +
                " stage=" + DebugStageTitle +
                " location=" + DebugStageLocation +
                " clock=" + ClockMode +
                " error=" + error);
            Application.Quit(exitCode);
        }

        private static bool HasCommandLineFlag(string flag)
        {
            var args = Environment.GetCommandLineArgs();
            for (var i = 0; i < args.Length; i += 1)
            {
                if (args[i] == flag) return true;
            }

            return false;
        }

        private void StartBgm()
        {
            if (!useAudioClock || !audioReady || audioSource == null || audioSource.clip == null) return;
            audioSource.Stop();
            audioStartedDspTime = AudioSettings.dspTime;
            audioSource.Play();
            audioStarted = true;
            audioFallbackClock = false;
            audioStatus = "BGM playing: " + stage.Audio.Bgm.Track;
        }

        private void TogglePause()
        {
            if (session == null || session.IsComplete) return;
            if (paused) ResumeRun();
            else PauseRun();
        }

        private void PauseRun()
        {
            if (paused) return;
            paused = true;
            holdButtonWasDown = false;
            session.Pause();
            if (audioSource != null && audioSource.isPlaying)
            {
                audioPausedDspTime = AudioSettings.dspTime;
                audioSource.Pause();
            }
            audioStatus = "BGM paused";
        }

        private void ResumeRun()
        {
            if (!paused) return;
            paused = false;
            session.Resume();
            if (audioStarted && audioSource != null && audioSource.clip != null)
            {
                audioStartedDspTime += AudioSettings.dspTime - audioPausedDspTime;
                audioSource.UnPause();
                audioStatus = "BGM playing: " + stage.Audio.Bgm.Track;
            }
            else if (audioReady && audioSource != null && audioSource.clip != null)
            {
                StartBgm();
            }
            else if (audioFallbackClock)
            {
                audioStatus = "BGM fallback clock";
            }
        }

        private void StopBgmForResult()
        {
            if (audioLoadRoutine != null)
            {
                StopCoroutine(audioLoadRoutine);
                audioLoadRoutine = null;
            }

            if (audioSource != null) audioSource.Stop();
            audioStarted = false;
            audioFallbackClock = false;
            audioStatus = "BGM stopped: result";
        }

        private void HandleSessionComplete()
        {
            if (completionHandled) return;
            completionHandled = true;
            paused = false;
            holdButtonWasDown = false;
            StopBgmForResult();
        }

        private void StopBgm()
        {
            if (audioLoadRoutine != null)
            {
                StopCoroutine(audioLoadRoutine);
                audioLoadRoutine = null;
            }

            if (audioSource != null) audioSource.Stop();
            audioReady = false;
            audioStarted = false;
            audioFallbackClock = false;
            paused = false;
            audioStatus = "BGM not loaded";
        }

        private static string ResolveRepoRelativePath(string assetSrc)
        {
            if (string.IsNullOrEmpty(assetSrc)) return "";
            var normalized = assetSrc.Replace('\\', '/');
            if (normalized.StartsWith("./", StringComparison.Ordinal)) normalized = normalized.Substring(2);

            var current = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (current != null)
            {
                var candidate = Path.Combine(current.FullName, normalized.Replace('/', Path.DirectorySeparatorChar));
                if (File.Exists(candidate)) return candidate;
                current = current.Parent;
            }

            return "";
        }

        private static string ToFileUri(string path)
        {
            return new Uri(Path.GetFullPath(path)).AbsoluteUri;
        }

        private void DrawDifficultyButtons(int left, int top)
        {
            GUI.Label(new Rect(left, top, 100, 28), "Difficulty");
            DrawDifficultyButton("easy", left + 92, top);
            DrawDifficultyButton("normal", left + 176, top);
            DrawDifficultyButton("hard", left + 278, top);
        }

        private void DrawDifficultyButton(string id, int left, int top)
        {
            var label = difficulty == id ? "[" + id + "]" : id;
            if (GUI.Button(new Rect(left, top, 84, 32), label))
            {
                difficulty = id;
                LoadAndStart();
            }
        }

        private void DrawInputButtons(int left, int top)
        {
            if (session == null) return;
            var disabled = paused || session.IsComplete;
            var previousEnabled = GUI.enabled;
            GUI.enabled = previousEnabled && !disabled;

            if (GUI.Button(new Rect(left, top, 160, 52), "Tap / Mash"))
            {
                session.Tap();
            }

            var holdRect = new Rect(left + 172, top, 160, 52);
            GUI.RepeatButton(holdRect, "Hold");

            var currentEvent = Event.current;
            if (!disabled && currentEvent.type == EventType.MouseDown && holdRect.Contains(currentEvent.mousePosition) && !holdButtonWasDown)
            {
                session.HoldDown();
                holdButtonWasDown = true;
                currentEvent.Use();
            }
            else if (!disabled && currentEvent.type == EventType.MouseUp && holdButtonWasDown)
            {
                session.HoldUp();
                holdButtonWasDown = false;
                currentEvent.Use();
            }

            GUI.enabled = previousEnabled;
        }

        private void DrawMeter(Rect rect, int value, int max, Color color, string label)
        {
            FillRect(rect, new Color(0.18f, 0.18f, 0.18f));
            var ratio = Mathf.Clamp01(max <= 0 ? 0f : value / (float)max);
            FillRect(new Rect(rect.x + 3, rect.y + 3, (rect.width - 6) * ratio, rect.height - 6), color);
            StrokeRect(rect, new Color(0.05f, 0.05f, 0.05f), 2);
            GUI.Label(rect, label + " " + value + "/" + max, noteStyle);
        }

        private void EnsureStyles()
        {
            if (titleStyle != null) return;

            titleStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 24,
                fontStyle = FontStyle.Bold,
                normal = { textColor = new Color(0.08f, 0.08f, 0.08f) }
            };
            labelStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 15,
                wordWrap = true,
                normal = { textColor = new Color(0.08f, 0.08f, 0.08f) }
            };
            panelLabelStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 15,
                wordWrap = true,
                normal = { textColor = new Color(0.95f, 0.94f, 0.9f) }
            };
            strongStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 18,
                fontStyle = FontStyle.Bold,
                normal = { textColor = Color.white }
            };
            noteStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 14,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { textColor = Color.white }
            };
        }

        private static void FillRect(Rect rect, Color color)
        {
            var previous = GUI.color;
            GUI.color = color;
            GUI.DrawTexture(rect, Texture2D.whiteTexture);
            GUI.color = previous;
        }

        private static void StrokeRect(Rect rect, Color color, int thickness)
        {
            FillRect(new Rect(rect.x, rect.y, rect.width, thickness), color);
            FillRect(new Rect(rect.x, rect.yMax - thickness, rect.width, thickness), color);
            FillRect(new Rect(rect.x, rect.y, thickness, rect.height), color);
            FillRect(new Rect(rect.xMax - thickness, rect.y, thickness, rect.height), color);
        }
    }
}
#endif
