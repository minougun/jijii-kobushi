#if UNITY_5_3_OR_NEWER
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public static class PrototypeGui
    {
        public static void FillRect(Rect rect, Color color)
        {
            var previous = GUI.color;
            GUI.color = color;
            GUI.DrawTexture(rect, Texture2D.whiteTexture);
            GUI.color = previous;
        }

        public static void StrokeRect(Rect rect, Color color, int thickness)
        {
            FillRect(new Rect(rect.x, rect.y, rect.width, thickness), color);
            FillRect(new Rect(rect.x, rect.yMax - thickness, rect.width, thickness), color);
            FillRect(new Rect(rect.x, rect.y, thickness, rect.height), color);
            FillRect(new Rect(rect.xMax - thickness, rect.y, thickness, rect.height), color);
        }

        public static void DrawMeter(Rect rect, int value, int max, Color color, string label, GUIStyle style)
        {
            FillRect(rect, new Color(0.18f, 0.18f, 0.18f));
            var ratio = Mathf.Clamp01(max <= 0 ? 0f : value / (float)max);
            FillRect(new Rect(rect.x + 3, rect.y + 3, (rect.width - 6) * ratio, rect.height - 6), color);
            StrokeRect(rect, new Color(0.05f, 0.05f, 0.05f), 2);
            GUI.Label(rect, label + " " + value + "/" + max, style);
        }
    }
}
#endif
