using System;
using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public static class EndingBonusSimulator
    {
        private static readonly Dictionary<string, ProfilePattern> ProfilePatterns = BuildProfilePatterns();

        private static Dictionary<string, ProfilePattern> BuildProfilePatterns()
        {
            var patterns = new Dictionary<string, ProfilePattern>();
            patterns["perfect"] = new ProfilePattern(new[] { 0 }, new[] { 0 }, new[] { 0 }, new[] { "perfect" });
            patterns["steady"] = new ProfilePattern(
                new[] { 0, 32, -44, 58, -76, 96, -112 },
                new[] { 0, 38, -56, 84, -108 },
                new[] { 0, 46, -64, 102, -118 },
                new[] { "perfect", "good", "perfect", "good" });
            patterns["early"] = new ProfilePattern(new[] { -190, -191, -220 }, new[] { -190, -191, -220 }, new[] { -190, -191, -220 }, new[] { "perfect" });
            patterns["late"] = new ProfilePattern(new[] { 190, 191, 220 }, new[] { 190, 191, 220 }, new[] { 190, 191, 220 }, new[] { "perfect" });
            patterns["mash-weak"] = new ProfilePattern(new[] { 0 }, new[] { 0 }, new[] { 0 }, new[] { "miss" });
            patterns["mash-heavy"] = new ProfilePattern(new[] { 0 }, new[] { 0 }, new[] { 0 }, new[] { "heavy" });
            return patterns;
        }

        public static EndingBonusRunResult Simulate(EndingBonusExport exportData, string loop, string difficulty, string profileName)
        {
            var loopData = exportData.Loops[loop];
            var chart = loopData.Charts[difficulty];
            var profile = ProfilePatterns[profileName];
            var resolved = new List<ResolvedNote>(chart.Count);
            var samples = new List<ResolvedNote>();
            var combo = 0;
            var bestCombo = 0;
            var score = 0;
            var hits = 0;
            var misses = 0;

            for (var index = 0; index < chart.Count; index += 1)
            {
                var note = chart[index];
                var result = SimulateNote(note, index, profile, exportData.Rhythm);
                var rankName = RhythmJudge.ToJsonRank(result.Rank);

                if (result.Rank == JudgeRank.Miss)
                {
                    combo = 0;
                    misses += 1;
                }
                else
                {
                    combo += 1;
                    hits += 1;
                    score += EndingBonusScoreValue(result.Rank, combo);
                }

                bestCombo = Math.Max(bestCombo, combo);

                var entry = new ResolvedNote
                {
                    Rank = rankName,
                    NoteId = note.Id,
                    Type = note.Type,
                    NoteTimeMs = note.TimeMs,
                    TimelineMs = note.TimeMs,
                    Detail = note.Type == "mash" ? result.Count + "/" + result.TargetCount : result.OffsetMs + "ms"
                };
                resolved.Add(entry);
                if (index < 3 || index >= chart.Count - 3)
                {
                    samples.Add(entry);
                }
            }

            return new EndingBonusRunResult
            {
                NoteCount = chart.Count,
                TypeCounts = CountType(chart),
                Stats = CountStats(resolved),
                MissByType = CountMissByType(resolved),
                Hits = hits,
                Misses = misses,
                BestCombo = bestCombo,
                Score = score,
                Samples = samples
            };
        }

        private static JudgeResult SimulateNote(NoteData note, int noteIndex, ProfilePattern profile, RhythmData rhythm)
        {
            if (note.Type == "tap")
            {
                return RhythmJudge.JudgeTap(note, note.TimeMs + Pick(profile.TapOffsets, noteIndex), rhythm);
            }

            if (note.Type == "hold")
            {
                var downAtMs = note.TimeMs + Pick(profile.HoldStartOffsets, noteIndex);
                var upAtMs = note.TimeMs + note.DurationMs + Pick(profile.HoldEndOffsets, noteIndex);
                return RhythmJudge.JudgeHold(note, downAtMs, upAtMs, rhythm);
            }

            if (note.Type == "mash")
            {
                var mode = Pick(profile.MashModes, noteIndex);
                return RhythmJudge.JudgeMash(note, MakeMashTaps(note, mode, rhythm), rhythm);
            }

            throw new InvalidOperationException("Unsupported ending note type: " + note.Type);
        }

        private static List<int> MakeMashTaps(NoteData note, string mode, RhythmData rhythm)
        {
            if (mode == "miss")
            {
                return new List<int>();
            }

            var count = note.TargetCount;
            if (mode == "good") count = Math.Max(0, note.TargetCount - 1);
            else if (mode == "heavy") count = note.TargetCount + 3;
            else if (mode != "perfect") count = Math.Max(0, note.TargetCount - 3);

            var start = note.TimeMs - rhythm.MashInputGraceMs + 10;
            var availableMs = note.DurationMs + rhythm.MashInputGraceMs * 2 - 20;
            var safeGap = Math.Max(rhythm.MashDedupMinGapMs, availableMs / Math.Max(1, count));
            var taps = new List<int>(count);
            for (var i = 0; i < count; i += 1)
            {
                taps.Add(start + i * safeGap);
            }
            return taps;
        }

        private static int EndingBonusScoreValue(JudgeRank rank, int combo)
        {
            if (rank == JudgeRank.Perfect) return 140 + Math.Min(180, combo * 6);
            if (rank == JudgeRank.Good) return 90 + Math.Min(120, combo * 4);
            if (rank == JudgeRank.Bad) return 35 + Math.Min(60, combo * 2);
            return 0;
        }

        private static T Pick<T>(IReadOnlyList<T> pattern, int index)
        {
            return pattern[index % pattern.Count];
        }

        private static TypeCounts CountType(List<NoteData> chart)
        {
            var counts = new TypeCounts();
            foreach (var note in chart)
            {
                if (note.Type == "tap") counts.Tap += 1;
                else if (note.Type == "hold") counts.Hold += 1;
                else if (note.Type == "mash") counts.Mash += 1;
            }
            return counts;
        }

        private static JudgeStats CountStats(List<ResolvedNote> results)
        {
            var stats = new JudgeStats();
            foreach (var result in results)
            {
                if (result.Rank == "perfect") stats.Perfect += 1;
                else if (result.Rank == "good") stats.Good += 1;
                else if (result.Rank == "bad") stats.Bad += 1;
                else stats.Miss += 1;
            }
            return stats;
        }

        private static TypeCounts CountMissByType(List<ResolvedNote> results)
        {
            var counts = new TypeCounts();
            foreach (var result in results)
            {
                if (result.Rank != "miss") continue;
                if (result.Type == "tap") counts.Tap += 1;
                else if (result.Type == "hold") counts.Hold += 1;
                else if (result.Type == "mash") counts.Mash += 1;
            }
            return counts;
        }

        private sealed class ProfilePattern
        {
            public ProfilePattern(IReadOnlyList<int> tapOffsets, IReadOnlyList<int> holdStartOffsets, IReadOnlyList<int> holdEndOffsets, IReadOnlyList<string> mashModes)
            {
                TapOffsets = tapOffsets;
                HoldStartOffsets = holdStartOffsets;
                HoldEndOffsets = holdEndOffsets;
                MashModes = mashModes;
            }

            public IReadOnlyList<int> TapOffsets { get; private set; }
            public IReadOnlyList<int> HoldStartOffsets { get; private set; }
            public IReadOnlyList<int> HoldEndOffsets { get; private set; }
            public IReadOnlyList<string> MashModes { get; private set; }
        }
    }
}
