#if UNITY_5_3_OR_NEWER
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.Video;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class PlaceholderRendererBehaviour : MonoBehaviour
    {
        private enum PrototypeMode
        {
            Stage,
            EndingBonus
        }

        [SerializeField] private string difficulty = "normal";
        [SerializeField] private float playbackSpeed = 1f;
        [SerializeField] private bool useAudioClock = true;
        [SerializeField] private int stageNumber = 1;
        [SerializeField] private int runLoop = 1;

        private PrototypeMode prototypeMode = PrototypeMode.Stage;
        private StageExport stage;
        private InteractiveBattleSession session;
        private List<NoteData> chart;
        private EndingBonusExport endingBonus;
        private EndingBonusInteractiveSession endingSession;
        private List<NoteData> endingChart;
        private string stageJsonPath = "";
        private string expectedJsonPath = "";
        private string endingJsonPath = "";
        private string status = "Not loaded";
        private string audioStatus = "BGM not loaded";
        private string error = "";
        private bool holdButtonWasDown;
        private IRhythmInputAdapter inputAdapter;
        private AudioSource audioSource;
        private RuntimeAssetCatalog runtimeAssetCatalog;
        private readonly Dictionary<string, Texture2D> backgroundTextureCache = new Dictionary<string, Texture2D>();
        private double audioStartedDspTime;
        private double audioPausedDspTime;
        private bool audioReady;
        private bool audioStarted;
        private bool audioFallbackClock;
        private VideoPlayer endingVideoPlayer;
        private RenderTexture endingVideoTexture;
        private string endingVideoAssetSrc = "";
        private string endingVideoPath = "";
        private bool endingVideoReady;
        private bool endingVideoStarted;
        private bool endingVideoFallbackClock;
        private bool completionHandled;
        private bool paused;
        private Coroutine audioLoadRoutine;
        private Coroutine endingVideoLoadRoutine;
        private Texture2D stageBackgroundTexture;
        private string stageBackgroundAssetSrc = "";
        private string stageBackgroundStatus = "background not loaded";
        private GUIStyle titleStyle;
        private GUIStyle labelStyle;
        private GUIStyle panelLabelStyle;
        private GUIStyle strongStyle;
        private GUIStyle noteStyle;
        private readonly RunProgressTracker runProgress = new RunProgressTracker();

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

        public int DebugRunLoop
        {
            get { return CurrentRunLoop; }
        }

        public int DebugTotalNotes
        {
            get { return ActiveTotalNotes; }
        }

        public bool DebugCanAdvanceToNextStage
        {
            get { return CanAdvanceToNextStage; }
        }

        public bool DebugCanStartEndingBonus
        {
            get { return CanStartEndingBonus; }
        }

        public bool DebugEndingBonusLoaded
        {
            get { return prototypeMode == PrototypeMode.EndingBonus && endingSession != null && string.IsNullOrEmpty(error); }
        }

        public string DebugPrototypeMode
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? "endingBonus" : "stage"; }
        }

        public int DebugEndingBonusScore
        {
            get { return endingSession != null ? endingSession.Score : 0; }
        }

        public int DebugRunStageResultCount
        {
            get { return runProgress.Count; }
        }

        public int DebugRunStageTotalScore
        {
            get { return runProgress.TotalScore; }
        }

        public string DebugRunFinalRank
        {
            get { return runProgress.FinalRank; }
        }

        public void DebugAdvanceToNextStage()
        {
            AdvanceToNextStage();
        }

        public void DebugStartEndingBonus()
        {
            LoadEndingBonusAndStart();
        }

        public bool DebugBgmFileExists
        {
            get
            {
                if (stage == null || stage.Audio == null || stage.Audio.Bgm == null) return false;
                return !string.IsNullOrEmpty(ResolveRuntimeAssetLocalPath(stage.Audio.Bgm.AssetSrc));
            }
        }

        public bool DebugAudioIsPlaying
        {
            get { return audioSource != null && audioSource.isPlaying; }
        }

        public bool DebugEndingVideoAssetExists
        {
            get { return !string.IsNullOrEmpty(ResolveRuntimeAssetLocalPath(CurrentEndingVideoAssetSrc)); }
        }

        public bool DebugEndingVideoClockActive
        {
            get { return prototypeMode == PrototypeMode.EndingBonus && endingVideoStarted && !endingVideoFallbackClock; }
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
            HandleStageSessionComplete();
        }

        public void DebugLoadStageNumber(int value)
        {
            stageNumber = StagePackCatalog.ClampStageNumber(value);
            LoadAndStart();
        }

        public void DebugSetDifficulty(string value)
        {
            difficulty = NormalizeDifficulty(value);
            ReloadCurrentMode();
        }

        public void DebugSetRunLoop(int value)
        {
            runLoop = Mathf.Max(1, value);
            ReloadCurrentMode();
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

            HandleStageSessionComplete();
        }

        public void DebugCompleteEndingBonusPerfect()
        {
            if (endingSession == null || endingBonus == null || endingChart == null) return;
            var events = EndingBonusPerfectInputPlanner.Build(endingBonus, CurrentLoopKey, difficulty);
            for (var i = 0; i < events.Count; i += 1)
            {
                endingSession.SeekBattleClockMs(events[i].TimeMs);
                if (events[i].Action == EndingBonusPerfectInputPlanner.TapAction) endingSession.Tap();
                else if (events[i].Action == EndingBonusPerfectInputPlanner.HoldDownAction) endingSession.HoldDown();
                else if (events[i].Action == EndingBonusPerfectInputPlanner.HoldUpAction) endingSession.HoldUp();
            }

            if (endingChart.Count > 0)
            {
                var last = endingChart[endingChart.Count - 1];
                endingSession.SeekBattleClockMs(last.TimeMs + last.DurationMs + endingBonus.Rhythm.InputGraceMs + endingBonus.Rhythm.MashInputGraceMs + 1);
            }
        }

        private void Update()
        {
            if (prototypeMode == PrototypeMode.EndingBonus)
            {
                UpdateEndingBonus();
                return;
            }

            if (session == null) return;
            if (session.IsComplete)
            {
                HandleStageSessionComplete();
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
                HandleStageSessionComplete();
                return;
            }

            ApplyRhythmInput(input);
        }

        private void UpdateEndingBonus()
        {
            if (endingSession == null) return;
            if (endingSession.IsComplete) return;

            if (inputAdapter == null) inputAdapter = new KeyboardGamepadInputAdapter();
            var input = inputAdapter.PollFrame();
            if (HandleControlInput(input)) return;
            if (paused) return;

            if (endingVideoStarted && endingVideoPlayer != null && endingVideoPlayer.isPrepared && !endingVideoFallbackClock)
            {
                var videoMs = (int)Math.Round(endingVideoPlayer.time * 1000.0, MidpointRounding.AwayFromZero);
                endingSession.SeekBattleClockMs(videoMs);
            }
            else
            {
                var deltaMs = (int)Math.Round(Time.deltaTime * 1000.0f * Mathf.Max(0.1f, playbackSpeed), MidpointRounding.AwayFromZero);
                endingSession.AdvanceMs(deltaMs);
            }

            if (!endingSession.IsComplete)
            {
                ApplyRhythmInput(input);
            }
        }

        private void OnGUI()
        {
            EnsureStyles();
            FillRect(new Rect(0, 0, Screen.width, Screen.height), new Color(0.07f, 0.07f, 0.08f));

            const int margin = 24;
            var width = Mathf.Max(720, Screen.width - margin * 2);
            var mainRect = new Rect(margin, margin, width, Mathf.Max(500, Screen.height - margin * 2));
            FillRect(mainRect, new Color(0.96f, 0.94f, 0.88f));
            DrawStageBackground(mainRect);
            DrawEndingVideoBackground(mainRect);
            StrokeRect(mainRect, new Color(0.12f, 0.11f, 0.1f), 3);

            if (!string.IsNullOrEmpty(error))
            {
                GUI.Label(new Rect(mainRect.x + 20, mainRect.y + 20, mainRect.width - 40, 220), error, labelStyle);
                DrawFooterControls(mainRect);
                return;
            }

            DrawHud(mainRect);
            DrawStagePanel(mainRect);

            if (HasActiveSession)
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
            var endingResult = endingSession != null ? endingSession.BuildResult() : null;
            var titleRect = new Rect(mainRect.x + 24, mainRect.y + 18, 420, 42);
            GUI.Label(titleRect, prototypeMode == PrototypeMode.EndingBonus ? "JII KOBUSHI ED BONUS" : "JII KOBUSHI STAGE " + CurrentStageNumber, titleStyle);
            GUI.Label(new Rect(mainRect.x + 26, mainRect.y + 58, 720, 24), "phase=" + Phase + "  loop=" + CurrentLoopKey + "  difficulty=" + difficulty + "  speed=" + playbackSpeed + "x  clock=" + ClockMode, labelStyle);

            var hpRect = new Rect(mainRect.x + mainRect.width - 340, mainRect.y + 24, 290, 26);
            if (prototypeMode == PrototypeMode.EndingBonus)
            {
                DrawMeter(hpRect, endingSession != null ? endingSession.ResolvedCount : 0, endingSession != null ? endingSession.TotalNotes : 1, new Color(0.83f, 0.42f, 0.08f), "BEAT");
                GUI.Label(new Rect(hpRect.x, hpRect.y + 32, 290, 24), "score=" + (endingResult != null ? endingResult.Score : 0) + "  bestCombo=" + (endingResult != null ? endingResult.BestCombo : 0), labelStyle);
            }
            else
            {
                DrawMeter(hpRect, session != null ? session.RemainingHp : 0, session != null ? session.MaxHp : 1, new Color(0.08f, 0.66f, 0.28f), "HP");
                GUI.Label(new Rect(hpRect.x, hpRect.y + 32, 290, 24), "score=" + (result != null ? result.Score : 0) + "  rank=" + (result != null ? result.Rank : "-"), labelStyle);
            }
        }

        private void DrawStagePanel(Rect mainRect)
        {
            if (prototypeMode == PrototypeMode.EndingBonus)
            {
                var edPanel = new Rect(mainRect.x + 24, mainRect.y + 96, mainRect.width - 48, 70);
                FillRect(edPanel, new Color(0.06f, 0.055f, 0.05f, 0.9f));
                StrokeRect(edPanel, new Color(0.9f, 0.72f, 0.24f), 2);
                GUI.Label(new Rect(edPanel.x + 18, edPanel.y + 10, 520, 26), StageHeading, strongStyle);
                GUI.Label(new Rect(edPanel.x + 18, edPanel.y + 38, edPanel.width - 36, 24), audioStatus + "  " + status, panelLabelStyle);
                return;
            }

            var panel = new Rect(mainRect.x + 24, mainRect.y + 96, mainRect.width - 48, 170);
            FillRect(panel, new Color(0.15f, 0.14f, 0.13f));
            StrokeRect(panel, new Color(0.05f, 0.05f, 0.05f), 2);
            GUI.Label(new Rect(panel.x + 24, panel.y + 18, 460, 34), StageHeading, strongStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 54, panel.width - 48, 42), IntroPreview, panelLabelStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 98, 960, 24), "Space/Z/A: tap or mash    X/J/B: hold down, release at HOLD END    P/Esc/Select: pause    Enter/Start: restart", panelLabelStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 122, panel.width - 48, 24), "current: " + CurrentNoteLabel, panelLabelStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 146, panel.width - 48, 24), status + "  " + audioStatus + "  " + stageBackgroundStatus, panelLabelStyle);
        }

        private void DrawStageBackground(Rect mainRect)
        {
            if (stageBackgroundTexture == null) return;
            GUI.DrawTexture(mainRect, stageBackgroundTexture, ScaleMode.ScaleAndCrop, false);
            FillRect(mainRect, new Color(0f, 0f, 0f, 0.28f));
        }

        private void DrawEndingVideoBackground(Rect mainRect)
        {
            if (prototypeMode != PrototypeMode.EndingBonus) return;

            FillRect(mainRect, new Color(0.04f, 0.045f, 0.055f));
            var videoRect = new Rect(mainRect.x + 24, mainRect.y + 96, mainRect.width - 48, 326);
            FillRect(videoRect, new Color(0.02f, 0.02f, 0.024f));
            if (endingVideoTexture != null && endingVideoReady)
            {
                GUI.DrawTexture(videoRect, endingVideoTexture, ScaleMode.ScaleToFit, false);
            }
            else
            {
                GUI.Label(new Rect(videoRect.x + 24, videoRect.y + 132, videoRect.width - 48, 28), "ED video preview loading / fallback rhythm clock", panelLabelStyle);
            }
            FillRect(mainRect, new Color(0f, 0f, 0f, 0.18f));
        }

        private void DrawRhythmLane(Rect mainRect)
        {
            var lane = new Rect(mainRect.x + 24, mainRect.y + 290, mainRect.width - 48, 132);
            FillRect(lane, new Color(0.98f, 0.98f, 0.96f));
            StrokeRect(lane, new Color(0.12f, 0.11f, 0.1f), 2);

            var hitX = lane.x + 150;
            FillRect(new Rect(hitX, lane.y + 10, 5, lane.height - 20), new Color(0.95f, 0.72f, 0.1f));
            GUI.Label(new Rect(lane.x + 18, lane.y + 18, 110, 24), "HIT LINE", strongStyle);

            var activeChart = ActiveChart;
            if (activeChart != null && HasActiveSession)
            {
                const float lookAheadMs = 2600f;
                const float pastMs = 380f;
                var battleMs = ActiveBattleClockMs;
                for (var i = 0; i < activeChart.Count; i += 1)
                {
                    if (i < ActiveCurrentNoteIndex) continue;

                    var note = activeChart[i];
                    var delta = note.TimeMs - battleMs;
                    var keepActiveHoldVisible = IsActiveHoldForNoteIndex(i);
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
                    DrawNoteMarker(note, x, lane, hitX, lookAheadMs, keepActiveHoldVisible, battleMs);
                }
            }

            if (ActiveCountInRemainingMs > 0)
            {
                GUI.Label(new Rect(lane.x + lane.width * 0.44f, lane.y + 42, 220, 46), "COUNT " + Mathf.CeilToInt(ActiveCountInRemainingMs / 1000f), titleStyle);
            }
        }

        private void DrawNoteMarker(NoteData note, float x, Rect lane, float hitX, float lookAheadMs, bool keepActiveHoldVisible, int battleMs)
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
                endX = hitX + ((note.TimeMs + note.DurationMs - battleMs) / lookAheadMs) * (lane.width - 210);
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
            var stats = ActiveJudgeStats;
            GUI.Label(new Rect(panel.x + 18, panel.y + 10, 360, 26), ActiveLastJudgeText, strongStyle);
            GUI.Label(new Rect(panel.x + 400, panel.y + 10, 520, 26), "combo=" + ActiveCombo + "  max=" + ActiveMaxCombo + "  notes=" + ActiveResolvedCount + "/" + ActiveTotalNotes, panelLabelStyle);
            GUI.Label(new Rect(panel.x + 18, panel.y + 34, 720, 22), "perfect/good/bad/miss=" + stats.Perfect + "/" + stats.Good + "/" + stats.Bad + "/" + stats.Miss, panelLabelStyle);
        }

        private void DrawResultPanel(Rect mainRect)
        {
            var isEndingResult = prototypeMode == PrototypeMode.EndingBonus;
            var panelWidth = Mathf.Min(isEndingResult ? 820f : 620f, mainRect.width - 72f);
            var panelHeight = isEndingResult ? 284f : 214f;
            var panel = new Rect(mainRect.x + (mainRect.width - panelWidth) * 0.5f, mainRect.y + (isEndingResult ? 424f : 458f), panelWidth, panelHeight);
            FillRect(panel, new Color(1f, 0.985f, 0.94f));
            StrokeRect(panel, new Color(0.05f, 0.05f, 0.05f), 3);
            FillRect(new Rect(panel.x, panel.y, panel.width, 44), new Color(0.08f, 0.075f, 0.07f));
            if (prototypeMode == PrototypeMode.EndingBonus)
            {
                var endingResult = endingSession.BuildResult();
                var accuracy = endingResult.NoteCount > 0 ? Mathf.RoundToInt((endingResult.Hits / (float)endingResult.NoteCount) * 100f) : 0;
                var finalRank = runProgress.FinalRank;
                var stageAverage = runProgress.AverageScore;
                var stageTotal = runProgress.TotalScore;
                DrawRankBadge(new Rect(panel.x + 20, panel.y + 58, 92, 92), finalRank);
                GUI.Label(new Rect(panel.x + 128, panel.y + 14, 420, 24), "FINAL RESULT", panelLabelStyle);
                GUI.Label(new Rect(panel.x + 128, panel.y + 56, 440, 38), "総合ランク " + finalRank, titleStyle);
                GUI.Label(new Rect(panel.x + 128, panel.y + 92, 520, 24), "Loop " + CurrentRunLoop + " / " + difficulty + " / stages " + runProgress.Count + "/" + StagePackCatalog.Count, labelStyle);
                DrawResultStat(new Rect(panel.x + 128, panel.y + 124, 132, 54), "平均", stageAverage + " pts", "7 stages");
                DrawResultStat(new Rect(panel.x + 270, panel.y + 124, 132, 54), "総合", stageTotal + " pts", "stage total");
                DrawResultStat(new Rect(panel.x + 412, panel.y + 124, 132, 54), "ED拍", endingResult.Score + " pts", "bonus");
                DrawResultStat(new Rect(panel.x + 554, panel.y + 124, 132, 54), "成功", endingResult.Hits + "/" + endingResult.NoteCount, accuracy + "%");
                DrawStageResultRows(new Rect(panel.x + 20, panel.y + 188, panel.width - 40, 52));

                if (GUI.Button(new Rect(panel.x + panel.width - 178, panel.y + panel.height - 38, 152, 30), "Next Loop"))
                {
                    runLoop = CurrentRunLoop + 1;
                    stageNumber = 1;
                    LoadAndStart();
                }

                if (GUI.Button(new Rect(panel.x + panel.width - 338, panel.y + panel.height - 38, 146, 30), "Retry ED"))
                {
                    LoadEndingBonusAndStart();
                }
                return;
            }

            var result = session.BuildResult();
            DrawRankBadge(new Rect(panel.x + 20, panel.y + 58, 92, 92), result.Rank);
            GUI.Label(new Rect(panel.x + 128, panel.y + 14, 360, 24), result.Clear ? "STAGE CLEAR" : "FAILED", panelLabelStyle);
            GUI.Label(new Rect(panel.x + 128, panel.y + 56, 360, 38), result.Score + " pts", titleStyle);
            GUI.Label(new Rect(panel.x + 128, panel.y + 92, panel.width - 154, 24), ResultScenarioLine, labelStyle);
            DrawResultStat(new Rect(panel.x + 128, panel.y + 124, 132, 54), "Max combo", result.MaxCombo.ToString(), "chain");
            DrawResultStat(new Rect(panel.x + 270, panel.y + 124, 132, 54), "Notes", result.Stats.Perfect + "/" + result.NoteCount, "perfect");
            DrawResultStat(new Rect(panel.x + 412, panel.y + 124, 132, 54), "HP", result.RemainingHp + "/" + result.MaxHp, "remaining");

            if (CanStartEndingBonus)
            {
                if (GUI.Button(new Rect(panel.x + panel.width - 178, panel.y + 178, 152, 30), "ED Bonus"))
                {
                    LoadEndingBonusAndStart();
                }
            }
            else
            {
                var previousEnabled = GUI.enabled;
                GUI.enabled = previousEnabled && CanAdvanceToNextStage;
                if (GUI.Button(new Rect(panel.x + panel.width - 178, panel.y + 178, 152, 30), "Next Stage"))
                {
                    AdvanceToNextStage();
                }
                GUI.enabled = previousEnabled;
            }

            if (GUI.Button(new Rect(panel.x + panel.width - 338, panel.y + 178, 146, 30), "Retry"))
            {
                ReloadCurrentMode();
            }
        }

        private void DrawRankBadge(Rect rect, string rank)
        {
            FillRect(rect, new Color(0.86f, 0.62f, 0.16f));
            StrokeRect(rect, new Color(0.05f, 0.05f, 0.05f), 3);
            GUI.Label(rect, rank, titleStyle);
        }

        private void DrawResultStat(Rect rect, string label, string value, string sub)
        {
            FillRect(rect, new Color(1f, 1f, 1f));
            StrokeRect(rect, new Color(0.82f, 0.78f, 0.7f), 1);
            GUI.Label(new Rect(rect.x + 9, rect.y + 6, rect.width - 18, 18), label, panelLabelStyle);
            GUI.Label(new Rect(rect.x + 9, rect.y + 20, rect.width - 18, 24), value, strongStyle);
            GUI.Label(new Rect(rect.x + 9, rect.y + 38, rect.width - 18, 16), sub, labelStyle);
        }

        private void DrawStageResultRows(Rect rect)
        {
            FillRect(rect, new Color(0.08f, 0.075f, 0.07f));
            StrokeRect(rect, new Color(0.82f, 0.78f, 0.7f), 1);
            var titleRect = new Rect(rect.x + 10, rect.y + 6, 140, 18);
            GUI.Label(titleRect, "ステージ別成績", panelLabelStyle);

            var columnWidth = (rect.width - 160f) / StagePackCatalog.Count;
            for (var i = 0; i < StagePackCatalog.Count; i += 1)
            {
                var summary = runProgress.Find(i + 1);
                var x = rect.x + 150 + columnWidth * i;
                var label = summary == null
                    ? (i + 1).ToString("00") + " --"
                    : (i + 1).ToString("00") + " " + summary.Rank + " " + summary.Score;
                GUI.Label(new Rect(x, rect.y + 6, columnWidth - 4, 18), label, panelLabelStyle);
                GUI.Label(new Rect(x, rect.y + 27, columnWidth - 4, 18), summary == null ? "未記録" : summary.MaxCombo + "連 / " + RunProgressTracker.Accuracy(summary) + "%", panelLabelStyle);
            }
        }

        private void DrawFooterControls(Rect mainRect)
        {
            var top = mainRect.y + mainRect.height - 74;
            DrawDifficultyButtons((int)mainRect.x + 24, (int)top + 6);
            DrawLoopButtons((int)mainRect.x + 392, (int)top + 6);

            if (prototypeMode == PrototypeMode.EndingBonus)
            {
                if (GUI.Button(new Rect(mainRect.x + 552, top + 2, 110, 48), "Stages"))
                {
                    stageNumber = 1;
                    LoadAndStart();
                }
            }
            else
            {
                if (GUI.Button(new Rect(mainRect.x + 552, top + 2, 72, 48), "Prev"))
                {
                    ChangeStage(-1);
                }

                if (GUI.Button(new Rect(mainRect.x + 632, top + 2, 72, 48), "Next"))
                {
                    ChangeStage(1);
                }
            }

            if (GUI.Button(new Rect(mainRect.x + 712, top + 2, 110, 48), "Restart"))
            {
                ReloadCurrentMode();
            }

            if (GUI.Button(new Rect(mainRect.x + 830, top + 2, 110, 48), paused ? "Resume" : "Pause"))
            {
                TogglePause();
            }

            DrawInputButtons((int)mainRect.x + 952, (int)top);
        }

        private void LoadAndStart()
        {
            try
            {
                error = "";
                prototypeMode = PrototypeMode.Stage;
                endingSession = null;
                endingChart = null;
                stageNumber = StagePackCatalog.ClampStageNumber(stageNumber);
                stageJsonPath = ProfileTestRunner.ResolveAllStagePackPath(StagePackCatalog.GetFileNameByIndex(CurrentStageIndex));
                expectedJsonPath = ProfileTestRunner.ResolveStagePackPath("expected-results.json");

                if (CurrentStageIndex == 0)
                {
                    ProfileTestRunner.RunAll(stageJsonPath, expectedJsonPath);
                }
                stage = StageJsonLoader.LoadStage(stageJsonPath);
                runtimeAssetCatalog = null;

                difficulty = NormalizeDifficulty(difficulty);
                var loopData = ResolveStageLoop(stage, CurrentLoopKey);
                if (!loopData.Charts.ContainsKey(difficulty)) difficulty = "normal";
                ResetRunResultsIfNeeded();
                chart = loopData.Charts[difficulty];
                session = new InteractiveBattleSession(stage, CurrentLoopKey, difficulty);
                holdButtonWasDown = false;
                completionHandled = false;
                paused = false;
                StopBgm();
                status = "Loaded Stage " + CurrentStageNumber + " loop " + CurrentLoopKey + " from " + Path.GetFileName(stageJsonPath) + StageParityStatus + ". First note virtual timeline is " + (session.CountInMs + chart[0].TimeMs) + "ms.";
                LoadStageBackground();
                PrepareBgm();
            }
            catch (Exception ex)
            {
                error = ex.ToString();
                status = "Load failed";
                Debug.LogException(ex);
            }
        }

        private void LoadEndingBonusAndStart()
        {
            try
            {
                error = "";
                StopBgm();
                StopEndingVideo();
                ClearStageBackground();
                prototypeMode = PrototypeMode.EndingBonus;
                session = null;
                chart = null;
                endingJsonPath = ProfileTestRunner.ResolveEndingPackPath("ending-bonus.stage.json");
                endingBonus = StageJsonLoader.LoadEndingBonus(endingJsonPath);

                difficulty = NormalizeDifficulty(difficulty);
                var loopKey = CurrentLoopKey;
                if (!endingBonus.Loops.ContainsKey(loopKey)) loopKey = "1";
                if (!endingBonus.Loops[loopKey].Charts.ContainsKey(difficulty)) difficulty = "normal";
                endingChart = endingBonus.Loops[loopKey].Charts[difficulty];
                endingSession = new EndingBonusInteractiveSession(endingBonus, loopKey, difficulty);
                holdButtonWasDown = false;
                completionHandled = false;
                paused = false;
                PrepareEndingVideo();
                status = "Loaded ED bonus loop " + loopKey + " from " + Path.GetFileName(endingJsonPath) + ". First beat is " + endingBonus.Ending.FirstBeatMs + "ms.";
            }
            catch (Exception ex)
            {
                error = ex.ToString();
                status = "ED bonus load failed";
                Debug.LogException(ex);
            }
        }

        private void ReloadCurrentMode()
        {
            if (prototypeMode == PrototypeMode.EndingBonus) LoadEndingBonusAndStart();
            else LoadAndStart();
        }

        private bool HandleControlInput(RhythmInputFrame input)
        {
            if (input.RestartDown)
            {
                ReloadCurrentMode();
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
            stageNumber = StagePackCatalog.ClampStageNumber(CurrentStageNumber + delta);
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
                TapActive();
            }

            if (input.HoldDown)
            {
                HoldDownActive();
            }

            if (input.HoldUp)
            {
                HoldUpActive();
            }
        }

        private bool HasActiveSession
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? endingSession != null : session != null; }
        }

        private List<NoteData> ActiveChart
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? endingChart : chart; }
        }

        private NoteData ActiveCurrentNote
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? endingSession != null ? endingSession.CurrentNote : null : session != null ? session.CurrentNote : null; }
        }

        private int ActiveBattleClockMs
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? endingSession != null ? endingSession.BattleClockMs : 0 : session != null ? session.BattleClockMs : 0; }
        }

        private int ActiveCountInMs
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? 0 : session != null ? session.CountInMs : 0; }
        }

        private int ActiveCountInRemainingMs
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? 0 : session != null ? session.CountInRemainingMs : 0; }
        }

        private int ActiveCurrentNoteIndex
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? endingSession != null ? endingSession.CurrentNoteIndex : 0 : session != null ? session.CurrentNoteIndex : 0; }
        }

        private int ActiveResolvedCount
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? endingSession != null ? endingSession.ResolvedCount : 0 : session != null ? session.ResolvedCount : 0; }
        }

        private int ActiveTotalNotes
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? endingSession != null ? endingSession.TotalNotes : 0 : session != null ? session.TotalNotes : 0; }
        }

        private int ActiveCombo
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? endingSession != null ? endingSession.Combo : 0 : session != null ? session.Combo : 0; }
        }

        private int ActiveMaxCombo
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? endingSession != null ? endingSession.MaxCombo : 0 : session != null ? session.MaxCombo : 0; }
        }

        private string ActiveLastJudgeText
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? endingSession != null ? endingSession.LastJudgeText : "ED Ready" : session != null ? session.LastJudgeText : ""; }
        }

        private JudgeStats ActiveJudgeStats
        {
            get
            {
                if (prototypeMode == PrototypeMode.EndingBonus) return endingSession != null ? endingSession.BuildResult().Stats : new JudgeStats();
                return session != null ? session.BuildResult().Stats : new JudgeStats();
            }
        }

        private bool IsActiveHoldForNoteIndex(int noteIndex)
        {
            return prototypeMode == PrototypeMode.EndingBonus
                ? endingSession != null && endingSession.IsHoldActiveForNoteIndex(noteIndex)
                : session != null && session.IsHoldActiveForNoteIndex(noteIndex);
        }

        private void TapActive()
        {
            if (prototypeMode == PrototypeMode.EndingBonus)
            {
                if (endingSession != null) endingSession.Tap();
                return;
            }

            if (session != null) session.Tap();
        }

        private void HoldDownActive()
        {
            if (prototypeMode == PrototypeMode.EndingBonus)
            {
                if (endingSession != null) endingSession.HoldDown();
                return;
            }

            if (session != null) session.HoldDown();
        }

        private void HoldUpActive()
        {
            if (prototypeMode == PrototypeMode.EndingBonus)
            {
                if (endingSession != null) endingSession.HoldUp();
                return;
            }

            if (session != null) session.HoldUp();
        }

        private bool IsComplete
        {
            get { return prototypeMode == PrototypeMode.EndingBonus ? endingSession != null && endingSession.IsComplete : session != null && session.IsComplete; }
        }

        private string Phase
        {
            get
            {
                if (prototypeMode == PrototypeMode.EndingBonus)
                {
                    if (endingSession == null) return "ED Boot";
                    if (paused) return "Paused";
                    return endingSession.IsComplete ? "ED Result" : "ED Bonus";
                }

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
                return CurrentStageIndex >= StagePackCatalog.Count - 1 ? "COMPLETE" : "RESULT";
            }
        }

        private int CurrentStageIndex
        {
            get { return StagePackCatalog.ClampStageNumber(stageNumber) - 1; }
        }

        private int CurrentStageNumber
        {
            get { return CurrentStageIndex + 1; }
        }

        private int CurrentRunLoop
        {
            get { return Mathf.Max(1, runLoop); }
        }

        private string CurrentLoopKey
        {
            get { return CurrentRunLoop <= 1 ? "1" : "2"; }
        }

        private bool CanAdvanceToNextStage
        {
            get
            {
                if (prototypeMode == PrototypeMode.EndingBonus) return false;
                return session != null &&
                    session.IsCleared &&
                    CurrentStageIndex < StagePackCatalog.Count - 1;
            }
        }

        private bool CanStartEndingBonus
        {
            get
            {
                return prototypeMode == PrototypeMode.Stage &&
                    session != null &&
                    session.IsCleared &&
                    CurrentStageIndex >= StagePackCatalog.Count - 1;
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
                var activeChart = ActiveChart;
                if (!HasActiveSession || activeChart == null || activeChart.Count == 0) return "none";
                var note = ActiveCurrentNote;
                if (note == null) return "complete";

                var release = note.Type == "hold"
                    ? " releaseAt=" + (note.TimeMs + note.DurationMs) + "ms"
                    : "";
                return note.Id + " type=" + note.Type + " battleMs=" + note.TimeMs + release + " virtualMs=" + (ActiveCountInMs + note.TimeMs);
            }
        }

        private string StageHeading
        {
            get
            {
                if (prototypeMode == PrototypeMode.EndingBonus)
                {
                    return endingBonus != null ? endingBonus.Ending.Title + " / " + CurrentRunLoop + "周目" : "ED拍ボーナス";
                }

                if (stage == null || stage.Stage == null) return "誘拐の朝 / うさぎ公園";
                if (string.IsNullOrEmpty(stage.Stage.LocationName)) return stage.Stage.Title;
                return stage.Stage.Title + " / " + stage.Stage.LocationName;
            }
        }

        private string IntroPreview
        {
            get
            {
                if (prototypeMode == PrototypeMode.EndingBonus)
                {
                    if (endingBonus == null) return "ending: -";
                    var video = CurrentRunLoop <= 1 ? endingBonus.Ending.FirstLoopVideoSrc : endingBonus.Ending.LoopPlusVideoSrc;
                    return "ending: " + endingBonus.Ending.Description + "  video=" + video;
                }

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
                if (CurrentStageIndex >= StagePackCatalog.Count - 1 && stage.Scenario.FinalRevealLines.Count > 0)
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
                if (prototypeMode == PrototypeMode.EndingBonus)
                {
                    if (endingVideoStarted && !endingVideoFallbackClock) return "ed-video";
                    if (endingVideoReady) return "ed-video-ready";
                    if (endingVideoFallbackClock) return "ed-delta-fallback";
                    return "ed-video-loading";
                }
                if (!useAudioClock) return "delta";
                if (audioStarted) return "audio";
                if (audioReady) return "audio-ready";
                if (audioFallbackClock) return "delta-fallback";
                return "audio-loading";
            }
        }

        private string CurrentEndingVideoAssetSrc
        {
            get
            {
                if (endingBonus == null || endingBonus.Ending == null) return "";
                return CurrentRunLoop <= 1 ? endingBonus.Ending.FirstLoopVideoSrc : endingBonus.Ending.LoopPlusVideoSrc;
            }
        }

        private void PrepareEndingVideo()
        {
            endingVideoReady = false;
            endingVideoStarted = false;
            endingVideoFallbackClock = !useAudioClock;
            endingVideoAssetSrc = CurrentEndingVideoAssetSrc;
            endingVideoPath = "";
            audioStatus = useAudioClock ? "ED video loading..." : "ED rhythm clock";
            if (!useAudioClock || string.IsNullOrEmpty(endingVideoAssetSrc))
            {
                audioStatus = "ED rhythm clock";
                return;
            }

            if (endingVideoLoadRoutine != null)
            {
                StopCoroutine(endingVideoLoadRoutine);
                endingVideoLoadRoutine = null;
            }

            endingVideoPath = ResolveRuntimeAssetLocalPath(endingVideoAssetSrc);
            if (string.IsNullOrEmpty(endingVideoPath))
            {
                endingVideoFallbackClock = true;
                audioStatus = "ED video missing, rhythm clock: " + endingVideoAssetSrc;
                return;
            }

            endingVideoLoadRoutine = StartCoroutine(PrepareEndingVideoPlayback(endingVideoPath));
        }

        private IEnumerator PrepareEndingVideoPlayback(string filePath)
        {
            EnsureEndingVideoPlayer();
            endingVideoPlayer.Stop();
            endingVideoPlayer.source = VideoSource.Url;
            endingVideoPlayer.url = ToFileUri(filePath);
            endingVideoPlayer.playbackSpeed = Mathf.Max(0.1f, playbackSpeed);
            endingVideoPlayer.Prepare();

            var deadline = Time.realtimeSinceStartup + 8f;
            while (!endingVideoPlayer.isPrepared && Time.realtimeSinceStartup < deadline)
            {
                yield return null;
            }

            if (!endingVideoPlayer.isPrepared)
            {
                endingVideoFallbackClock = true;
                audioStatus = "ED video prepare timeout; rhythm clock";
                yield break;
            }

            endingVideoReady = true;
            endingVideoFallbackClock = false;
            audioStatus = "ED video ready: " + Path.GetFileName(filePath);
            if (paused)
            {
                audioStatus = "ED video ready: paused";
                yield break;
            }

            StartEndingVideo();
        }

        private void EnsureEndingVideoPlayer()
        {
            if (endingVideoTexture == null)
            {
                endingVideoTexture = new RenderTexture(960, 540, 0, RenderTextureFormat.ARGB32);
                endingVideoTexture.name = "JiiKobushiEndingVideoPreview";
            }

            if (audioSource == null) audioSource = gameObject.AddComponent<AudioSource>();

            if (endingVideoPlayer == null)
            {
                endingVideoPlayer = gameObject.AddComponent<VideoPlayer>();
                endingVideoPlayer.playOnAwake = false;
                endingVideoPlayer.isLooping = false;
                endingVideoPlayer.renderMode = VideoRenderMode.RenderTexture;
                endingVideoPlayer.audioOutputMode = VideoAudioOutputMode.AudioSource;
                endingVideoPlayer.controlledAudioTrackCount = 1;
                endingVideoPlayer.EnableAudioTrack(0, true);
                endingVideoPlayer.SetTargetAudioSource(0, audioSource);
            }

            endingVideoPlayer.targetTexture = endingVideoTexture;
            audioSource.playOnAwake = false;
            audioSource.loop = false;
            audioSource.volume = 1f;
            audioSource.pitch = Mathf.Max(0.1f, playbackSpeed);
        }

        private void StartEndingVideo()
        {
            if (!useAudioClock || !endingVideoReady || endingVideoPlayer == null || !endingVideoPlayer.isPrepared) return;
            endingVideoPlayer.time = 0;
            endingSession?.SeekBattleClockMs(0);
            endingVideoPlayer.Play();
            endingVideoStarted = true;
            endingVideoFallbackClock = false;
            audioStatus = "ED video playing: " + Path.GetFileName(endingVideoPath);
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
            var bgmPath = ResolveRuntimeAssetLocalPath(stage.Audio.Bgm.AssetSrc);
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
            if (!HasActiveSession || IsComplete) return;
            if (paused) ResumeRun();
            else PauseRun();
        }

        private void PauseRun()
        {
            if (paused) return;
            paused = true;
            holdButtonWasDown = false;
            if (prototypeMode == PrototypeMode.EndingBonus)
            {
                endingSession.Pause();
                if (endingVideoPlayer != null && endingVideoPlayer.isPlaying) endingVideoPlayer.Pause();
                audioStatus = endingVideoStarted && !endingVideoFallbackClock ? "ED video paused" : "ED rhythm paused";
                return;
            }

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
            if (prototypeMode == PrototypeMode.EndingBonus)
            {
                endingSession.Resume();
                if (endingVideoStarted && endingVideoPlayer != null && endingVideoReady)
                {
                    endingVideoPlayer.Play();
                    audioStatus = "ED video playing: " + Path.GetFileName(endingVideoPath);
                }
                else if (endingVideoReady)
                {
                    StartEndingVideo();
                }
                else
                {
                    audioStatus = "ED rhythm clock";
                }
                return;
            }

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

        private void HandleStageSessionComplete()
        {
            if (completionHandled) return;
            completionHandled = true;
            paused = false;
            holdButtonWasDown = false;
            RecordCurrentStageResult();
            StopBgmForResult();
        }

        private void ResetRunResultsIfNeeded()
        {
            runProgress.ResetIfNeeded(difficulty, CurrentRunLoop, CurrentStageIndex);
        }

        private void RecordCurrentStageResult()
        {
            if (stage == null || stage.Stage == null || session == null) return;
            runProgress.Record(CurrentStageNumber, stage.Stage.Title, session.BuildResult());
        }

        private void StopBgm()
        {
            if (audioLoadRoutine != null)
            {
                StopCoroutine(audioLoadRoutine);
                audioLoadRoutine = null;
            }

            StopEndingVideo();
            if (audioSource != null) audioSource.Stop();
            audioReady = false;
            audioStarted = false;
            audioFallbackClock = false;
            paused = false;
            audioStatus = "BGM not loaded";
        }

        private void StopEndingVideo()
        {
            if (endingVideoLoadRoutine != null)
            {
                StopCoroutine(endingVideoLoadRoutine);
                endingVideoLoadRoutine = null;
            }

            if (endingVideoPlayer != null) endingVideoPlayer.Stop();
            endingVideoReady = false;
            endingVideoStarted = false;
            endingVideoFallbackClock = false;
            endingVideoAssetSrc = "";
            endingVideoPath = "";
        }

        private void LoadStageBackground()
        {
            ClearStageBackground();
            if (stage == null || stage.Stage == null)
            {
                stageBackgroundStatus = "background unavailable";
                return;
            }

            stageBackgroundAssetSrc = StageRuntimeVisualAssets.GetBackgroundAssetPath(stage.Stage.Id);
            if (string.IsNullOrEmpty(stageBackgroundAssetSrc))
            {
                stageBackgroundStatus = "background unmapped";
                return;
            }

            Texture2D cached;
            if (backgroundTextureCache.TryGetValue(stageBackgroundAssetSrc, out cached) && cached != null)
            {
                stageBackgroundTexture = cached;
                stageBackgroundStatus = "background cached";
                return;
            }

            var backgroundPath = ResolveRuntimeAssetLocalPath(stageBackgroundAssetSrc);
            if (string.IsNullOrEmpty(backgroundPath))
            {
                stageBackgroundStatus = "background missing: " + stageBackgroundAssetSrc;
                return;
            }

            LoadStageBackgroundFromFile(stageBackgroundAssetSrc, backgroundPath);
        }

        private void ClearStageBackground()
        {
            stageBackgroundTexture = null;
            stageBackgroundAssetSrc = "";
            stageBackgroundStatus = "background not loaded";
        }

        private void LoadStageBackgroundFromFile(string assetSrc, string filePath)
        {
            try
            {
                var bytes = File.ReadAllBytes(filePath);
                var texture = new Texture2D(2, 2, TextureFormat.RGBA32, false);
                if (!ImageConversion.LoadImage(texture, bytes))
                {
                    stageBackgroundStatus = "background decode failed";
                    return;
                }

                backgroundTextureCache[assetSrc] = texture;
                if (assetSrc == stageBackgroundAssetSrc)
                {
                    stageBackgroundTexture = texture;
                    stageBackgroundStatus = "background loaded";
                }
            }
            catch (Exception ex)
            {
                stageBackgroundStatus = "background load failed: " + ex.Message;
            }
        }

        private string ResolveRuntimeAssetLocalPath(string assetSrc)
        {
            return ResolveRuntimeAssetPath(assetSrc, RuntimeCatalog, Application.streamingAssetsPath);
        }

        private RuntimeAssetCatalog RuntimeCatalog
        {
            get
            {
                if (runtimeAssetCatalog != null) return runtimeAssetCatalog;
                try
                {
                    var manifest = StageJsonLoader.LoadRuntimeAssetManifest(ProfileTestRunner.ResolveRuntimeAssetManifestPath("runtime-assets.json"));
                    runtimeAssetCatalog = RuntimeAssetCatalog.FromManifest(manifest);
                }
                catch (Exception ex)
                {
                    Debug.LogWarning("Runtime asset catalog unavailable; falling back to directory search. " + ex.Message);
                    runtimeAssetCatalog = null;
                }

                return runtimeAssetCatalog;
            }
        }

        private static string ResolveRuntimeAssetPath(string assetSrc, RuntimeAssetCatalog catalog, string streamingAssetsRoot)
        {
            if (string.IsNullOrEmpty(assetSrc)) return "";
            var normalized = RuntimeAssetPathUtility.NormalizeAssetPath(assetSrc);

            if (catalog != null)
            {
                var streamingPath = catalog.ResolveStreamingAssetsPath(normalized, streamingAssetsRoot);
                if (!string.IsNullOrEmpty(streamingPath)) return streamingPath;
            }
            else
            {
                var streamingPath = RuntimeAssetPathUtility.ResolveStreamingAssetsPath(normalized, streamingAssetsRoot);
                if (!string.IsNullOrEmpty(streamingPath)) return streamingPath;
            }

            if (catalog != null)
            {
                var catalogPath = catalog.ResolveLocalPath(normalized);
                if (!string.IsNullOrEmpty(catalogPath)) return catalogPath;
            }

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

        private void DrawLoopButtons(int left, int top)
        {
            GUI.Label(new Rect(left, top, 58, 28), "Loop");
            DrawLoopButton(1, left + 48, top);
            DrawLoopButton(2, left + 104, top);
        }

        private void DrawLoopButton(int value, int left, int top)
        {
            var label = CurrentRunLoop == value ? "[" + value + "]" : value.ToString();
            if (GUI.Button(new Rect(left, top, 50, 32), label))
            {
                runLoop = value;
                ReloadCurrentMode();
            }
        }

        private void DrawDifficultyButton(string id, int left, int top)
        {
            var label = difficulty == id ? "[" + id + "]" : id;
            if (GUI.Button(new Rect(left, top, 84, 32), label))
            {
                difficulty = id;
                ReloadCurrentMode();
            }
        }

        private static string NormalizeDifficulty(string value)
        {
            if (value == "easy" || value == "normal" || value == "hard") return value;
            return "normal";
        }

        private static StageLoopData ResolveStageLoop(StageExport stage, string loop)
        {
            if (stage.Loops != null && stage.Loops.ContainsKey(loop)) return stage.Loops[loop];
            return new StageLoopData
            {
                Label = "1周目",
                Difficulty = stage.Difficulty,
                Charts = stage.Charts
            };
        }

        private void DrawInputButtons(int left, int top)
        {
            if (!HasActiveSession) return;
            var disabled = paused || IsComplete;
            var previousEnabled = GUI.enabled;
            GUI.enabled = previousEnabled && !disabled;

            if (GUI.Button(new Rect(left, top, 160, 52), "Tap / Mash"))
            {
                TapActive();
            }

            var holdRect = new Rect(left + 172, top, 160, 52);
            GUI.RepeatButton(holdRect, "Hold");

            var currentEvent = Event.current;
            if (!disabled && currentEvent.type == EventType.MouseDown && holdRect.Contains(currentEvent.mousePosition) && !holdButtonWasDown)
            {
                HoldDownActive();
                holdButtonWasDown = true;
                currentEvent.Use();
            }
            else if (!disabled && currentEvent.type == EventType.MouseUp && holdButtonWasDown)
            {
                HoldUpActive();
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
