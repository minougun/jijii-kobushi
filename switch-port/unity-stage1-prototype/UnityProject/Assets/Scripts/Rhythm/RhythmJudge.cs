using System;
using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public enum JudgeRank
    {
        Miss = 1,
        Bad = 2,
        Good = 3,
        Perfect = 4
    }

    public sealed class JudgeResult
    {
        public JudgeRank Rank { get; set; }
        public int OffsetMs { get; set; }
        public int Count { get; set; }
        public int TargetCount { get; set; }
        public JudgeResult Start { get; set; }
        public JudgeResult End { get; set; }
    }

    public static class RhythmJudge
    {
        public static JudgeRank JudgeOffset(int offsetMs, JudgeWindows windows, int windowBonusMs = 0)
        {
            var abs = Math.Abs(offsetMs);
            var bonus = Math.Max(0, windowBonusMs);

            if (abs <= windows.Perfect + bonus) return JudgeRank.Perfect;
            if (abs <= windows.Good + bonus) return JudgeRank.Good;
            if (abs <= windows.Bad + bonus) return JudgeRank.Bad;
            return JudgeRank.Miss;
        }

        public static JudgeRank Lower(JudgeRank left, JudgeRank right)
        {
            return (int)left <= (int)right ? left : right;
        }

        public static JudgeResult JudgeTap(NoteData note, int inputAtMs, RhythmData rhythm, int inputOffsetMs = 0, int windowBonusMs = 0)
        {
            var adjustedAt = inputAtMs + inputOffsetMs;
            var offsetMs = (int)Math.Round(adjustedAt - (double)note.TimeMs, MidpointRounding.AwayFromZero);

            return new JudgeResult
            {
                Rank = JudgeOffset(offsetMs, rhythm.WindowsMs, windowBonusMs),
                OffsetMs = offsetMs
            };
        }

        public static JudgeResult JudgeHold(NoteData note, int downAtMs, int upAtMs, RhythmData rhythm, int inputOffsetMs = 0, int windowBonusMs = 0)
        {
            var start = JudgeTap(note, downAtMs, rhythm, inputOffsetMs, windowBonusMs);
            var endTarget = note.TimeMs + note.DurationMs;
            var endOffset = (int)Math.Round(upAtMs + inputOffsetMs - (double)endTarget, MidpointRounding.AwayFromZero);
            var end = new JudgeResult
            {
                Rank = JudgeOffset(endOffset, rhythm.WindowsMs, windowBonusMs),
                OffsetMs = endOffset
            };

            return new JudgeResult
            {
                Rank = Lower(start.Rank, end.Rank),
                OffsetMs = Math.Abs(start.OffsetMs) >= Math.Abs(endOffset) ? start.OffsetMs : endOffset,
                Start = start,
                End = end
            };
        }

        public static JudgeResult JudgeMash(NoteData note, IReadOnlyList<int> tapTimesMs, RhythmData rhythm)
        {
            var start = note.TimeMs - rhythm.MashInputGraceMs;
            var end = note.TimeMs + note.DurationMs + rhythm.MashInputGraceMs;
            var count = 0;
            var lastCounted = int.MinValue / 2;

            for (var i = 0; i < tapTimesMs.Count; i += 1)
            {
                var time = tapTimesMs[i];
                if (time < start || time > end) continue;
                if (time - lastCounted < rhythm.MashDedupMinGapMs) continue;

                count += 1;
                lastCounted = time;
            }

            var rank = JudgeRank.Miss;
            if (count >= note.TargetCount) rank = JudgeRank.Perfect;
            else if (count >= note.TargetCount - 1) rank = JudgeRank.Good;
            else if (count >= note.TargetCount - 3) rank = JudgeRank.Bad;

            if (count > note.TargetCount + 2)
            {
                if (rank == JudgeRank.Perfect) rank = JudgeRank.Good;
                else if (rank == JudgeRank.Good) rank = JudgeRank.Bad;
                else if (rank == JudgeRank.Bad) rank = JudgeRank.Miss;
            }

            return new JudgeResult
            {
                Rank = rank,
                OffsetMs = 0,
                Count = count,
                TargetCount = note.TargetCount
            };
        }

        public static string ToJsonRank(JudgeRank rank)
        {
            switch (rank)
            {
                case JudgeRank.Perfect: return "perfect";
                case JudgeRank.Good: return "good";
                case JudgeRank.Bad: return "bad";
                default: return "miss";
            }
        }
    }
}
