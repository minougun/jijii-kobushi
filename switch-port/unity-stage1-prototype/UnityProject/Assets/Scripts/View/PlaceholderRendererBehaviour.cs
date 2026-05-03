#if UNITY_5_3_OR_NEWER
using System;
using System.Collections.Generic;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class PlaceholderRendererBehaviour : MonoBehaviour
    {
        [SerializeField] private string difficulty = "normal";
        [SerializeField] private string profile = "perfect";
        [SerializeField] private float playbackSpeed = 24f;

        private readonly PlaceholderRenderer placeholderRenderer = new PlaceholderRenderer();
        private StageExport stage;
        private BattleRunResult result;
        private AudioClock clock;
        private List<NoteData> chart;
        private int currentNoteIndex;
        private string stageJsonPath = "";
        private string expectedJsonPath = "";
        private string status = "Not loaded";
        private string error = "";

        private void Start()
        {
            LoadAndStart();
        }

        private void Update()
        {
            if (clock == null || result == null || IsComplete) return;

            var deltaMs = (int)Math.Round(Time.deltaTime * 1000.0f * Mathf.Max(0.1f, playbackSpeed), MidpointRounding.AwayFromZero);
            clock.AdvanceMs(deltaMs);
            UpdateCurrentNote();
        }

        private void OnGUI()
        {
            const int left = 16;
            var top = 16;
            GUI.Label(new Rect(left, top, 1000, 24), "Jijii Kobushi Stage 1 Unity Prototype");
            top += 24;
            GUI.Label(new Rect(left, top, 1000, 24), "phase=" + Phase + " difficulty=" + difficulty + " profile=" + profile + " speed=" + playbackSpeed + "x");
            top += 24;

            if (!string.IsNullOrEmpty(error))
            {
                GUI.Label(new Rect(left, top, 1200, 120), error);
                top += 124;
            }
            else if (clock != null && result != null)
            {
                var frame = BuildFrame();
                GUI.Label(new Rect(left, top, 1000, 24), placeholderRenderer.FormatDebugLine(frame));
                top += 24;
                GUI.Label(new Rect(left, top, 1000, 24), "stageJson=" + stageJsonPath);
                top += 24;
                GUI.Label(new Rect(left, top, 1000, 24), "expectedJson=" + expectedJsonPath);
                top += 24;
                GUI.Label(new Rect(left, top, 1000, 24), "currentNote=" + CurrentNoteLabel);
                top += 24;
                GUI.Label(new Rect(left, top, 1000, 24), status);
                top += 24;

                if (IsComplete)
                {
                    GUI.Label(new Rect(left, top, 1000, 24), "RESULT clear=" + result.Clear + " score=" + result.Score + " rank=" + result.Rank + " maxCombo=" + result.MaxCombo);
                    top += 24;
                    GUI.Label(new Rect(left, top, 1000, 24), "stats perfect/good/bad/miss=" + result.Stats.Perfect + "/" + result.Stats.Good + "/" + result.Stats.Bad + "/" + result.Stats.Miss);
                    top += 24;
                }
            }
            else
            {
                GUI.Label(new Rect(left, top, 1000, 24), status);
                top += 24;
            }

            if (GUI.Button(new Rect(left, top + 8, 120, 32), "Restart"))
            {
                LoadAndStart();
            }
        }

        private void LoadAndStart()
        {
            try
            {
                error = "";
                stageJsonPath = ProfileTestRunner.ResolveStagePackPath("shotengai.stage.json");
                expectedJsonPath = ProfileTestRunner.ResolveStagePackPath("expected-results.json");

                ProfileTestRunner.RunAll(stageJsonPath, expectedJsonPath);
                stage = StageJsonLoader.LoadStage(stageJsonPath);

                if (!stage.Charts.ContainsKey(difficulty)) difficulty = "normal";
                if (!IsKnownProfile(profile)) profile = "perfect";
                chart = stage.Charts[difficulty];
                result = BattleSimulator.Simulate(stage, difficulty, profile);

                var countInMs = (int)Math.Round(stage.Audio.Timing.CountInLeadSeconds * 1000.0, MidpointRounding.AwayFromZero);
                clock = new AudioClock(countInMs);
                currentNoteIndex = 0;
                status = "Loaded Stage 1 and parity tests passed. First note virtual timeline is " + clock.ToVirtualTimelineMs(chart[0].TimeMs) + "ms.";
            }
            catch (Exception ex)
            {
                error = ex.ToString();
                status = "Load failed";
                Debug.LogException(ex);
            }
        }

        private void UpdateCurrentNote()
        {
            if (chart == null) return;

            var battleMs = clock.BattleClockMs;
            while (currentNoteIndex < chart.Count)
            {
                var note = chart[currentNoteIndex];
                if (battleMs < note.TimeMs + note.DurationMs) return;
                currentNoteIndex += 1;
            }
        }

        private static bool IsKnownProfile(string profileName)
        {
            for (var i = 0; i < BattleSimulator.Profiles.Length; i += 1)
            {
                if (BattleSimulator.Profiles[i] == profileName) return true;
            }

            return false;
        }

        private PlaceholderFrame BuildFrame()
        {
            return new PlaceholderFrame
            {
                TimelineMs = clock.ElapsedMs,
                BattleClockMs = clock.BattleClockMs,
                RemainingHp = IsComplete ? result.RemainingHp : result.MaxHp,
                MaxCombo = IsComplete ? result.MaxCombo : 0,
                Stats = IsComplete ? result.Stats : new JudgeStats(),
                RecentNotes = result.Samples
            };
        }

        private bool IsComplete
        {
            get { return clock != null && result != null && clock.ElapsedMs >= result.FinishTimelineMs; }
        }

        private string Phase
        {
            get
            {
                if (clock == null) return "Boot";
                if (clock.CountInRemainingMs > 0) return "CountIn " + clock.CountInRemainingMs + "ms";
                if (IsComplete) return "Result";
                return "Battle";
            }
        }

        private string CurrentNoteLabel
        {
            get
            {
                if (chart == null || chart.Count == 0) return "none";
                if (currentNoteIndex >= chart.Count) return "complete";

                var note = chart[currentNoteIndex];
                return note.Id + " type=" + note.Type + " battleMs=" + note.TimeMs + " virtualMs=" + clock.ToVirtualTimelineMs(note.TimeMs);
            }
        }
    }
}
#endif
