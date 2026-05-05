#if UNITY_5_3_OR_NEWER
using System;
using System.Collections.Generic;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public static class PrototypeRhythmLane
    {
        private const float LookAheadMs = 2600f;
        private const float PastMs = 380f;

        public static void Draw(
            Rect mainRect,
            List<NoteData> activeChart,
            bool hasActiveSession,
            int activeCurrentNoteIndex,
            int battleMs,
            int countInRemainingMs,
            Func<int, bool> isActiveHoldForNoteIndex,
            GUIStyle strongStyle,
            GUIStyle noteStyle,
            GUIStyle titleStyle)
        {
            var lane = new Rect(mainRect.x + 24, mainRect.y + 290, mainRect.width - 48, 132);
            PrototypeGui.FillRect(lane, new Color(0.98f, 0.98f, 0.96f));
            PrototypeGui.StrokeRect(lane, new Color(0.12f, 0.11f, 0.1f), 2);

            var hitX = lane.x + 150;
            PrototypeGui.FillRect(new Rect(hitX, lane.y + 10, 5, lane.height - 20), new Color(0.95f, 0.72f, 0.1f));
            GUI.Label(new Rect(lane.x + 18, lane.y + 18, 110, 24), "HIT LINE", strongStyle);

            if (activeChart != null && hasActiveSession)
            {
                for (var i = 0; i < activeChart.Count; i += 1)
                {
                    if (i < activeCurrentNoteIndex) continue;

                    var note = activeChart[i];
                    var delta = note.TimeMs - battleMs;
                    var keepActiveHoldVisible = isActiveHoldForNoteIndex != null && isActiveHoldForNoteIndex(i);
                    if (!ShouldDrawNote(note, delta, keepActiveHoldVisible, battleMs)) continue;

                    var x = hitX + (delta / LookAheadMs) * (lane.width - 210);
                    DrawNoteMarker(note, x, lane, hitX, keepActiveHoldVisible, battleMs, noteStyle);
                }
            }

            if (countInRemainingMs > 0)
            {
                GUI.Label(new Rect(lane.x + lane.width * 0.44f, lane.y + 42, 220, 46), "COUNT " + Mathf.CeilToInt(countInRemainingMs / 1000f), titleStyle);
            }
        }

        private static bool ShouldDrawNote(NoteData note, int delta, bool keepActiveHoldVisible, int battleMs)
        {
            if (keepActiveHoldVisible)
            {
                var endDelta = note.TimeMs + note.DurationMs - battleMs;
                return endDelta >= -PastMs && delta <= LookAheadMs;
            }

            return delta >= -PastMs && delta <= LookAheadMs;
        }

        private static void DrawNoteMarker(NoteData note, float x, Rect lane, float hitX, bool keepActiveHoldVisible, int battleMs, GUIStyle noteStyle)
        {
            var y = lane.y + 58;
            var color = new Color(0.09f, 0.42f, 0.88f);
            var label = "TAP";
            var width = 54f;
            var endX = x;

            if (note.Type == "hold")
            {
                color = new Color(0.55f, 0.28f, 0.86f);
                label = "HOLD";
                endX = hitX + ((note.TimeMs + note.DurationMs - battleMs) / LookAheadMs) * (lane.width - 210);
                if (keepActiveHoldVisible)
                {
                    var laneLeft = lane.x + 8;
                    var laneRight = lane.x + lane.width - 10;
                    x = Mathf.Clamp(x, laneLeft, laneRight);
                    width = Mathf.Max(12f, Mathf.Clamp(endX, laneLeft, laneRight) - x);
                }
                else
                {
                    width = Mathf.Max(70f, endX - x);
                }
            }
            else if (note.Type == "mash")
            {
                color = new Color(0.87f, 0.21f, 0.18f);
                label = "MASH";
                width = Mathf.Max(76f, note.DurationMs * 0.1f);
            }

            var rect = new Rect(x, y, width, 34);
            PrototypeGui.FillRect(rect, color);
            PrototypeGui.StrokeRect(rect, new Color(0.05f, 0.05f, 0.05f), 2);
            GUI.Label(rect, label, noteStyle);

            if (note.Type == "hold")
            {
                var releaseX = Mathf.Clamp(endX, lane.x + 8, lane.x + lane.width - 10);
                PrototypeGui.FillRect(new Rect(releaseX - 3, y - 10, 6, 54), new Color(1f, 0.92f, 0.24f));
                PrototypeGui.StrokeRect(new Rect(releaseX - 8, y - 14, 16, 62), new Color(0.05f, 0.05f, 0.05f), 2);
                GUI.Label(new Rect(releaseX - 44, y - 34, 88, 22), "RELEASE", noteStyle);
                GUI.Label(new Rect(releaseX - 28, y + 38, 56, 22), "END", noteStyle);
            }
        }
    }
}
#endif
