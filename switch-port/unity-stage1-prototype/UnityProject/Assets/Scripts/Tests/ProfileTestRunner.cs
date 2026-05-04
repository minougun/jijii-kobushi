using System;
using System.Collections.Generic;
using System.IO;

namespace JijiiKobushi.Stage1Prototype
{
    public static class ProfileTestRunner
    {
        public static readonly string[] AllStagePackFiles =
        {
            "stage01-shotengai.stage.json",
            "stage02-warehouse.stage.json",
            "stage03-riverside.stage.json",
            "stage04-mountain.stage.json",
            "stage05-garage.stage.json",
            "stage06-redgate.stage.json",
            "stage07-finalhideout.stage.json"
        };

        private static readonly string[] ExpectedStageIds =
        {
            "shotengai",
            "warehouse",
            "riverside",
            "mountain",
            "garage",
            "redgate",
            "finalhideout"
        };

        private static readonly string[] ExpectedStageTitles =
        {
            "誘拐の朝",
            "港の倉庫",
            "伊藤道場",
            "峠道",
            "改造車庫",
            "赤門",
            "X結社本部"
        };

        private static readonly string[] ExpectedStageLocations =
        {
            "うさぎ公園",
            "港の倉庫",
            "伊藤道場",
            "峠道",
            "改造車庫",
            "赤門",
            "X結社本部"
        };

        public static List<BattleRunResult> RunAll(string stageJsonPath, string expectedResultsPath)
        {
            var stage = StageJsonLoader.LoadStage(stageJsonPath);
            var expected = StageJsonLoader.LoadExpectedResults(expectedResultsPath);
            ValidateStageData(stage, expected);
            ValidateBoundaryCases(stage);

            var results = new List<BattleRunResult>();
            CompareStageLoopParity(stage, expected, results);

            return results;
        }

        public static List<StageExport> RunAllStageSmoke()
        {
            var stages = new List<StageExport>();
            for (var index = 0; index < AllStagePackFiles.Length; index += 1)
            {
                var path = ResolveAllStagePackPath(AllStagePackFiles[index]);
                var stage = StageJsonLoader.LoadStage(path);
                ValidateAllStagePack(stage, index, path);
                stages.Add(stage);
            }

            return stages;
        }

        public static List<BattleRunResult> RunAllStageProfileParity()
        {
            var results = new List<BattleRunResult>();
            for (var index = 0; index < AllStagePackFiles.Length; index += 1)
            {
                var stagePath = ResolveAllStagePackPath(AllStagePackFiles[index]);
                var expectedPath = ResolveAllStagePackPath(AllStagePackFiles[index].Replace(".stage.json", ".expected-results.json"));
                var stage = StageJsonLoader.LoadStage(stagePath);
                var expected = StageJsonLoader.LoadExpectedResults(expectedPath);
                ValidateAllStagePack(stage, index, stagePath);
                ValidateExpectedTiming(stage, expected, "stage " + (index + 1));

                CompareStageLoopParity(stage, expected, results);
            }

            return results;
        }

        public static List<EndingBonusRunResult> RunEndingBonusProfileParity()
        {
            var ending = StageJsonLoader.LoadEndingBonus(ResolveEndingPackPath("ending-bonus.stage.json"));
            var expected = StageJsonLoader.LoadEndingBonusExpectedResults(ResolveEndingPackPath("ending-bonus.expected-results.json"));
            ValidateEndingBonusPack(ending, expected);

            var results = new List<EndingBonusRunResult>();
            foreach (var loop in ending.Loops.Keys)
            {
                foreach (var profile in BattleSimulator.Profiles)
                {
                    foreach (var difficulty in BattleSimulator.Difficulties)
                    {
                        var result = EndingBonusSimulator.Simulate(ending, loop, difficulty, profile);
                        CompareEndingExpected(expected.Loops[loop].Profiles[profile][difficulty], result, "ending loop " + loop + " " + profile + "/" + difficulty);
                        results.Add(result);
                    }
                }
            }

            return results;
        }

