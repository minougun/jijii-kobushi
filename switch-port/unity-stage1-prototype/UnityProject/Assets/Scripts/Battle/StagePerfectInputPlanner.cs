using System;
using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public static class StagePerfectInputPlanner
    {
        public const string TapAction = "tap";
        public const string HoldDownAction = "holdDown";
        public const string HoldUpAction = "holdUp";

        public static List<StagePerfectInputEvent> Build(StageExport stage, string loop, string difficulty)
        {
            var events = new List<StagePerfectInputEvent>();
            var chart = ResolveChart(stage, loop, difficulty);
            if (stage == null || chart == null) return events;

            for (var i = 0; i < chart.Count; i += 1)
            {
                var note = chart[i];
                if (note.Type == "tap")
                {
                    events.Add(new StagePerfectInputEvent(note.TimeMs, TapAction));
                }
                else if (note.Type == "hold")
                {
                    events.Add(new StagePerfectInputEvent(note.TimeMs, HoldDownAction));
                    events.Add(new StagePerfectInputEvent(note.TimeMs + note.DurationMs, HoldUpAction));
                }
                else if (note.Type == "mash")
                {
                    AddPerfectMashEvents(stage, note, events);
                }
            }

            events.Sort((left, right) => left.TimeMs == right.TimeMs ? string.CompareOrdinal(left.Action, right.Action) : left.TimeMs.CompareTo(right.TimeMs));
            return events;
        }

        public static int CompletionBattleClockMs(StageExport stage, string loop, string difficulty)
        {
            var chart = ResolveChart(stage, loop, difficulty);
            if (stage == null || chart == null || chart.Count == 0) return 0;

            var last = chart[chart.Count - 1];
            return last.TimeMs + last.DurationMs + stage.Rhythm.MashInputGraceMs + 1;
        }

        private static void AddPerfectMashEvents(StageExport stage, NoteData note, List<StagePerfectInputEvent> events)
        {
            var target = Math.Max(1, note.TargetCount);
            var gap = target <= 1
                ? 0
                : Math.Max(stage.Rhythm.MashDedupMinGapMs, (note.DurationMs - 20) / (target - 1));
            for (var i = 0; i < target; i += 1)
            {
                events.Add(new StagePerfectInputEvent(note.TimeMs + 10 + i * gap, TapAction));
            }
        }

        private static List<NoteData> ResolveChart(StageExport stage, string loop, string difficulty)
        {
            if (stage == null || string.IsNullOrEmpty(difficulty)) return null;
            if (!string.IsNullOrEmpty(loop) && stage.Loops != null && stage.Loops.ContainsKey(loop))
            {
                var loopData = stage.Loops[loop];
                if (loopData.Charts != null && loopData.Charts.ContainsKey(difficulty)) return loopData.Charts[difficulty];
                return null;
            }

            if (stage.Charts != null && stage.Charts.ContainsKey(difficulty)) return stage.Charts[difficulty];
            return null;
        }
    }

    public sealed class StagePerfectInputEvent
    {
        public StagePerfectInputEvent(int timeMs, string action)
        {
            TimeMs = timeMs;
            Action = action ?? "";
        }

        public int TimeMs { get; private set; }
        public string Action { get; private set; }
    }
}
