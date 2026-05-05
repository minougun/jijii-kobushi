#if UNITY_5_3_OR_NEWER
using System;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public static class PrototypeResultPanel
    {
        public static void DrawRankBadge(Rect rect, string rank, GUIStyle titleStyle)
        {
            PrototypeGui.FillRect(rect, new Color(0.86f, 0.62f, 0.16f));
            PrototypeGui.StrokeRect(rect, new Color(0.05f, 0.05f, 0.05f), 3);
            GUI.Label(rect, rank, titleStyle);
        }

        public static void DrawResultStat(Rect rect, string label, string value, string sub, GUIStyle panelLabelStyle, GUIStyle strongStyle, GUIStyle labelStyle)
        {
            PrototypeGui.FillRect(rect, new Color(1f, 1f, 1f));
            PrototypeGui.StrokeRect(rect, new Color(0.82f, 0.78f, 0.7f), 1);
            GUI.Label(new Rect(rect.x + 9, rect.y + 6, rect.width - 18, 18), label, panelLabelStyle);
            GUI.Label(new Rect(rect.x + 9, rect.y + 20, rect.width - 18, 24), value, strongStyle);
            GUI.Label(new Rect(rect.x + 9, rect.y + 38, rect.width - 18, 16), sub, labelStyle);
        }

        public static void DrawStageResultRows(Rect rect, RunProgressTracker runProgress, GUIStyle panelLabelStyle)
        {
            PrototypeGui.FillRect(rect, new Color(0.08f, 0.075f, 0.07f));
            PrototypeGui.StrokeRect(rect, new Color(0.82f, 0.78f, 0.7f), 1);
            GUI.Label(new Rect(rect.x + 10, rect.y + 6, 140, 18), "ステージ別成績", panelLabelStyle);

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

        public static void DrawEndingResultPanel(
            Rect mainRect,
            EndingBonusRunResult endingResult,
            RunProgressTracker runProgress,
            int currentRunLoop,
            string difficulty,
            GUIStyle titleStyle,
            GUIStyle labelStyle,
            GUIStyle panelLabelStyle,
            GUIStyle strongStyle,
            Action nextLoop,
            Action retryEnding)
        {
            var panel = DrawPanelFrame(mainRect, 820f, 284f, 424f);
            var accuracy = endingResult.NoteCount > 0 ? Mathf.RoundToInt((endingResult.Hits / (float)endingResult.NoteCount) * 100f) : 0;
            var finalRank = runProgress.FinalRank;
            DrawRankBadge(new Rect(panel.x + 20, panel.y + 58, 92, 92), finalRank, titleStyle);
            GUI.Label(new Rect(panel.x + 128, panel.y + 14, 420, 24), "FINAL RESULT", panelLabelStyle);
            GUI.Label(new Rect(panel.x + 128, panel.y + 56, 440, 38), "総合ランク " + finalRank, titleStyle);
            GUI.Label(new Rect(panel.x + 128, panel.y + 92, 520, 24), "Loop " + currentRunLoop + " / " + difficulty + " / stages " + runProgress.Count + "/" + StagePackCatalog.Count, labelStyle);
            DrawResultStat(new Rect(panel.x + 128, panel.y + 124, 132, 54), "平均", runProgress.AverageScore + " pts", "7 stages", panelLabelStyle, strongStyle, labelStyle);
            DrawResultStat(new Rect(panel.x + 270, panel.y + 124, 132, 54), "総合", runProgress.TotalScore + " pts", "stage total", panelLabelStyle, strongStyle, labelStyle);
            DrawResultStat(new Rect(panel.x + 412, panel.y + 124, 132, 54), "ED拍", endingResult.Score + " pts", "bonus", panelLabelStyle, strongStyle, labelStyle);
            DrawResultStat(new Rect(panel.x + 554, panel.y + 124, 132, 54), "成功", endingResult.Hits + "/" + endingResult.NoteCount, accuracy + "%", panelLabelStyle, strongStyle, labelStyle);
            DrawStageResultRows(new Rect(panel.x + 20, panel.y + 188, panel.width - 40, 52), runProgress, panelLabelStyle);

            if (GUI.Button(new Rect(panel.x + panel.width - 178, panel.y + panel.height - 38, 152, 30), "Next Loop"))
            {
                if (nextLoop != null) nextLoop();
            }

            if (GUI.Button(new Rect(panel.x + panel.width - 338, panel.y + panel.height - 38, 146, 30), "Retry ED"))
            {
                if (retryEnding != null) retryEnding();
            }
        }

        public static void DrawStageResultPanel(
            Rect mainRect,
            BattleRunResult result,
            string resultScenarioLine,
            bool isFinalStageResult,
            bool canStartEndingBonus,
            bool canAdvanceToNextStage,
            Texture2D finalRevealTexture,
            GUIStyle titleStyle,
            GUIStyle labelStyle,
            GUIStyle panelLabelStyle,
            GUIStyle strongStyle,
            Action startEndingBonus,
            Action advanceToNextStage,
            Action retryStage)
        {
            var panel = DrawPanelFrame(mainRect, isFinalStageResult ? 760f : 620f, 214f, 458f);
            DrawRankBadge(new Rect(panel.x + 20, panel.y + 58, 92, 92), result.Rank, titleStyle);
            GUI.Label(new Rect(panel.x + 128, panel.y + 14, 360, 24), result.Clear ? "STAGE CLEAR" : "FAILED", panelLabelStyle);
            GUI.Label(new Rect(panel.x + 128, panel.y + 56, 360, 38), result.Score + " pts", titleStyle);
            GUI.Label(new Rect(panel.x + 128, panel.y + 92, panel.width - 154, 24), resultScenarioLine, labelStyle);
            DrawResultStat(new Rect(panel.x + 128, panel.y + 124, 132, 54), "Max combo", result.MaxCombo.ToString(), "chain", panelLabelStyle, strongStyle, labelStyle);
            DrawResultStat(new Rect(panel.x + 270, panel.y + 124, 132, 54), "Notes", result.Stats.Perfect + "/" + result.NoteCount, "perfect", panelLabelStyle, strongStyle, labelStyle);
            DrawResultStat(new Rect(panel.x + 412, panel.y + 124, 132, 54), "HP", result.RemainingHp + "/" + result.MaxHp, "remaining", panelLabelStyle, strongStyle, labelStyle);
            PrototypeCharacterPanel.DrawFinalRevealSprite(panel, finalRevealTexture, result.Clear && isFinalStageResult);

            if (canStartEndingBonus)
            {
                if (GUI.Button(new Rect(panel.x + panel.width - 178, panel.y + 178, 152, 30), "ED Bonus"))
                {
                    if (startEndingBonus != null) startEndingBonus();
                }
            }
            else
            {
                var previousEnabled = GUI.enabled;
                GUI.enabled = previousEnabled && canAdvanceToNextStage;
                if (GUI.Button(new Rect(panel.x + panel.width - 178, panel.y + 178, 152, 30), "Next Stage"))
                {
                    if (advanceToNextStage != null) advanceToNextStage();
                }
                GUI.enabled = previousEnabled;
            }

            if (GUI.Button(new Rect(panel.x + panel.width - 338, panel.y + 178, 146, 30), "Retry"))
            {
                if (retryStage != null) retryStage();
            }
        }

        private static Rect DrawPanelFrame(Rect mainRect, float desiredWidth, float height, float yOffset)
        {
            var panelWidth = Mathf.Min(desiredWidth, mainRect.width - 72f);
            var panel = new Rect(mainRect.x + (mainRect.width - panelWidth) * 0.5f, mainRect.y + yOffset, panelWidth, height);
            PrototypeGui.FillRect(panel, new Color(1f, 0.985f, 0.94f));
            PrototypeGui.StrokeRect(panel, new Color(0.05f, 0.05f, 0.05f), 3);
            PrototypeGui.FillRect(new Rect(panel.x, panel.y, panel.width, 44), new Color(0.08f, 0.075f, 0.07f));
            return panel;
        }
    }
}
#endif
