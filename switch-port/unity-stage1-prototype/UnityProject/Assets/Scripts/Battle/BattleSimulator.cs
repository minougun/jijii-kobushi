using System;
using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class BattleRunResult
    {
        public BattleRunResult()
        {
            Difficulty = "";
            Loop = "1";
            Profile = "";
            TypeCounts = new TypeCounts();
            Stats = new JudgeStats();
            MissByType = new TypeCounts();
            Rank = "";
            Samples = new List<ResolvedNote>();
        }

        public string Difficulty { get; set; }
        public string Loop { get; set; }
        public string Profile { get; set; }
        public int CountInMs { get; set; }
        public int FinishTimelineMs { get; set; }
        public int NoteCount { get; set; }
        public TypeCounts TypeCounts { get; set; }
        public JudgeStats Stats { get; set; }
        public TypeCounts MissByType { get; set; }
        public int MaxCombo { get; set; }
        public int RemainingHp { get; set; }
        public int MaxHp { get; set; }
        public double HpDamageTaken { get; set; }
        public bool Clear { get; set; }
        public int Score { get; set; }
        public string Rank { get; set; }
        public List<ResolvedNote> Samples { get; set; }
    }

    public sealed class ResolvedNote
    {
        public ResolvedNote()
        {
            Rank = "";
            NoteId = "";
            Type = "";
            Detail = "";
        }

        public string Rank { get; set; }
        public string NoteId { get; set; }
        public string Type { get; set; }
        public int NoteTimeMs { get; set; }
        public int TimelineMs { get; set; }
        public string Detail { get; set; }
    }

    public static class BattleSimulator
    {
        public static readonly string[] Difficulties = { "easy", "normal", "hard" };
        public static readonly string[] Profiles = { "perfect", "steady", "early", "late", "mash-weak", "mash-heavy" };

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

        public static BattleRunResult Simulate(StageExport stage, string difficulty, string profileName)
        {
            return Simulate(stage, "1", difficulty, profileName);
        }

        public static BattleRunResult Simulate(StageExport stage, string loopKey, string difficulty, string profileName)
        {
            var loopData = ResolveLoop(stage, loopKey);
            var chart = loopData.Charts[difficulty];
            var difficultyData = loopData.Difficulty[difficulty];
            var profile = ProfilePatterns[profileName];
            var countInMs = (int)Math.Round(stage.Audio.Timing.CountInLeadSeconds * 1000.0, MidpointRounding.AwayFromZero);

            var resolved = new List<ResolvedNote>(chart.Count);
            var samples = new List<ResolvedNote>();
            var combo = 0;
            var maxCombo = 0;
            var hp = (double)stage.Player.MaxHp;
            var hpDamageTaken = 0.0;

            for (var index = 0; index < chart.Count; index += 1)
            {
                var note = chart[index];
                var simulated = SimulateNote(note, index, profile, stage.Rhythm);
                var rankName = RhythmJudge.ToJsonRank(simulated.Result.Rank);

                if (simulated.Result.Rank == JudgeRank.Miss && note.Type != "mash")
                {
                    var damage = stage.Enemy.AttackPower * difficultyData.Loop.EnemyAttackMultiplier;
                    hp = Math.Max(0, hp - damage);
                    hpDamageTaken += damage;
                }

                if (simulated.Result.Rank == JudgeRank.Miss)
                {
                    combo = 0;
                }
                else
                {
                    combo += 1;
                    maxCombo = Math.Max(maxCombo, combo);
                }

                var entry = new ResolvedNote
                {
                    Rank = rankName,
                    NoteId = note.Id,
                    Type = note.Type,
                    NoteTimeMs = note.TimeMs,
                    TimelineMs = countInMs + note.TimeMs,
                    Detail = BuildDetail(note, simulated)
                };
                resolved.Add(entry);

                if (index < 3 || index >= chart.Count - 3)
                {
                    samples.Add(entry);
                }
            }

            var stats = CountStats(resolved);
            var missByType = CountMissByType(resolved);
            var remainingHp = (int)Math.Round(hp, MidpointRounding.AwayFromZero);
            var score = CalculateStageScore(resolved, chart.Count, maxCombo, remainingHp, stage.Player.MaxHp);
            var last = chart[chart.Count - 1];

            return new BattleRunResult
            {
                Difficulty = difficulty,
                Loop = loopKey,
                Profile = profileName,
                CountInMs = countInMs,
                FinishTimelineMs = countInMs + last.TimeMs + last.DurationMs + stage.Audio.Timing.BattleDurationPaddingMs,
                NoteCount = chart.Count,
                TypeCounts = difficultyData.ChartSummary.TypeCounts,
                Stats = stats,
                MissByType = missByType,
                MaxCombo = maxCombo,
                RemainingHp = remainingHp,
                MaxHp = stage.Player.MaxHp,
                HpDamageTaken = hpDamageTaken,
                Clear = hp > 0,
                Score = score,
                Rank = RankScore(score),
                Samples = samples
            };
        }

        private static StageLoopData ResolveLoop(StageExport stage, string loopKey)
        {
            if (stage.Loops != null && stage.Loops.ContainsKey(loopKey))
            {
                return stage.Loops[loopKey];
            }

            return new StageLoopData
            {
                Label = "1周目",
                Difficulty = stage.Difficulty,
                Charts = stage.Charts
            };
        }

        private static SimulatedNote SimulateNote(NoteData note, int noteIndex, ProfilePattern profile, RhythmData rhythm)
        {
            if (note.Type == "tap")
            {
                var inputAtMs = note.TimeMs + Pick(profile.TapOffsets, noteIndex);
                return new SimulatedNote
                {
                    Result = RhythmJudge.JudgeTap(note, inputAtMs, rhythm),
                    InputOffsetMs = inputAtMs - note.TimeMs
                };
            }

            if (note.Type == "hold")
            {
                var downAtMs = note.TimeMs + Pick(profile.HoldStartOffsets, noteIndex);
                var upAtMs = note.TimeMs + note.DurationMs + Pick(profile.HoldEndOffsets, noteIndex);
                return new SimulatedNote
                {
                    Result = RhythmJudge.JudgeHold(note, downAtMs, upAtMs, rhythm),
                    StartOffsetMs = downAtMs - note.TimeMs,
                    EndOffsetMs = upAtMs - (note.TimeMs + note.DurationMs)
                };
            }

            if (note.Type == "mash")
            {
                var mode = Pick(profile.MashModes, noteIndex);
                var tapTimesMs = MakeMashTaps(note, mode, rhythm);
                return new SimulatedNote
                {
                    Result = RhythmJudge.JudgeMash(note, tapTimesMs, rhythm),
                    MashMode = mode,
                    TapTimesMs = tapTimesMs
                };
            }

            throw new InvalidOperationException("Unsupported note type: " + note.Type);
        }

        private static List<int> MakeMashTaps(NoteData note, string mode, RhythmData rhythm)
        {
            if (mode == "miss")
            {
                return new List<int>();
            }

            var target = note.TargetCount;
            var count = target;
            if (mode == "good") count = Math.Max(0, target - 1);
            else if (mode == "heavy") count = target + 3;
            else if (mode != "perfect") count = Math.Max(0, target - 3);

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

        private static string BuildDetail(NoteData note, SimulatedNote simulated)
        {
            if (note.Type == "mash")
            {
                return simulated.Result.Count + "/" + simulated.Result.TargetCount + " mode=" + simulated.MashMode;
            }

            return simulated.Result.OffsetMs + "ms";
        }

        private static JudgeStats CountStats(List<ResolvedNote> resolved)
        {
            var stats = new JudgeStats();
            foreach (var note in resolved)
            {
                if (note.Rank == "perfect") stats.Perfect += 1;
                else if (note.Rank == "good") stats.Good += 1;
                else if (note.Rank == "bad") stats.Bad += 1;
                else stats.Miss += 1;
            }
            return stats;
        }

        private static TypeCounts CountMissByType(List<ResolvedNote> resolved)
        {
            var counts = new TypeCounts();
            foreach (var note in resolved)
            {
                if (note.Rank != "miss") continue;
                if (note.Type == "tap") counts.Tap += 1;
                else if (note.Type == "hold") counts.Hold += 1;
                else if (note.Type == "mash") counts.Mash += 1;
            }
            return counts;
        }

        public static int CalculateStageScore(List<ResolvedNote> notes, int totalNotes, int maxCombo, int hp, int maxHp)
        {
            var total = totalNotes > 0 ? totalNotes : Math.Max(1, notes.Count);
            var judgePoints = 0;
            foreach (var note in notes)
            {
                if (note.Rank == "perfect") judgePoints += 100;
                else if (note.Rank == "good") judgePoints += 70;
                else if (note.Rank == "bad") judgePoints += 30;
            }

            var judgePart = judgePoints / (total * 100.0) * 7000.0;
            var comboPart = maxCombo / (double)total * 1500.0;
            var hpPart = Math.Max(0, hp) / (double)maxHp * 1300.0;
            var score = judgePart + comboPart + hpPart;
            return (int)Math.Floor(Math.Max(0, Math.Min(10000, score)) + 0.5);
        }

        public static string RankScore(int score)
        {
            if (score >= 8400) return "S";
            if (score >= 7000) return "A";
            if (score >= 5400) return "B";
            return "C";
        }

        private static int Pick(int[] values, int index)
        {
            return values[index % values.Length];
        }

        private static string Pick(string[] values, int index)
        {
            return values[index % values.Length];
        }

        private sealed class ProfilePattern
        {
            public ProfilePattern(int[] tapOffsets, int[] holdStartOffsets, int[] holdEndOffsets, string[] mashModes)
            {
                TapOffsets = tapOffsets;
                HoldStartOffsets = holdStartOffsets;
                HoldEndOffsets = holdEndOffsets;
                MashModes = mashModes;
            }

            public int[] TapOffsets { get; private set; }
            public int[] HoldStartOffsets { get; private set; }
            public int[] HoldEndOffsets { get; private set; }
            public string[] MashModes { get; private set; }
        }

        private sealed class SimulatedNote
        {
            public SimulatedNote()
            {
                Result = new JudgeResult();
                MashMode = "";
                TapTimesMs = new List<int>();
            }

            public JudgeResult Result { get; set; }
            public int InputOffsetMs { get; set; }
            public int StartOffsetMs { get; set; }
            public int EndOffsetMs { get; set; }
            public string MashMode { get; set; }
            public List<int> TapTimesMs { get; set; }
        }
    }
}
