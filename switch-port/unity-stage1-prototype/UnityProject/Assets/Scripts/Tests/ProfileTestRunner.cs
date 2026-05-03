using System;
using System.Collections.Generic;
using System.IO;

namespace JijiiKobushi.Stage1Prototype
{
    public static class ProfileTestRunner
    {
        public static List<BattleRunResult> RunAll(string stageJsonPath, string expectedResultsPath)
        {
            var stage = StageJsonLoader.LoadStage(stageJsonPath);
            var expected = StageJsonLoader.LoadExpectedResults(expectedResultsPath);
            ValidateStageData(stage, expected);
            ValidateBoundaryCases(stage);

            var results = new List<BattleRunResult>();
            foreach (var profile in BattleSimulator.Profiles)
            {
                foreach (var difficulty in BattleSimulator.Difficulties)
                {
                    var result = BattleSimulator.Simulate(stage, difficulty, profile);
                    results.Add(result);
                    CompareExpected(expected, profile, difficulty, result);
                }
            }

            return results;
        }

        public static string RunAllAndFormatReport(string stageJsonPath, string expectedResultsPath)
        {
            var results = RunAll(stageJsonPath, expectedResultsPath);
            var lines = new List<string>();
            lines.Add("Stage 1 Unity local prototype parity: pass");
            foreach (var result in results)
            {
                lines.Add(
                    result.Profile + "/" + result.Difficulty +
                    " clear=" + result.Clear +
                    " score=" + result.Score +
                    " rank=" + result.Rank +
                    " maxCombo=" + result.MaxCombo +
                    " stats=" + FormatStats(result.Stats) +
                    " hp=" + result.RemainingHp);
            }
            return string.Join(Environment.NewLine, lines);
        }

        private static void ValidateStageData(StageExport stage, ExpectedResults expected)
        {
            AssertEqual("shotengai", stage.Stage.Id, "stage.id");
            AssertEqual("うさぎ公園", stage.Stage.LocationName, "stage.locationName");
            AssertEqual(3000, expected.Timing.CountInMs, "expected count-in");

            var countInMs = (int)Math.Round(stage.Audio.Timing.CountInLeadSeconds * 1000.0, MidpointRounding.AwayFromZero);
            AssertEqual(expected.Timing.CountInMs, countInMs, "count-in");
            AssertEqual(expected.Timing.WindowsMs.Perfect, stage.Rhythm.WindowsMs.Perfect, "perfect window");
            AssertEqual(expected.Timing.WindowsMs.Good, stage.Rhythm.WindowsMs.Good, "good window");
            AssertEqual(expected.Timing.WindowsMs.Bad, stage.Rhythm.WindowsMs.Bad, "bad window");
            AssertEqual(expected.Timing.InputGraceMs, stage.Rhythm.InputGraceMs, "input grace");
            AssertEqual(expected.Timing.MashInputGraceMs, stage.Rhythm.MashInputGraceMs, "mash grace");
            AssertEqual(expected.Timing.MashDedupMinGapMs, stage.Rhythm.MashDedupMinGapMs, "mash dedup");

            foreach (var difficulty in BattleSimulator.Difficulties)
            {
                AssertEqual(stage.Difficulty[difficulty].ChartSummary.NoteCount, stage.Charts[difficulty].Count, difficulty + " note count");
            }

            var first = stage.Charts["easy"][0];
            AssertEqual(expected.Timing.FirstNoteBattleMs, first.TimeMs, "first note battle ms");
            AssertEqual(expected.Timing.FirstNoteVirtualMs, countInMs + first.TimeMs, "first note virtual ms");
            AssertEqual("./assets/audio/koiwazurai.mp3", stage.Audio.Bgm.AssetSrc, "bgm asset path");
            AssertEqual(0.74, stage.Audio.Bgm.Gain, "bgm gain");
            AssertEqual(0.78, stage.Audio.Bgm.TrackVolume, "bgm track volume");
            AssertEqual(220, stage.Audio.Bgm.Lead, "bgm lead");
        }