        public static RuntimeAssetImportPlan RunRuntimeAssetCatalogSmoke()
        {
            var manifest = StageJsonLoader.LoadRuntimeAssetManifest(ResolveRuntimeAssetManifestPath("runtime-assets.json"));
            var catalog = RuntimeAssetCatalog.FromManifest(manifest);
            var plan = RuntimeAssetImportPlanner.Build(manifest, manifest.Source.LocalRepo, true);

            AssertEqual(35, manifest.Assets.Count, "runtime asset count");
            AssertEqual("https://minougun.github.io/jijii-kobushi/", manifest.Source.WebUrl, "runtime asset web url");
            AssertEqual(0, plan.MissingGitTracked.Count, "runtime missing git tracked");
            AssertEqual(0, plan.IncompleteStageBackgroundPairs.Count, "runtime incomplete stage backgrounds");
            AssertEqual(10, plan.KindCounts["audio"], "runtime audio count");
            AssertEqual(2, plan.KindCounts["video"], "runtime video count");
            AssertEqual(7, plan.StageBackgrounds.Count, "runtime stage background pairs");

            var bgm = catalog.RequireByPath("./assets/audio/koiwazurai.mp3");
            AssertEqual("stage-bgm", bgm.Role, "runtime bgm role");
            AssertEqual("audio", bgm.Kind, "runtime bgm kind");
            AssertEqual(10, catalog.GetByRole("stage-bgm").Count, "runtime stage bgm role count");
            AssertTrue(File.Exists(catalog.ResolveLocalPath("./assets/audio/koiwazurai.mp3")), "runtime bgm local file");
            AssertTrue(File.Exists(catalog.ResolveLocalPath("./assets/video/ending.mp4")), "runtime ending video local file");
            AssertEqual("JiiKobushi/assets/audio/koiwazurai.mp3", catalog.GetStreamingAssetsRelativePath("./assets/audio/koiwazurai.mp3"), "runtime bgm streaming path");
            AssertEqual("JiiKobushi/assets/video/ending-loop2.mp4", catalog.GetStreamingAssetsRelativePath("assets/video/ending-loop2.mp4"), "runtime ending loop2 streaming path");

            foreach (var missing in plan.MissingLocalFiles)
            {
                AssertTrue(missing.StartsWith("assets/images/", StringComparison.Ordinal), "runtime local missing image-only warning " + missing);
            }

            return plan;
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

        private static void ValidateAllStagePack(StageExport stage, int index, string path)
        {
            var stageLabel = "stage " + (index + 1) + " " + path;
            AssertEqual(1, stage.SchemaVersion, stageLabel + " schemaVersion");
            AssertEqual("jii-kobushi", stage.GameId, stageLabel + " gameId");
            AssertEqual(index, stage.Stage.Index, stageLabel + " index");
            AssertEqual(ExpectedStageIds[index], stage.Stage.Id, stageLabel + " id");
            AssertEqual("switch-stage" + (index + 1) + "-" + stage.Stage.Id, stage.ExportId, stageLabel + " exportId");
            AssertEqual(ExpectedStageTitles[index], stage.Stage.Title, stageLabel + " title");
            AssertEqual(ExpectedStageLocations[index], stage.Stage.LocationName, stageLabel + " location");
            AssertTrue(stage.Stage.Bpm > 0, stageLabel + " bpm");
            AssertTrue(stage.Scenario.IntroLines.Count > 0, stageLabel + " intro lines");
            AssertTrue(!string.IsNullOrWhiteSpace(stage.Scenario.RestLine), stageLabel + " rest line");
            AssertTrue(!string.IsNullOrWhiteSpace(stage.Scenario.ClearLine), stageLabel + " clear line");
            AssertEqual(12, stage.Player.MaxHp, stageLabel + " player hp");
            AssertTrue(stage.Enemy.AttackPower > 0, stageLabel + " enemy attack");
            AssertTrue(stage.Enemy.Hp > 0, stageLabel + " enemy hp");
            AssertTrue(!string.IsNullOrWhiteSpace(stage.Audio.Bgm.Track), stageLabel + " bgm track");
            AssertTrue(stage.Audio.Bgm.AssetSrc.StartsWith("./assets/audio/", StringComparison.Ordinal), stageLabel + " bgm asset src");
            AssertTrue(File.Exists(ResolveRepoAssetPath(stage.Audio.Bgm.AssetSrc)), stageLabel + " bgm file exists");
            AssertEqual(3000, (int)Math.Round(stage.Audio.Timing.CountInLeadSeconds * 1000.0, MidpointRounding.AwayFromZero), stageLabel + " count-in");
            AssertEqual(60, stage.Rhythm.WindowsMs.Perfect, stageLabel + " perfect window");
            AssertEqual(120, stage.Rhythm.WindowsMs.Good, stageLabel + " good window");
            AssertEqual(190, stage.Rhythm.WindowsMs.Bad, stageLabel + " bad window");
            AssertEqual(250, stage.Rhythm.InputGraceMs, stageLabel + " input grace");
            AssertEqual(80, stage.Rhythm.MashInputGraceMs, stageLabel + " mash grace");
            AssertEqual(70, stage.Rhythm.MashDedupMinGapMs, stageLabel + " mash dedup");

            foreach (var difficulty in BattleSimulator.Difficulties)
            {
                ValidateChart(stage, difficulty, stageLabel + " " + difficulty);
                ValidateLoopChart(stage, "1", difficulty, stageLabel + " loop 1 " + difficulty);
                ValidateLoopChart(stage, "2", difficulty, stageLabel + " loop 2 " + difficulty);
                var perfect = BattleSimulator.Simulate(stage, difficulty, "perfect");
                AssertTrue(perfect.Clear, stageLabel + " " + difficulty + " perfect clear");
                AssertEqual("S", perfect.Rank, stageLabel + " " + difficulty + " perfect rank");
                AssertEqual(0, perfect.Stats.Miss, stageLabel + " " + difficulty + " perfect miss");
                AssertEqual(stage.Charts[difficulty].Count, perfect.MaxCombo, stageLabel + " " + difficulty + " perfect combo");
                AssertEqual(stage.Player.MaxHp, perfect.RemainingHp, stageLabel + " " + difficulty + " perfect hp");
            }
        }

        private static void CompareStageLoopParity(StageExport stage, ExpectedResults expected, List<BattleRunResult> results)
        {
            if (expected.Loops.Count == 0)
            {
                foreach (var profile in BattleSimulator.Profiles)
                {
                    foreach (var difficulty in BattleSimulator.Difficulties)
                    {
                        var result = BattleSimulator.Simulate(stage, difficulty, profile);
                        CompareExpected(expected, profile, difficulty, result);
                        results.Add(result);
                    }
                }
                return;
            }

            foreach (var loop in expected.Loops.Keys)
            {
                AssertTrue(stage.Loops.ContainsKey(loop), "stage loop " + loop);
                foreach (var profile in BattleSimulator.Profiles)
                {
                    foreach (var difficulty in BattleSimulator.Difficulties)
                    {
                        var result = BattleSimulator.Simulate(stage, loop, difficulty, profile);
                        CompareExpected(expected.Loops[loop].Profiles[profile][difficulty], result, "stage loop " + loop + " " + profile + "/" + difficulty);
                        results.Add(result);
                    }
                }
            }
        }

        private static void ValidateExpectedTiming(StageExport stage, ExpectedResults expected, string label)
        {
            var countInMs = (int)Math.Round(stage.Audio.Timing.CountInLeadSeconds * 1000.0, MidpointRounding.AwayFromZero);
            var first = stage.Charts["easy"][0];
            AssertEqual(countInMs, expected.Timing.CountInMs, label + " expected count-in");
            AssertEqual(first.TimeMs, expected.Timing.FirstNoteBattleMs, label + " expected first note battle");
            AssertEqual(countInMs + first.TimeMs, expected.Timing.FirstNoteVirtualMs, label + " expected first note virtual");
            AssertEqual(stage.Rhythm.WindowsMs.Perfect, expected.Timing.WindowsMs.Perfect, label + " expected perfect window");
            AssertEqual(stage.Rhythm.WindowsMs.Good, expected.Timing.WindowsMs.Good, label + " expected good window");
            AssertEqual(stage.Rhythm.WindowsMs.Bad, expected.Timing.WindowsMs.Bad, label + " expected bad window");
            AssertEqual(stage.Rhythm.InputGraceMs, expected.Timing.InputGraceMs, label + " expected input grace");
            AssertEqual(stage.Rhythm.MashInputGraceMs, expected.Timing.MashInputGraceMs, label + " expected mash grace");
            AssertEqual(stage.Rhythm.MashDedupMinGapMs, expected.Timing.MashDedupMinGapMs, label + " expected mash dedup");
        }

        private static void ValidateChart(StageExport stage, string difficulty, string label)
        {
            AssertTrue(stage.Difficulty.ContainsKey(difficulty), label + " difficulty data");
            AssertTrue(stage.Charts.ContainsKey(difficulty), label + " chart data");
            var chart = stage.Charts[difficulty];
            var summary = stage.Difficulty[difficulty].ChartSummary;
            AssertTrue(chart.Count > 0, label + " chart not empty");
            AssertEqual(summary.NoteCount, chart.Count, label + " note count");
            AssertEqual(summary.TypeCounts.Tap, CountType(chart, "tap"), label + " tap count");
            AssertEqual(summary.TypeCounts.Hold, CountType(chart, "hold"), label + " hold count");
            AssertEqual(summary.TypeCounts.Mash, CountType(chart, "mash"), label + " mash count");
            AssertEqual(summary.FirstMs, chart[0].TimeMs, label + " first ms");
            AssertEqual(summary.LastEndMs, LastEndMs(chart), label + " last end ms");

            for (var i = 0; i < chart.Count; i += 1)
            {
                var note = chart[i];
                AssertEqual(difficulty + "-" + (i + 1).ToString("0000"), note.Id, label + " note id " + i);
                AssertTrue(note.Type == "tap" || note.Type == "hold" || note.Type == "mash", label + " note type " + i);
                if (i > 0) AssertTrue(note.TimeMs > chart[i - 1].TimeMs, label + " increasing time " + i);
                if (note.Type == "tap")
                {
                    AssertEqual(0, note.DurationMs, label + " tap duration " + i);
                    AssertEqual(0, note.TargetCount, label + " tap target " + i);
                }
                else
                {
                    AssertTrue(note.DurationMs > 0, label + " duration " + i);
                    if (note.Type == "mash") AssertTrue(note.TargetCount > 0, label + " mash target " + i);
                }
            }
        }

        private static void ValidateLoopChart(StageExport stage, string loop, string difficulty, string label)
        {
            AssertTrue(stage.Loops.ContainsKey(loop), label + " loop data");
            var loopData = stage.Loops[loop];
            AssertTrue(loopData.Difficulty.ContainsKey(difficulty), label + " difficulty data");
            AssertTrue(loopData.Charts.ContainsKey(difficulty), label + " chart data");
            var chart = loopData.Charts[difficulty];
            var summary = loopData.Difficulty[difficulty].ChartSummary;
            AssertTrue(chart.Count > 0, label + " chart not empty");
            AssertEqual(summary.NoteCount, chart.Count, label + " note count");
            AssertEqual(summary.TypeCounts.Tap, CountType(chart, "tap"), label + " tap count");
            AssertEqual(summary.TypeCounts.Hold, CountType(chart, "hold"), label + " hold count");
            AssertEqual(summary.TypeCounts.Mash, CountType(chart, "mash"), label + " mash count");
            AssertEqual(summary.FirstMs, chart[0].TimeMs, label + " first ms");
            AssertEqual(summary.LastEndMs, LastEndMs(chart), label + " last end ms");
        }

        private static int CountType(List<NoteData> chart, string type)
        {
            var count = 0;
            foreach (var note in chart)
            {
                if (note.Type == type) count += 1;
            }
            return count;
        }

        private static int LastEndMs(List<NoteData> chart)
        {
            var last = chart[chart.Count - 1];
            return last.TimeMs + last.DurationMs;
        }

        private static void CompareExpected(ExpectedResults expected, string profile, string difficulty, BattleRunResult actual)
        {
            CompareExpected(expected.Profiles[profile][difficulty], actual, profile + "/" + difficulty);
        }

        private static void CompareExpected(ExpectedRunResult expectedProfile, BattleRunResult actual, string label)
        {
            AssertEqual(expectedProfile.Clear, actual.Clear, label + " clear");
            AssertEqual(expectedProfile.Score, actual.Score, label + " score");
            AssertEqual(expectedProfile.Rank, actual.Rank, label + " rank");
            AssertEqual(expectedProfile.MaxCombo, actual.MaxCombo, label + " maxCombo");
            AssertStats(expectedProfile.Stats, actual.Stats, label + " stats");
            AssertTypeCounts(expectedProfile.MissByType, actual.MissByType, label + " missByType");
            AssertEqual(expectedProfile.Hp.Remaining, actual.RemainingHp, label + " hp remaining");
            AssertEqual(expectedProfile.Hp.Max, actual.MaxHp, label + " hp max");
        }

        private static void ValidateEndingBonusPack(EndingBonusExport ending, EndingBonusExpectedResults expected)
        {
            AssertEqual(1, ending.SchemaVersion, "ending schemaVersion");
            AssertEqual("jii-kobushi", ending.GameId, "ending gameId");
            AssertEqual("switch-ending-bonus", ending.ExportId, "ending exportId");
            AssertEqual("ED拍ボーナス", ending.Ending.Title, "ending title");
            AssertEqual(1600, ending.Ending.FirstBeatMs, "ending first beat");
            AssertEqual(77300, ending.Ending.FallbackDurationMs, "ending fallback duration");
            AssertEqual("./assets/video/ending.mp4", ending.Ending.FirstLoopVideoSrc, "ending first loop video");
            AssertEqual("./assets/video/ending-loop2.mp4", ending.Ending.LoopPlusVideoSrc, "ending loop plus video");
            AssertEqual(ending.Ending.FirstBeatMs, expected.Timing.FirstBeatMs, "ending expected first beat");
            AssertEqual(ending.Ending.FallbackDurationMs, expected.Timing.FallbackDurationMs, "ending expected fallback duration");
            AssertEqual(ending.Rhythm.WindowsMs.Perfect, expected.Timing.WindowsMs.Perfect, "ending perfect window");
            AssertEqual(ending.Rhythm.WindowsMs.Good, expected.Timing.WindowsMs.Good, "ending good window");
            AssertEqual(ending.Rhythm.WindowsMs.Bad, expected.Timing.WindowsMs.Bad, "ending bad window");
            AssertEqual(250, ending.Rhythm.InputGraceMs, "ending input grace");
            AssertEqual(80, ending.Rhythm.MashInputGraceMs, "ending mash grace");
            AssertEqual(70, ending.Rhythm.MashDedupMinGapMs, "ending mash dedup");

            foreach (var loop in new[] { "1", "2" })
            {
                AssertTrue(ending.Loops.ContainsKey(loop), "ending loop " + loop);
                AssertTrue(expected.Loops.ContainsKey(loop), "ending expected loop " + loop);
                foreach (var difficulty in BattleSimulator.Difficulties)
                {
                    ValidateEndingChart(ending.Loops[loop], difficulty, "ending loop " + loop + " " + difficulty);
                }
            }
        }

        private static void ValidateEndingChart(EndingBonusLoopData loop, string difficulty, string label)
        {
            AssertTrue(loop.Difficulty.ContainsKey(difficulty), label + " difficulty");
            AssertTrue(loop.Charts.ContainsKey(difficulty), label + " chart");
            var chart = loop.Charts[difficulty];
            var summary = loop.Difficulty[difficulty].ChartSummary;
            AssertTrue(chart.Count > 0, label + " not empty");
            AssertEqual(summary.NoteCount, chart.Count, label + " note count");
            AssertEqual(summary.TypeCounts.Tap, CountType(chart, "tap"), label + " tap count");
            AssertEqual(summary.TypeCounts.Hold, CountType(chart, "hold"), label + " hold count");
            AssertEqual(summary.TypeCounts.Mash, CountType(chart, "mash"), label + " mash count");
            AssertEqual(summary.FirstMs, chart[0].TimeMs, label + " first ms");
            AssertEqual(summary.LastEndMs, LastEndMs(chart), label + " last end ms");
            AssertTrue(summary.TightestMashIntervalMs >= 105, label + " realistic mash interval");

            for (var i = 0; i < chart.Count; i += 1)
            {
                var note = chart[i];
                AssertTrue(note.Id.StartsWith("ed-l", StringComparison.Ordinal), label + " note id " + i);
                AssertTrue(note.Type == "tap" || note.Type == "hold" || note.Type == "mash", label + " note type " + i);
                if (i > 0) AssertTrue(note.TimeMs > chart[i - 1].TimeMs, label + " increasing time " + i);
                if (note.Type == "tap")
                {
                    AssertEqual(0, note.DurationMs, label + " tap duration " + i);
                    AssertEqual(0, note.TargetCount, label + " tap target " + i);
                }
                else
                {
                    AssertTrue(note.DurationMs > 0, label + " duration " + i);
                    if (note.Type == "mash") AssertTrue(note.TargetCount > 0, label + " mash target " + i);
                }
            }
        }

        private static void CompareEndingExpected(EndingBonusRunResult expected, EndingBonusRunResult actual, string label)
        {
            AssertEqual(expected.NoteCount, actual.NoteCount, label + " note count");
            AssertTypeCounts(expected.TypeCounts, actual.TypeCounts, label + " type counts");
            AssertStats(expected.Stats, actual.Stats, label + " stats");
            AssertTypeCounts(expected.MissByType, actual.MissByType, label + " miss by type");
            AssertEqual(expected.Hits, actual.Hits, label + " hits");
            AssertEqual(expected.Misses, actual.Misses, label + " misses");
            AssertEqual(expected.BestCombo, actual.BestCombo, label + " best combo");
            AssertEqual(expected.Score, actual.Score, label + " score");
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

        private static void AssertTrue(bool condition, string label)
        {
            if (!condition)
            {
                throw new InvalidOperationException(label + " expected true");
            }
        }

        private static string ResolveRepoAssetPath(string assetSrc)
        {
            var normalized = assetSrc.StartsWith("./", StringComparison.Ordinal) ? assetSrc.Substring(2) : assetSrc;
            var current = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (current != null)
            {
                var candidate = Path.Combine(current.FullName, normalized.Replace("/", Path.DirectorySeparatorChar.ToString()));
                if (File.Exists(candidate)) return candidate;
                current = current.Parent;
            }

            return Path.GetFullPath(normalized);
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

        public static string ResolveAllStagePackPath(string fileName)
        {
            var current = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (current != null)
            {
                var switchPortCandidate = Path.Combine(current.FullName, "switch-port", "stages", fileName);
                if (File.Exists(switchPortCandidate)) return switchPortCandidate;

                var siblingCandidate = Path.Combine(current.FullName, "stages", fileName);
                if (File.Exists(siblingCandidate)) return siblingCandidate;

                current = current.Parent;
            }

            throw new FileNotFoundException("Could not find all-stage port pack file: " + fileName);
        }

        public static string ResolveEndingPackPath(string fileName)
        {
            var current = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (current != null)
            {
                var switchPortCandidate = Path.Combine(current.FullName, "switch-port", "ending", fileName);
                if (File.Exists(switchPortCandidate)) return switchPortCandidate;

                var siblingCandidate = Path.Combine(current.FullName, "ending", fileName);
                if (File.Exists(siblingCandidate)) return siblingCandidate;

                current = current.Parent;
            }

            throw new FileNotFoundException("Could not find ending bonus port pack file: " + fileName);
        }

        public static string ResolveRuntimeAssetManifestPath(string fileName)
        {
            var current = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (current != null)
            {
                var switchPortCandidate = Path.Combine(current.FullName, "switch-port", "assets", fileName);
                if (File.Exists(switchPortCandidate)) return switchPortCandidate;

                var siblingCandidate = Path.Combine(current.FullName, "assets", fileName);
                if (File.Exists(siblingCandidate)) return siblingCandidate;

                current = current.Parent;
            }

            throw new FileNotFoundException("Could not find runtime asset manifest file: " + fileName);
        }
    }
}
