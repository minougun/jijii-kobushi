#if UNITY_5_3_OR_NEWER
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
    }
}
#endif
