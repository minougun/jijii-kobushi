#if UNITY_5_3_OR_NEWER
using System;
using System.Collections.Generic;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class PlaceholderRendererBehaviour : MonoBehaviour
    {
        [SerializeField] private string difficulty = "normal";
        [SerializeField] private float playbackSpeed = 1f;

        private readonly PlaceholderRenderer placeholderRenderer = new PlaceholderRenderer();
        private StageExport stage;
        private InteractiveBattleSession session;
        private List<NoteData> chart;
        private string stageJsonPath = "";
        private string expectedJsonPath = "";
        private string status = "Not loaded";
        private string error = "";
        private bool holdButtonWasDown;

        private void Start()
        {
            LoadAndStart();
        }

        private void Update()
        {
            if (session == null || session.IsComplete) return;

            var deltaMs = (int)Math.Round(Time.deltaTime * 1000.0f * Mathf.Max(0.1f, playbackSpeed), MidpointRounding.AwayFromZero);
            session.AdvanceMs(deltaMs);
            PollKeyboardInput();
        }

        private void OnGUI()
        {
            const int left = 16;
            var top = 16;
            GUI.Label(new Rect(left, top, 1000, 24), "Jijii Kobushi Stage 1 Unity Prototype");
            top += 24;
            GUI.Label(new Rect(left, top, 1000, 24), "phase=" + Phase + " difficulty=" + difficulty + " speed=" + playbackSpeed + "x");
            top += 24;

            if (!string.IsNullOrEmpty(error))
            {
                GUI.Label(new Rect(left, top, 1200, 120), error);
                top += 124;
            }
            else if (session != null)
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
                GUI.Label(new Rect(left, top, 1000, 24), "input: Space/Z = Tap or Mash, X/J = Hold, Enter = Restart");
                top += 24;
                GUI.Label(new Rect(left, top, 1000, 24), "judge=" + session.LastJudgeText + " combo=" + session.Combo + " notes=" + session.ResolvedCount + "/" + session.TotalNotes);
                top += 24;
                GUI.Label(new Rect(left, top, 1000, 24), status);
                top += 24;

                if (IsComplete)
                {
                    var result = session.BuildResult();
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

            DrawDifficultyButtons(left, top + 8);
            top += 46;

            if (GUI.Button(new Rect(left, top + 8, 120, 44), "Restart"))
            {
                LoadAndStart();
            }

            DrawInputButtons(left + 136, top + 8);
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
                chart = stage.Charts[difficulty];
                session = new InteractiveBattleSession(stage, difficulty);
                holdButtonWasDown = false;
                status = "Loaded Stage 1 and parity tests passed. First note virtual timeline is " + (session.CountInMs + chart[0].TimeMs) + "ms.";
            }
            catch (Exception ex)
            {
                error = ex.ToString();
                status = "Load failed";
                Debug.LogException(ex);
            }
        }

        private void PollKeyboardInput()
        {
            if (Input.GetKeyDown(KeyCode.Return))
            {
                LoadAndStart();
                return;
            }

            if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Z))
            {
                session.Tap();
            }

            if (Input.GetKeyDown(KeyCode.X) || Input.GetKeyDown(KeyCode.J))
            {
                session.HoldDown();
            }

            if (Input.GetKeyUp(KeyCode.X) || Input.GetKeyUp(KeyCode.J))
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
                if (session.CountInRemainingMs > 0) return "CountIn " + session.CountInRemainingMs + "ms";
                if (IsComplete) return "Result";
                return "Battle";
            }
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

            if (GUI.Button(new Rect(left, top, 160, 64), "Tap / Mash"))
            {
                session.Tap();
            }

            var holdRect = new Rect(left + 172, top, 160, 64);
            GUI.RepeatButton(holdRect, "Hold");

            var currentEvent = Event.current;
            if (currentEvent.type == EventType.MouseDown && holdRect.Contains(currentEvent.mousePosition) && !holdButtonWasDown)
            {
                session.HoldDown();
                holdButtonWasDown = true;
                currentEvent.Use();
            }
            else if (currentEvent.type == EventType.MouseUp && holdButtonWasDown)
            {
                session.HoldUp();
                holdButtonWasDown = false;
                currentEvent.Use();
            }
        }
    }
}
#endif
