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
        private GUIStyle strongStyle;
        private GUIStyle noteStyle;

        private void Start()
        {
            inputAdapter = new KeyboardGamepadInputAdapter();
            LoadAndStart();
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
            var panel = new Rect(mainRect.x + 24, mainRect.y + 96, mainRect.width - 48, 150);
            FillRect(panel, new Color(0.15f, 0.14f, 0.13f));
            StrokeRect(panel, new Color(0.05f, 0.05f, 0.05f), 2);
            GUI.Label(new Rect(panel.x + 24, panel.y + 18, 460, 34), StageHeading, strongStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 56, 960, 24), "Space/Z/A: tap or mash    X/J/B: hold    P/Esc/Select: pause    Enter/Start: restart", labelStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 88, panel.width - 48, 24), "current: " + CurrentNoteLabel, labelStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 114, panel.width - 48, 24), status + "  " + audioStatus, labelStyle);
        }

        private void DrawRhythmLane(Rect mainRect)
        {
            var lane = new Rect(mainRect.x + 24, mainRect.y + 280, mainRect.width - 48, 132);
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
                    var note = chart[i];
                    var delta = note.TimeMs - battleMs;
                    if (delta < -pastMs || delta > lookAheadMs) continue;

                    var x = hitX + (delta / lookAheadMs) * (lane.width - 210);
                    DrawNoteMarker(note, x, lane);
                }
            }

            if (session != null && session.CountInRemainingMs > 0)
            {
                GUI.Label(new Rect(lane.x + lane.width * 0.44f, lane.y + 42, 220, 46), "COUNT " + Mathf.CeilToInt(session.CountInRemainingMs / 1000f), titleStyle);
            }
        }

        private void DrawNoteMarker(NoteData note, float x, Rect lane)
        {
            var y = lane.y + 58;
            var color = new Color(0.09f, 0.42f, 0.88f);
            var label = "TAP";
            var width = 54f;

            if (note.Type == "hold")
            {
                color = new Color(0.55f, 0.28f, 0.86f);
                label = "HOLD";
                width = Mathf.Max(70f, note.DurationMs * 0.12f);
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
        }

        private void DrawJudgePanel(Rect mainRect)
        {
            var panel = new Rect(mainRect.x + 24, mainRect.y + 432, mainRect.width - 48, 62);
            FillRect(panel, new Color(0.12f, 0.11f, 0.1f));
            var result = session.BuildResult();
            GUI.Label(new Rect(panel.x + 18, panel.y + 10, 360, 26), session.LastJudgeText, strongStyle);
            GUI.Label(new Rect(panel.x + 400, panel.y + 10, 520, 26), "combo=" + session.Combo + "  max=" + session.MaxCombo + "  notes=" + session.ResolvedCount + "/" + session.TotalNotes, labelStyle);
            GUI.Label(new Rect(panel.x + 18, panel.y + 34, 720, 22), "perfect/good/bad/miss=" + result.Stats.Perfect + "/" + result.Stats.Good + "/" + result.Stats.Bad + "/" + result.Stats.Miss, labelStyle);
        }

        private void DrawResultPanel(Rect mainRect)
        {
            var result = session.BuildResult();
            var panel = new Rect(mainRect.x + mainRect.width - 390, mainRect.y + 518, 340, 98);
            FillRect(panel, new Color(1f, 1f, 1f));
            StrokeRect(panel, new Color(0.12f, 0.11f, 0.1f), 2);
            GUI.Label(new Rect(panel.x + 18, panel.y + 12, 300, 30), ResultHeading + " " + result.Rank, titleStyle);
            GUI.Label(new Rect(panel.x + 18, panel.y + 48, 300, 22), "clear=" + result.Clear + " score=" + result.Score + " maxCombo=" + result.MaxCombo, labelStyle);
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

        private string ResultHeading
        {
            get
            {
                if (session == null) return "RESULT";
                return session.IsFailed ? "FAILED" : "RESULT";
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

                return note.Id + " type=" + note.Type + " battleMs=" + note.TimeMs + " virtualMs=" + (session.CountInMs + note.TimeMs);
            }
        }

        private string StageHeading
        {
            get
            {
                if (stage == null || stage.Stage == null) return "誘拐の朝 / うさぎ公園";
                var location = string.IsNullOrEmpty(stage.Stage.LocationName) ? "うさぎ公園" : stage.Stage.LocationName;
                return stage.Stage.Title + " / " + location;
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
                normal = { textColor = new Color(0.08f, 0.08f, 0.08f) }
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