        private static void ValidateBoundaryCases(StageExport stage)
        {
            var note = new NoteData { Id = "boundary", Type = "tap", TimeMs = 1000 };
            AssertEqual("perfect", RhythmJudge.ToJsonRank(RhythmJudge.JudgeTap(note, 1060, stage.Rhythm).Rank), "tap +60");
            AssertEqual("good", RhythmJudge.ToJsonRank(RhythmJudge.JudgeTap(note, 1061, stage.Rhythm).Rank), "tap +61");
            AssertEqual("good", RhythmJudge.ToJsonRank(RhythmJudge.JudgeTap(note, 1120, stage.Rhythm).Rank), "tap +120");
            AssertEqual("bad", RhythmJudge.ToJsonRank(RhythmJudge.JudgeTap(note, 1121, stage.Rhythm).Rank), "tap +121");
            AssertEqual("bad", RhythmJudge.ToJsonRank(RhythmJudge.JudgeTap(note, 1190, stage.Rhythm).Rank), "tap +190");
            AssertEqual("miss", RhythmJudge.ToJsonRank(RhythmJudge.JudgeTap(note, 1191, stage.Rhythm).Rank), "tap +191");
            AssertEqual("bad", RhythmJudge.ToJsonRank(RhythmJudge.JudgeTap(note, 810, stage.Rhythm).Rank), "tap -190");
            AssertEqual("miss", RhythmJudge.ToJsonRank(RhythmJudge.JudgeTap(note, 809, stage.Rhythm).Rank), "tap -191");

            var mash = new NoteData { Id = "mash", Type = "mash", TimeMs = 1000, DurationMs = 400, TargetCount = 3 };
            var graceEdge = RhythmJudge.JudgeMash(mash, new[] { 920, 1000, 1400 }, stage.Rhythm);
            AssertEqual("perfect", RhythmJudge.ToJsonRank(graceEdge.Rank), "mash grace includes -80");

            var dedup = RhythmJudge.JudgeMash(mash, new[] { 1000, 1069, 1140, 1210 }, stage.Rhythm);
            AssertEqual(3, dedup.Count, "mash dedup ignores 69ms repeat");
        }

        private static void CompareExpected(ExpectedResults expected, string profile, string difficulty, BattleRunResult actual)
        {
            var expectedProfile = expected.Profiles[profile][difficulty];
            AssertEqual(expectedProfile.Clear, actual.Clear, profile + "/" + difficulty + " clear");
            AssertEqual(expectedProfile.Score, actual.Score, profile + "/" + difficulty + " score");
            AssertEqual(expectedProfile.Rank, actual.Rank, profile + "/" + difficulty + " rank");
            AssertEqual(expectedProfile.MaxCombo, actual.MaxCombo, profile + "/" + difficulty + " maxCombo");
            AssertStats(expectedProfile.Stats, actual.Stats, profile + "/" + difficulty + " stats");
            AssertTypeCounts(expectedProfile.MissByType, actual.MissByType, profile + "/" + difficulty + " missByType");
            AssertEqual(expectedProfile.Hp.Remaining, actual.RemainingHp, profile + "/" + difficulty + " hp remaining");
            AssertEqual(expectedProfile.Hp.Max, actual.MaxHp, profile + "/" + difficulty + " hp max");
        }

        private static void AssertStats(JudgeStats expected, JudgeStats actual, string label)
        {
            AssertEqual(expected.Perfect, actual.Perfect, label + ".perfect");
            AssertEqual(expected.Good, actual.Good, label + ".good");
            AssertEqual(expected.Bad, actual.Bad, label + ".bad");
            AssertEqual(expected.Miss, actual.Miss, label + ".miss");
        }

        private static void AssertTypeCounts(TypeCounts expected, TypeCounts actual, string label)
        {
            AssertEqual(expected.Tap, actual.Tap, label + ".tap");
            AssertEqual(expected.Hold, actual.Hold, label + ".hold");
            AssertEqual(expected.Mash, actual.Mash, label + ".mash");
        }

        private static string FormatStats(JudgeStats stats)
        {
            return "{perfect:" + stats.Perfect + ",good:" + stats.Good + ",bad:" + stats.Bad + ",miss:" + stats.Miss + "}";
        }

        private static void AssertEqual<T>(T expected, T actual, string label)
        {
            if (!EqualityComparer<T>.Default.Equals(expected, actual))
            {
                throw new InvalidOperationException(label + " expected " + expected + " but got " + actual);
            }
        }

        public static string ResolveDefaultPath(string relativeFromUnityProject)
        {
            return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), relativeFromUnityProject));
        }

        public static string ResolveStagePackPath(string fileName)
        {
            var current = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (current != null)
            {
                var switchPortCandidate = Path.Combine(current.FullName, "switch-port", "stage1", fileName);
                if (File.Exists(switchPortCandidate)) return switchPortCandidate;

                var siblingCandidate = Path.Combine(current.FullName, "stage1", fileName);
                if (File.Exists(siblingCandidate)) return siblingCandidate;

                current = current.Parent;
            }

            throw new FileNotFoundException("Could not find Stage 1 port pack file: " + fileName);
        }
    }
}
