using System;
using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public static class EndingBonusPerfectInputPlanner
    {
        public const string TapAction = "tap";
        public const string HoldDownAction = "holdDown";
        public const string HoldUpAction = "holdUp";

        public static List<EndingBonusInputEvent> Build(EndingBonusExport ending, string loop, string difficulty)
        {
            var events = new List<EndingBonusInputEvent>();
            if (ending == null || string.IsNullOrEmpty(loop) || string.IsNullOrEmpty(difficulty)) return events;
            if (!ending.Loops.ContainsKey(loop) || !ending.Loops[loop].Charts.ContainsKey(difficulty)) return events;

            var chart = ending.Loops[loop].Charts[difficulty];
            var tapTimes = new List<int>();
            for (var i = 0; i < chart.Count; i += 1)
            {
                if (chart[i].Type == "tap") tapTimes.Add(chart[i].TimeMs);
            }

            for (var i = 0; i < chart.Count; i += 1)
            {
                var note = chart[i];
                if (note.Type == "tap")
                {
                    events.Add(new EndingBonusInputEvent(note.TimeMs, TapAction));
                }
                else if (note.Type == "hold")
                {
                    events.Add(new EndingBonusInputEvent(note.TimeMs, HoldDownAction));
                    events.Add(new EndingBonusInputEvent(note.TimeMs + note.DurationMs, HoldUpAction));
                }
                else if (note.Type == "mash")
                {
                    AddPerfectMashEvents(ending, note, tapTimes, events);
                }
            }

            events.Sort((left, right) => left.TimeMs == right.TimeMs ? string.CompareOrdinal(left.Action, right.Action) : left.TimeMs.CompareTo(right.TimeMs));
            return events;
        }

        private static void AddPerfectMashEvents(EndingBonusExport ending, NoteData note, List<int> tapTimes, List<EndingBonusInputEvent> events)
        {
            var target = Math.Max(1, note.TargetCount);
            var start = note.TimeMs - ending.Rhythm.MashInputGraceMs + 10;
            var end = note.TimeMs + note.DurationMs + ending.Rhythm.MashInputGraceMs - 10;
            var gap = Math.Max(ending.Rhythm.MashDedupMinGapMs, 1);
            var cursor = start;
            var added = 0;
            while (cursor <= end && added < target)
            {
                if (!IsNearTap(cursor, tapTimes, ending.Rhythm.InputGraceMs))
                {
                    events.Add(new EndingBonusInputEvent(cursor, TapAction));
                    added += 1;
                }
                cursor += gap;
            }
        }

        private static bool IsNearTap(int timeMs, List<int> tapTimes, int graceMs)
        {
            for (var i = 0; i < tapTimes.Count; i += 1)
            {
                if (Math.Abs(timeMs - tapTimes[i]) <= graceMs) return true;
            }
            return false;
        }
    }

    public sealed class EndingBonusInputEvent
    {
        public EndingBonusInputEvent(int timeMs, string action)
        {
            TimeMs = timeMs;
            Action = action ?? "";
        }

        public int TimeMs { get; private set; }
        public string Action { get; private set; }
    }
}
