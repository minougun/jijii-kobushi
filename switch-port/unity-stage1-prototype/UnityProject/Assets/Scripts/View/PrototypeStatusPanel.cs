#if UNITY_5_3_OR_NEWER
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public static class PrototypeStatusPanel
    {
        public static void DrawHud(
            Rect mainRect,
            bool isEndingBonus,
            int currentStageNumber,
            string phase,
            string currentLoopKey,
            string difficulty,
            float playbackSpeed,
            string clockMode,
            InteractiveBattleSession session,
            EndingBonusInteractiveSession endingSession,
            GUIStyle titleStyle,
            GUIStyle labelStyle,
            GUIStyle noteStyle)
        {
            var result = session != null ? session.BuildResult() : null;
            var endingResult = endingSession != null ? endingSession.BuildResult() : null;
            GUI.Label(new Rect(mainRect.x + 24, mainRect.y + 18, 420, 42), isEndingBonus ? "JII KOBUSHI ED BONUS" : "JII KOBUSHI STAGE " + currentStageNumber, titleStyle);
            GUI.Label(new Rect(mainRect.x + 26, mainRect.y + 58, 720, 24), "phase=" + phase + "  loop=" + currentLoopKey + "  difficulty=" + difficulty + "  speed=" + playbackSpeed + "x  clock=" + clockMode, labelStyle);

            var hpRect = new Rect(mainRect.x + mainRect.width - 340, mainRect.y + 24, 290, 26);
            if (isEndingBonus)
            {
                PrototypeGui.DrawMeter(hpRect, endingSession != null ? endingSession.ResolvedCount : 0, endingSession != null ? endingSession.TotalNotes : 1, new Color(0.83f, 0.42f, 0.08f), "BEAT", noteStyle);
                GUI.Label(new Rect(hpRect.x, hpRect.y + 32, 290, 24), "score=" + (endingResult != null ? endingResult.Score : 0) + "  bestCombo=" + (endingResult != null ? endingResult.BestCombo : 0), labelStyle);
            }
            else
            {
                PrototypeGui.DrawMeter(hpRect, session != null ? session.RemainingHp : 0, session != null ? session.MaxHp : 1, new Color(0.08f, 0.66f, 0.28f), "HP", noteStyle);
                GUI.Label(new Rect(hpRect.x, hpRect.y + 32, 290, 24), "score=" + (result != null ? result.Score : 0) + "  rank=" + (result != null ? result.Rank : "-"), labelStyle);
            }
        }

        public static void DrawStagePanel(
            Rect mainRect,
            bool isEndingBonus,
            string stageHeading,
            string introPreview,
            string currentNoteLabel,
            string status,
            string audioStatus,
            string stageBackgroundStatus,
            GUIStyle strongStyle,
            GUIStyle panelLabelStyle)
        {
            if (isEndingBonus)
            {
                var edPanel = new Rect(mainRect.x + 24, mainRect.y + 96, mainRect.width - 48, 70);
                PrototypeGui.FillRect(edPanel, new Color(0.06f, 0.055f, 0.05f, 0.9f));
                PrototypeGui.StrokeRect(edPanel, new Color(0.9f, 0.72f, 0.24f), 2);
                GUI.Label(new Rect(edPanel.x + 18, edPanel.y + 10, 520, 26), stageHeading, strongStyle);
                GUI.Label(new Rect(edPanel.x + 18, edPanel.y + 38, edPanel.width - 36, 24), audioStatus + "  " + status, panelLabelStyle);
                return;
            }

            var panel = new Rect(mainRect.x + 24, mainRect.y + 96, mainRect.width - 48, 170);
            PrototypeGui.FillRect(panel, new Color(0.15f, 0.14f, 0.13f));
            PrototypeGui.StrokeRect(panel, new Color(0.05f, 0.05f, 0.05f), 2);
            GUI.Label(new Rect(panel.x + 24, panel.y + 18, 460, 34), stageHeading, strongStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 54, panel.width - 48, 42), introPreview, panelLabelStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 98, 960, 24), "Space/Z/A: tap or mash    X/J/B: hold down, release at HOLD END    P/Esc/Select: pause    Enter/Start: restart", panelLabelStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 122, panel.width - 48, 24), "current: " + currentNoteLabel, panelLabelStyle);
            GUI.Label(new Rect(panel.x + 24, panel.y + 146, panel.width - 48, 24), status + "  " + audioStatus + "  " + stageBackgroundStatus, panelLabelStyle);
        }

        public static void DrawJudgePanel(
            Rect mainRect,
            JudgeStats stats,
            string lastJudgeText,
            int combo,
            int maxCombo,
            int resolvedCount,
            int totalNotes,
            GUIStyle strongStyle,
            GUIStyle panelLabelStyle)
        {
            var panel = new Rect(mainRect.x + 24, mainRect.y + 442, mainRect.width - 48, 62);
            PrototypeGui.FillRect(panel, new Color(0.12f, 0.11f, 0.1f));
            GUI.Label(new Rect(panel.x + 18, panel.y + 10, 360, 26), lastJudgeText, strongStyle);
            GUI.Label(new Rect(panel.x + 400, panel.y + 10, 520, 26), "combo=" + combo + "  max=" + maxCombo + "  notes=" + resolvedCount + "/" + totalNotes, panelLabelStyle);
            GUI.Label(new Rect(panel.x + 18, panel.y + 34, 720, 22), "perfect/good/bad/miss=" + stats.Perfect + "/" + stats.Good + "/" + stats.Bad + "/" + stats.Miss, panelLabelStyle);
        }
    }
}
#endif
