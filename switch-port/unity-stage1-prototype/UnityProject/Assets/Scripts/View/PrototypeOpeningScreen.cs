#if UNITY_5_3_OR_NEWER
using System;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public static class PrototypeOpeningScreen
    {
        public static void Draw(
            Rect mainRect,
            Texture2D openingStillTexture,
            string openingStillStatus,
            string difficulty,
            GUIStyle strongStyle,
            GUIStyle panelLabelStyle,
            Action<string> selectDifficulty,
            Action startGame)
        {
            PrototypeGui.FillRect(mainRect, new Color(0.10f, 0.075f, 0.045f));
            var imageRect = new Rect(mainRect.x + 48f, mainRect.y + 26f, mainRect.width - 96f, Mathf.Min(340f, mainRect.height - 206f));
            PrototypeGui.FillRect(imageRect, new Color(0.72f, 0.56f, 0.34f));
            if (openingStillTexture != null)
            {
                GUI.DrawTexture(imageRect, openingStillTexture, ScaleMode.ScaleToFit, true);
            }
            else
            {
                GUI.Label(new Rect(imageRect.x + 24f, imageRect.y + imageRect.height * 0.44f, imageRect.width - 48f, 28f), openingStillStatus, strongStyle);
            }
            PrototypeGui.StrokeRect(imageRect, new Color(0.04f, 0.035f, 0.03f), 3);

            var textPanel = new Rect(mainRect.x + 74f, imageRect.yMax + 14f, mainRect.width - 148f, 64f);
            PrototypeGui.FillRect(textPanel, new Color(0.05f, 0.045f, 0.04f, 0.92f));
            GUI.Label(new Rect(textPanel.x + 22f, textPanel.y + 12f, textPanel.width - 44f, 24f), "爺コブシ。", strongStyle);
            GUI.Label(new Rect(textPanel.x + 22f, textPanel.y + 36f, textPanel.width - 44f, 22f), "この物語は、立石小次郎と、その仲間たちが巻き起こす一大感動巨編である。", panelLabelStyle);

            var controls = new Rect(mainRect.x + (mainRect.width - 600f) * 0.5f, textPanel.yMax + 18f, 600f, 70f);
            PrototypeGui.FillRect(controls, new Color(1f, 0.985f, 0.94f, 0.96f));
            PrototypeGui.StrokeRect(controls, new Color(0.05f, 0.05f, 0.05f), 2);
            GUI.Label(new Rect(controls.x + 18f, controls.y + 12f, 112f, 24f), "難易度", strongStyle);
            DrawDifficultyButton("easy", controls.x + 126f, controls.y + 14f, difficulty, selectDifficulty);
            DrawDifficultyButton("normal", controls.x + 222f, controls.y + 14f, difficulty, selectDifficulty);
            DrawDifficultyButton("hard", controls.x + 342f, controls.y + 14f, difficulty, selectDifficulty);
            if (GUI.Button(new Rect(controls.x + 458f, controls.y + 12f, 122f, 42f), "開始"))
            {
                if (startGame != null) startGame();
            }
            GUI.Label(new Rect(controls.x + 18f, controls.y + 44f, 430f, 20f), "Tap / A button also starts the selected difficulty.", panelLabelStyle);
        }

        private static void DrawDifficultyButton(string value, float left, float top, string difficulty, Action<string> selectDifficulty)
        {
            var label = difficulty == value ? "[" + value + "]" : value;
            if (GUI.Button(new Rect(left, top, value == "normal" ? 102f : 82f, 34f), label))
            {
                if (selectDifficulty != null) selectDifficulty(value);
            }
        }
    }
}
#endif
