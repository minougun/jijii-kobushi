#if UNITY_5_3_OR_NEWER
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public static class PrototypeCharacterPanel
    {
        public static void DrawStageCharacters(Rect mainRect, StageExport stage, Texture2D characterSheetTexture)
        {
            if (stage == null || stage.Enemy == null) return;
            if (characterSheetTexture == null) return;

            var heroKey = stage.Stage != null && stage.Stage.Id == "shotengai" ? "heroStage1" : "heroKimono";
            var heroSpec = StageRuntimeVisualAssets.GetChibiSpriteSpec(heroKey);
            var enemySpec = StageRuntimeVisualAssets.GetChibiSpriteSpec(stage.Enemy.Kind);
            if (heroSpec == null || enemySpec == null) return;

            var baseline = mainRect.y + 430f;
            DrawChibiSprite(characterSheetTexture, new Rect(mainRect.x + 260f, baseline - heroSpec.DrawHeight, heroSpec.DrawWidth, heroSpec.DrawHeight), heroSpec, false);
            DrawChibiSprite(characterSheetTexture, new Rect(mainRect.x + mainRect.width - 410f, baseline - enemySpec.DrawHeight, enemySpec.DrawWidth, enemySpec.DrawHeight), enemySpec, false);
        }

        public static void DrawSpecialCutin(
            Rect mainRect,
            Texture2D specialCutinTexture,
            bool shouldShow,
            int currentStageNumber,
            GUIStyle strongStyle,
            GUIStyle panelLabelStyle)
        {
            if (specialCutinTexture == null || !shouldShow) return;

            var cutinHeight = Mathf.Min(230f, mainRect.height * 0.36f);
            var cutinRect = new Rect(mainRect.x, mainRect.y + 18f, mainRect.width, cutinHeight);
            PrototypeGui.FillRect(cutinRect, new Color(0.02f, 0.015f, 0.012f, 0.68f));
            GUI.DrawTexture(cutinRect, specialCutinTexture, ScaleMode.ScaleAndCrop, true);
            PrototypeGui.StrokeRect(cutinRect, new Color(0.96f, 0.78f, 0.18f), 3);

            var badge = new Rect(cutinRect.x + cutinRect.width - 278f, cutinRect.y + 30f, 232f, 118f);
            PrototypeGui.FillRect(badge, new Color(0.04f, 0.035f, 0.03f, 0.86f));
            PrototypeGui.StrokeRect(badge, new Color(0.96f, 0.78f, 0.18f), 2);
            GUI.Label(new Rect(badge.x + 18f, badge.y + 16f, 190f, 28f), currentStageNumber >= 4 ? "奥義" : "十連", strongStyle);
            GUI.Label(new Rect(badge.x + 18f, badge.y + 48f, 190f, 34f), currentStageNumber >= 4 ? "爺コブシ" : "大追撃", strongStyle);
            GUI.Label(new Rect(badge.x + 18f, badge.y + 84f, 190f, 24f), currentStageNumber >= 4 ? "内部破壊" : "追撃", panelLabelStyle);
        }

        public static void DrawFinalRevealSprite(Rect panel, Texture2D finalRevealTexture, bool shouldShow)
        {
            if (finalRevealTexture == null || !shouldShow) return;

            var imageRect = new Rect(panel.x + panel.width - 146f, panel.y + 54f, 104f, 116f);
            PrototypeGui.FillRect(imageRect, new Color(0.08f, 0.075f, 0.07f, 0.82f));
            GUI.DrawTexture(imageRect, finalRevealTexture, ScaleMode.ScaleToFit, true);
            PrototypeGui.StrokeRect(imageRect, new Color(0.96f, 0.78f, 0.18f), 2);
        }

        private static void DrawChibiSprite(Texture2D characterSheetTexture, Rect target, CharacterSpriteSpec spec, bool flipX)
        {
            if (characterSheetTexture == null || spec == null) return;
            var col = spec.Index % StageRuntimeVisualAssets.ChibiSheetColumns;
            var row = spec.Index / StageRuntimeVisualAssets.ChibiSheetColumns;
            var u = col / (float)StageRuntimeVisualAssets.ChibiSheetColumns;
            var v = 1f - ((row + 1) / (float)StageRuntimeVisualAssets.ChibiSheetRows);
            var w = 1f / StageRuntimeVisualAssets.ChibiSheetColumns;
            var h = 1f / StageRuntimeVisualAssets.ChibiSheetRows;
            var texCoords = flipX ? new Rect(u + w, v, -w, h) : new Rect(u, v, w, h);
            GUI.DrawTextureWithTexCoords(target, characterSheetTexture, texCoords, true);
        }
    }
}
#endif
