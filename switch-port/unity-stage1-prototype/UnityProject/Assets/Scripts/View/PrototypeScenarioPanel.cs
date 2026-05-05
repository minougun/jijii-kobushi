#if UNITY_5_3_OR_NEWER
using System;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public static class PrototypeScenarioPanel
    {
        public static void DrawStageIntroOverlay(
            Rect mainRect,
            int introLineIndex,
            int introLineCount,
            string currentIntroLine,
            GUIStyle strongStyle,
            GUIStyle panelLabelStyle,
            Action advanceIntro)
        {
            var panelWidth = Mathf.Min(860f, mainRect.width - 96f);
            var panelHeight = 174f;
            var panel = new Rect(mainRect.x + (mainRect.width - panelWidth) * 0.5f, mainRect.y + mainRect.height - panelHeight - 96f, panelWidth, panelHeight);
            PrototypeGui.FillRect(panel, new Color(0.05f, 0.048f, 0.044f, 0.94f));
            PrototypeGui.StrokeRect(panel, new Color(0.92f, 0.74f, 0.28f), 3);
            GUI.Label(new Rect(panel.x + 24f, panel.y + 16f, 360f, 28f), "語り", strongStyle);
            GUI.Label(new Rect(panel.x + panel.width - 154f, panel.y + 18f, 128f, 24f), (introLineIndex + 1) + " / " + Mathf.Max(1, introLineCount), panelLabelStyle);
            GUI.Label(new Rect(panel.x + 24f, panel.y + 52f, panel.width - 48f, 72f), currentIntroLine, panelLabelStyle);

            var actionLabel = introLineIndex + 1 >= introLineCount ? "戦闘へ" : "次へ";
            if (GUI.Button(new Rect(panel.x + panel.width - 156f, panel.y + panel.height - 42f, 132f, 30f), actionLabel))
            {
                if (advanceIntro != null) advanceIntro();
            }
            GUI.Label(new Rect(panel.x + 24f, panel.y + panel.height - 36f, panel.width - 200f, 24f), "Tap / A button advances scenario before the count-in starts.", panelLabelStyle);
        }

        public static void DrawBgmAttribution(Rect mainRect, string credit, GUIStyle panelLabelStyle)
        {
            if (string.IsNullOrEmpty(credit)) return;

            var rect = new Rect(mainRect.x + 24f, mainRect.y + mainRect.height - 104f, 220f, 24f);
            PrototypeGui.FillRect(rect, new Color(0.03f, 0.03f, 0.028f, 0.76f));
            GUI.Label(new Rect(rect.x + 8f, rect.y + 2f, rect.width - 16f, rect.height), credit, panelLabelStyle);
        }

        public static void DrawEndingVideoBackground(
            Rect mainRect,
            RenderTexture endingVideoTexture,
            bool endingVideoReady,
            GUIStyle panelLabelStyle)
        {
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
    }
}
#endif
