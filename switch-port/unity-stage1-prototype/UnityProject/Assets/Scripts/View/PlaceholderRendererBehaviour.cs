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
        private readonly MemoryRunSaveStore runSaveStore = new MemoryRunSaveStore();
        private string saveStatus = "save: empty";

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

        public string DebugSaveStatus
        {
            get { return saveStatus; }
        }

        public bool DebugSaveCurrentRun()
        {
            return SaveCurrentRun();
        }

        public bool DebugLoadCurrentRunSlot()
        {
            return LoadRunSave(RunSaveService.SlotForLoop(CurrentRunLoop));
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
            var events = StagePerfectInputPlanner.Build(stage, CurrentLoopKey, difficulty);
            for (var i = 0; i < events.Count && !session.IsComplete; i += 1)
            {
                session.SeekBattleClockMs(events[i].TimeMs);
                if (events[i].Action == StagePerfectInputPlanner.TapAction) session.Tap();
                else if (events[i].Action == StagePerfectInputPlanner.HoldDownAction) session.HoldDown();
                else if (events[i].Action == StagePerfectInputPlanner.HoldUpAction) session.HoldUp();
            }

            session.SeekBattleClockMs(StagePerfectInputPlanner.CompletionBattleClockMs(stage, CurrentLoopKey, difficulty));
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
            PrototypeGui.FillRect(new Rect(0, 0, Screen.width, Screen.height), new Color(0.07f, 0.07f, 0.08f));

            const int margin = 24;
            var width = Mathf.Max(720, Screen.width - margin * 2);
            var mainRect = new Rect(margin, margin, width, Mathf.Max(500, Screen.height - margin * 2));
            PrototypeGui.FillRect(mainRect, new Color(0.96f, 0.94f, 0.88f));
            DrawStageBackground(mainRect);
            DrawEndingVideoBackground(mainRect);
            PrototypeGui.StrokeRect(mainRect, new Color(0.12f, 0.11f, 0.1f), 3);

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
            PrototypeStatusPanel.DrawHud(
                mainRect,
                prototypeMode == PrototypeMode.EndingBonus,
                CurrentStageNumber,
                Phase,
                CurrentLoopKey,
                difficulty,
                playbackSpeed,
                ClockMode,
                session,
                endingSession,
                titleStyle,
                labelStyle,
                noteStyle);
        }

        private void DrawStagePanel(Rect mainRect)
        {
            PrototypeStatusPanel.DrawStagePanel(
                mainRect,
                prototypeMode == PrototypeMode.EndingBonus,
                StageHeading,
                IntroPreview,
                CurrentNoteLabel,
                status,
                audioStatus + " / " + saveStatus,
                stageBackgroundStatus,
                strongStyle,
                panelLabelStyle);
        }

        private void DrawStageBackground(Rect mainRect)
        {
            if (stageBackgroundTexture == null) return;
            GUI.DrawTexture(mainRect, stageBackgroundTexture, ScaleMode.ScaleAndCrop, false);
            PrototypeGui.FillRect(mainRect, new Color(0f, 0f, 0f, 0.28f));
        }

        private void DrawEndingVideoBackground(Rect mainRect)
        {
            if (prototypeMode != PrototypeMode.EndingBonus) return;

            PrototypeGui.FillRect(mainRect, new Color(0.04f, 0.045f, 0.055f));
            var videoRect = new Rect(mainRect.x + 24, mainRect.y + 96, mainRect.width - 48, 326);
            PrototypeGui.FillRect(videoRect, new Color(0.02f, 0.02f, 0.024f));
            if (endingVideoTexture != null && endingVideoReady)
            {
                GUI.DrawTexture(videoRect, endingVideoTexture, ScaleMode.ScaleToFit, false);
            }
            else
            {
                GUI.Label(new Rect(videoRect.x + 24, videoRect.y + 132, videoRect.width - 48, 28), "ED video preview loading / fallback rhythm clock", panelLabelStyle);
            }
            PrototypeGui.FillRect(mainRect, new Color(0f, 0f, 0f, 0.18f));
        }

        private void DrawRhythmLane(Rect mainRect)
        {
            PrototypeRhythmLane.Draw(
                mainRect,
                ActiveChart,
                HasActiveSession,
                ActiveCurrentNoteIndex,
                ActiveBattleClockMs,
                ActiveCountInRemainingMs,
                IsActiveHoldForNoteIndex,
                strongStyle,
                noteStyle,
                titleStyle);
        }

        private void DrawJudgePanel(Rect mainRect)
        {
            PrototypeStatusPanel.DrawJudgePanel(
                mainRect,
                ActiveJudgeStats,
                ActiveLastJudgeText,
                ActiveCombo,
                ActiveMaxCombo,
                ActiveResolvedCount,
                ActiveTotalNotes,
                strongStyle,
                panelLabelStyle);
        }

        private void DrawResultPanel(Rect mainRect)
        {
            var isEndingResult = prototypeMode == PrototypeMode.EndingBonus;
            var panelWidth = Mathf.Min(isEndingResult ? 820f : 620f, mainRect.width - 72f);
            var panelHeight = isEndingResult ? 284f : 214f;
            var panel = new Rect(mainRect.x + (mainRect.width - panelWidth) * 0.5f, mainRect.y + (isEndingResult ? 424f : 458f), panelWidth, panelHeight);
            PrototypeGui.FillRect(panel, new Color(1f, 0.985f, 0.94f));
            PrototypeGui.StrokeRect(panel, new Color(0.05f, 0.05f, 0.05f), 3);
            PrototypeGui.FillRect(new Rect(panel.x, panel.y, panel.width, 44), new Color(0.08f, 0.075f, 0.07f));
            if (prototypeMode == PrototypeMode.EndingBonus)
            {
                var endingResult = endingSession.BuildResult();
                var accuracy = endingResult.NoteCount > 0 ? Mathf.RoundToInt((endingResult.Hits / (float)endingResult.NoteCount) * 100f) : 0;
                var finalRank = runProgress.FinalRank;
                var stageAverage = runProgress.AverageScore;
                var stageTotal = runProgress.TotalScore;
                PrototypeResultPanel.DrawRankBadge(new Rect(panel.x + 20, panel.y + 58, 92, 92), finalRank, titleStyle);
                GUI.Label(new Rect(panel.x + 128, panel.y + 14, 420, 24), "FINAL RESULT", panelLabelStyle);
                GUI.Label(new Rect(panel.x + 128, panel.y + 56, 440, 38), "総合ランク " + finalRank, titleStyle);
                GUI.Label(new Rect(panel.x + 128, panel.y + 92, 520, 24), "Loop " + CurrentRunLoop + " / " + difficulty + " / stages " + runProgress.Count + "/" + StagePackCatalog.Count, labelStyle);
                DrawResultStat(new Rect(panel.x + 128, panel.y + 124, 132, 54), "平均", stageAverage + " pts", "7 stages");
                DrawResultStat(new Rect(panel.x + 270, panel.y + 124, 132, 54), "総合", stageTotal + " pts", "stage total");
                DrawResultStat(new Rect(panel.x + 412, panel.y + 124, 132, 54), "ED拍", endingResult.Score + " pts", "bonus");
                DrawResultStat(new Rect(panel.x + 554, panel.y + 124, 132, 54), "成功", endingResult.Hits + "/" + endingResult.NoteCount, accuracy + "%");
                PrototypeResultPanel.DrawStageResultRows(new Rect(panel.x + 20, panel.y + 188, panel.width - 40, 52), runProgress, panelLabelStyle);

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
            PrototypeResultPanel.DrawRankBadge(new Rect(panel.x + 20, panel.y + 58, 92, 92), result.Rank, titleStyle);
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

        private void DrawResultStat(Rect rect, string label, string value, string sub)
        {
            PrototypeResultPanel.DrawResultStat(rect, label, value, sub, panelLabelStyle, strongStyle, labelStyle);
        }

        private void DrawFooterControls(Rect mainRect)
        {
            PrototypeFooterControls.Draw(
                mainRect,
                prototypeMode == PrototypeMode.EndingBonus,
                HasActiveSession,
                paused,
                IsComplete,
                difficulty,
                CurrentRunLoop,
                ref holdButtonWasDown,
                SelectDifficulty,
                SelectLoop,
                ShowStages,
                PreviousStage,
                NextStage,
                ReloadCurrentMode,
                TogglePause,
                TapActive,
                HoldDownActive,
                HoldUpActive);
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

        private void PreviousStage()
        {
            ChangeStage(-1);
        }

        private void NextStage()
        {
            ChangeStage(1);
        }

        private void ShowStages()
        {
            stageNumber = 1;
            LoadAndStart();
        }

        private void SelectLoop(int value)
        {
            runLoop = value;
            ReloadCurrentMode();
        }

        private void SelectDifficulty(string value)
        {
            difficulty = value;
            ReloadCurrentMode();
        }

        private bool SaveCurrentRun()
        {
            try
            {
                RunSaveSnapshot snapshot;
                if (prototypeMode == PrototypeMode.EndingBonus)
                {
                    var maxHp = stage != null && stage.Player != null ? stage.Player.MaxHp : 12;
                    snapshot = RunSaveService.CreateNextLoopSnapshot(difficulty, CurrentRunLoop, maxHp);
                }
                else if (session != null)
                {
                    snapshot = RunSaveService.CreateStageSnapshot(difficulty, CurrentRunLoop, CurrentStageNumber, StagePackCatalog.Count, session, runProgress);
                }
                else
                {
                    return false;
                }

                runSaveStore.Save(snapshot);
                saveStatus = "save: " + snapshot.Slot + " loop " + snapshot.RunLoop + " stage " + snapshot.StageNumber;
                return true;
            }
            catch (Exception ex)
            {
                saveStatus = "save failed";
                error = ex.ToString();
                Debug.LogException(ex);
                return false;
            }
        }

        private bool LoadRunSave(RunSaveSlot slot)
        {
            RunSaveSnapshot snapshot;
            if (!runSaveStore.TryLoad(slot, out snapshot))
            {
                saveStatus = "load: empty " + slot;
                return false;
            }

            difficulty = snapshot.Difficulty;
            runLoop = Mathf.Max(1, snapshot.RunLoop);
            stageNumber = StagePackCatalog.ClampStageNumber(snapshot.StageNumber);
            RunSaveService.RestoreProgress(snapshot, runProgress);
            saveStatus = "load: " + slot + " loop " + runLoop + " stage " + stageNumber;
            LoadAndStart();
            return true;
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
            return RuntimeAssetPathUtility.ResolveRuntimePath(assetSrc, RuntimeCatalog, Application.streamingAssetsPath, Directory.GetCurrentDirectory());
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

        private static string ToFileUri(string path)
        {
            return new Uri(Path.GetFullPath(path)).AbsoluteUri;
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

    }
}
#endif
