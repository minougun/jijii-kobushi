using System.IO;
using NUnit.Framework;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class Stage1PortableParityTests
    {
        [Test]
        public void ProfilesMatchExpectedResults()
        {
            var stageJson = ProfileTestRunner.ResolveStagePackPath("shotengai.stage.json");
            var expectedJson = ProfileTestRunner.ResolveStagePackPath("expected-results.json");
            ProfileTestRunner.RunAll(stageJson, expectedJson);
        }

        [Test]
        public void RunProgressTrackerRecordsReplacesAndResetsStageResults()
        {
            var tracker = new RunProgressTracker();
            var stage = StageJsonLoader.LoadStage(ProfileTestRunner.ResolveAllStagePackPath("stage01-shotengai.stage.json"));
            var perfect = BattleSimulator.Simulate(stage, "1", "normal", "perfect");
            var mashWeak = BattleSimulator.Simulate(stage, "1", "normal", "mash-weak");

            tracker.ResetIfNeeded("normal", 1, 0);
            tracker.Record(1, stage.Stage.Title, perfect);

            Assert.AreEqual(1, tracker.Count);
            Assert.AreEqual(perfect.Score, tracker.TotalScore);
            Assert.AreEqual(perfect.Score, tracker.AverageScore);
            Assert.AreEqual("S", tracker.FinalRank);
            Assert.AreEqual(100, RunProgressTracker.Accuracy(tracker.Find(1)));

            tracker.Record(1, stage.Stage.Title, mashWeak);
            Assert.AreEqual(1, tracker.Count, "same stage is replaced rather than duplicated");
            Assert.AreEqual(mashWeak.Score, tracker.TotalScore);
            Assert.AreEqual(mashWeak.Rank, tracker.Find(1).Rank);

            tracker.ResetIfNeeded("hard", 1, 0);
            Assert.AreEqual(0, tracker.Count, "difficulty change starts a fresh run");
        }

        [Test]
        public void StagePackCatalogDefinesSingleCanonicalSevenStageOrder()
        {
            Assert.AreEqual(7, StagePackCatalog.Count);
            Assert.AreEqual("stage01-shotengai.stage.json", StagePackCatalog.GetFileNameByIndex(0));
            Assert.AreEqual("shotengai", StagePackCatalog.GetByIndex(0).Id);
            Assert.AreEqual("うさぎ公園", StagePackCatalog.GetByIndex(0).LocationName);
            Assert.AreEqual("stage07-finalhideout.stage.json", StagePackCatalog.GetFileNameByIndex(6));
            Assert.AreEqual("finalhideout", StagePackCatalog.GetByIndex(6).Id);
            Assert.IsTrue(StagePackCatalog.ContainsStageId("riverside"));
            Assert.IsNull(StagePackCatalog.FindById("unknown"));
            Assert.AreEqual(1, StagePackCatalog.ClampStageNumber(-1));
            Assert.AreEqual(7, StagePackCatalog.ClampStageNumber(999));
            CollectionAssert.AreEqual(StagePackCatalog.FileNames(), ProfileTestRunner.AllStagePackFiles);
        }

        [Test]
        public void AllStagePacksLoadAndPassSmokeGate()
        {
            var stages = ProfileTestRunner.RunAllStageSmoke();
            Assert.AreEqual(7, stages.Count);
        }

        [Test]
        public void AllStageProfilesMatchExpectedResults()
        {
            var results = ProfileTestRunner.RunAllStageProfileParity();
            Assert.AreEqual(2 * 7 * 6 * 3, results.Count);
        }

        [Test]
        public void EndingBonusProfilesMatchExpectedResults()
        {
            var results = ProfileTestRunner.RunEndingBonusProfileParity();
            Assert.AreEqual(2 * 6 * 3, results.Count);
        }

        [Test]
        public void RuntimeAssetManifestLoadsForUnityImportPlanning()
        {
            var manifest = StageJsonLoader.LoadRuntimeAssetManifest(ProfileTestRunner.ResolveRuntimeAssetManifestPath("runtime-assets.json"));
            Assert.AreEqual(1, manifest.SchemaVersion);
            Assert.AreEqual("jii-kobushi", manifest.GameId);
            Assert.AreEqual("switch-runtime-assets", manifest.ExportId);
            Assert.AreEqual("https://minougun.github.io/jijii-kobushi/", manifest.Source.WebUrl);
            Assert.AreEqual(35, manifest.Assets.Count);

            AssertRuntimeAsset(manifest, "assets/images/jii-kobushi-chibi-character-sheet-v1.png", "character-sheet", "raster-image");
            AssertRuntimeAsset(manifest, "assets/images/kojiro-cutin.png", "special-cutin", "raster-image");
            AssertRuntimeAsset(manifest, "assets/video/ending.mp4", "ending-video-first-loop", "video");
            AssertRuntimeAsset(manifest, "assets/video/ending-loop2.mp4", "ending-video-loop-plus", "video");
            AssertRuntimeAsset(manifest, "assets/audio/koiwazurai.mp3", "stage-bgm", "audio");
            AssertRuntimeAsset(manifest, "assets/fonts/NotoSansJP-JiiKobushi-subset.woff2", "ui-font", "font");
        }

        [Test]
        public void RuntimeAssetImportPlanKeepsWebAssetCoverage()
        {
            var manifest = StageJsonLoader.LoadRuntimeAssetManifest(ProfileTestRunner.ResolveRuntimeAssetManifestPath("runtime-assets.json"));
            var plan = RuntimeAssetImportPlanner.Build(manifest, "", false);

            Assert.AreEqual(35, plan.TotalAssets);
            Assert.AreEqual(10, plan.KindCounts["audio"]);
            Assert.AreEqual(2, plan.KindCounts["video"]);
            Assert.AreEqual(2, plan.KindCounts["font"]);
            Assert.AreEqual(20, plan.KindCounts["raster-image"]);
            Assert.AreEqual(1, plan.KindCounts["vector-image"]);
            Assert.AreEqual(7, plan.StageBackgrounds.Count);
            Assert.AreEqual(0, plan.MissingGitTracked.Count);
            Assert.AreEqual(0, plan.IncompleteStageBackgroundPairs.Count);
            Assert.Contains("assets/video/ending.mp4", plan.VideoAssets);
            Assert.Contains("assets/video/ending-loop2.mp4", plan.VideoAssets);
            AssertStageBackgroundPair(plan, "shotengai");
            AssertStageBackgroundPair(plan, "warehouse");
            AssertStageBackgroundPair(plan, "finalhideout");
        }

        [Test]
        public void RuntimeAssetImportPlanSeparatesLocalImageGapsFromBlockingManifestGaps()
        {
            var manifest = StageJsonLoader.LoadRuntimeAssetManifest(ProfileTestRunner.ResolveRuntimeAssetManifestPath("runtime-assets.json"));
            var plan = RuntimeAssetImportPlanner.Build(manifest, manifest.Source.LocalRepo, true);

            Assert.AreEqual(0, plan.MissingGitTracked.Count);
            Assert.AreEqual(0, plan.IncompleteStageBackgroundPairs.Count);
            Assert.IsFalse(plan.MissingLocalFiles.Contains("assets/audio/koiwazurai.mp3"), "stage 1 bgm local");
            Assert.IsFalse(plan.MissingLocalFiles.Contains("assets/video/ending.mp4"), "ending video local");
            Assert.IsFalse(plan.MissingLocalFiles.Contains("assets/fonts/NotoSansJP-JiiKobushi-subset.woff2"), "font local");

            foreach (var missing in plan.MissingLocalFiles)
            {
                Assert.IsTrue(missing.StartsWith("assets/images/", System.StringComparison.Ordinal), "local missing asset is image-only warning: " + missing);
            }
        }

        [Test]
        public void RuntimeAssetCatalogResolvesLocalFilesAndStreamingPaths()
        {
            var manifest = StageJsonLoader.LoadRuntimeAssetManifest(ProfileTestRunner.ResolveRuntimeAssetManifestPath("runtime-assets.json"));
            var catalog = RuntimeAssetCatalog.FromManifest(manifest);

            var bgm = catalog.RequireByPath("./assets/audio/koiwazurai.mp3");
            Assert.AreEqual("stage-bgm", bgm.Role);
            Assert.AreEqual("audio", bgm.Kind);
            Assert.AreEqual(10, catalog.GetByRole("stage-bgm").Count);

            var bgmPath = catalog.ResolveLocalPath("./assets/audio/koiwazurai.mp3");
            Assert.IsTrue(File.Exists(bgmPath), "BGM file exists through catalog: " + bgmPath);
            Assert.IsTrue(bgmPath.Replace('\\', '/').EndsWith("/assets/audio/koiwazurai.mp3", System.StringComparison.Ordinal), "BGM path normalized");
            Assert.AreEqual("JiiKobushi/assets/audio/koiwazurai.mp3", catalog.GetStreamingAssetsRelativePath("./assets/audio/koiwazurai.mp3"));

            var endingPath = catalog.ResolveLocalPath("./assets/video/ending.mp4");
            Assert.IsTrue(File.Exists(endingPath), "ED video file exists through catalog: " + endingPath);
            Assert.AreEqual("JiiKobushi/assets/video/ending-loop2.mp4", catalog.GetStreamingAssetsRelativePath("assets/video/ending-loop2.mp4"));
        }

        [Test]
        public void RuntimeAssetCatalogPrefersStreamingAssetsWhenPresent()
        {
            var tempRoot = Path.Combine(Path.GetTempPath(), "jii-kobushi-streaming-assets-test-" + System.Guid.NewGuid().ToString("N"));
            try
            {
                var stagedPath = Path.Combine(tempRoot, "JiiKobushi", "assets", "audio", "koiwazurai.mp3");
                Directory.CreateDirectory(Path.GetDirectoryName(stagedPath));
                File.WriteAllText(stagedPath, "placeholder");

                var manifest = StageJsonLoader.LoadRuntimeAssetManifest(ProfileTestRunner.ResolveRuntimeAssetManifestPath("runtime-assets.json"));
                var catalog = RuntimeAssetCatalog.FromManifest(manifest);
                Assert.AreEqual(stagedPath, catalog.ResolveStreamingAssetsPath("./assets/audio/koiwazurai.mp3", tempRoot));
                Assert.AreEqual("", catalog.ResolveStreamingAssetsPath("./assets/audio/oboro.mp3", tempRoot));
            }
            finally
            {
                if (Directory.Exists(tempRoot)) Directory.Delete(tempRoot, true);
            }
        }

        [Test]
        public void RuntimeAssetPathUtilityResolvesStreamingLocalAndDirectoryFallbacks()
        {
            var manifest = StageJsonLoader.LoadRuntimeAssetManifest(ProfileTestRunner.ResolveRuntimeAssetManifestPath("runtime-assets.json"));
            var catalog = RuntimeAssetCatalog.FromManifest(manifest);
            var tempRoot = Path.Combine(Path.GetTempPath(), "jii-kobushi-runtime-path-test-" + System.Guid.NewGuid().ToString("N"));
            try
            {
                var stagedPath = Path.Combine(tempRoot, "streaming", "JiiKobushi", "assets", "audio", "koiwazurai.mp3");
                Directory.CreateDirectory(Path.GetDirectoryName(stagedPath));
                File.WriteAllText(stagedPath, "placeholder");

                Assert.AreEqual(stagedPath, RuntimeAssetPathUtility.ResolveRuntimePath("./assets/audio/koiwazurai.mp3", catalog, Path.Combine(tempRoot, "streaming"), tempRoot));

                var localPath = RuntimeAssetPathUtility.ResolveRuntimePath("./assets/audio/koiwazurai.mp3", catalog, Path.Combine(tempRoot, "empty-streaming"), tempRoot);
                Assert.IsTrue(File.Exists(localPath), "local Web-original fallback exists");
                Assert.IsTrue(localPath.Replace('\\', '/').EndsWith("/assets/audio/koiwazurai.mp3", System.StringComparison.Ordinal), "local fallback path");

                var fallbackPath = Path.Combine(tempRoot, "assets", "audio", "fallback-test.mp3");
                Directory.CreateDirectory(Path.GetDirectoryName(fallbackPath));
                File.WriteAllText(fallbackPath, "fallback");
                var nestedSearchRoot = Path.Combine(tempRoot, "nested", "child");
                Directory.CreateDirectory(nestedSearchRoot);
                Assert.AreEqual(fallbackPath, RuntimeAssetPathUtility.ResolveRuntimePath("./assets/audio/fallback-test.mp3", null, "", nestedSearchRoot));
            }
            finally
            {
                if (Directory.Exists(tempRoot)) Directory.Delete(tempRoot, true);
            }
        }

        [Test]
        public void DefaultInputBindingsCoverKeyboardAndGenericGamepadActions()
        {
            var bindings = RhythmInputBindingProfile.CreateDefault();

            CollectionAssert.Contains(bindings.TapOrMashKeys, KeyCode.Space);
            CollectionAssert.Contains(bindings.TapOrMashKeys, KeyCode.Z);
            CollectionAssert.Contains(bindings.TapOrMashKeys, KeyCode.JoystickButton0);
            CollectionAssert.Contains(bindings.TapOrMashKeys, KeyCode.JoystickButton2);
            CollectionAssert.Contains(bindings.TapOrMashButtons, "Submit");
            CollectionAssert.Contains(bindings.HoldKeys, KeyCode.X);
            CollectionAssert.Contains(bindings.HoldKeys, KeyCode.J);
            CollectionAssert.Contains(bindings.HoldKeys, KeyCode.JoystickButton1);
            CollectionAssert.Contains(bindings.HoldKeys, KeyCode.JoystickButton3);
            CollectionAssert.Contains(bindings.PauseKeys, KeyCode.P);
            CollectionAssert.Contains(bindings.PauseKeys, KeyCode.Escape);
            CollectionAssert.Contains(bindings.PauseKeys, KeyCode.JoystickButton9);
            CollectionAssert.Contains(bindings.RestartKeys, KeyCode.Return);
            CollectionAssert.Contains(bindings.RestartKeys, KeyCode.JoystickButton7);
        }

        [Test]
        public void StageBackgroundAssetMapCoversAllStagePacks()
        {
            var manifest = StageJsonLoader.LoadRuntimeAssetManifest(ProfileTestRunner.ResolveRuntimeAssetManifestPath("runtime-assets.json"));
            var catalog = RuntimeAssetCatalog.FromManifest(manifest);
            var stages = ProfileTestRunner.RunAllStageSmoke();

            foreach (var stage in stages)
            {
                var backgroundPath = StageRuntimeVisualAssets.GetBackgroundAssetPath(stage.Stage.Id);
                RuntimeAssetEntry entry;
                Assert.IsNotEmpty(backgroundPath, stage.Stage.Id + " background mapped");
                Assert.IsTrue(catalog.TryGetByPath(backgroundPath, out entry), stage.Stage.Id + " background listed in runtime manifest");
                Assert.IsTrue(backgroundPath.EndsWith(".png", System.StringComparison.Ordinal), stage.Stage.Id + " background uses Unity-readable PNG source");
            }

            Assert.AreEqual("./assets/images/stage-bg-shotengai-v1.png", StageRuntimeVisualAssets.GetBackgroundAssetPath("shotengai"));
            Assert.AreEqual("", StageRuntimeVisualAssets.GetBackgroundAssetPath("unknown"));
        }

        [Test]
        public void EndingBonusInteractivePerfectRunMatchesSimulator()
        {
            var ending = StageJsonLoader.LoadEndingBonus(ProfileTestRunner.ResolveEndingPackPath("ending-bonus.stage.json"));
            foreach (var loop in new[] { "1", "2" })
            {
                foreach (var difficulty in BattleSimulator.Difficulties)
                {
                    var session = new EndingBonusInteractiveSession(ending, loop, difficulty);
                    PlayEndingPerfect(ending, loop, difficulty, session);

                    var expected = EndingBonusSimulator.Simulate(ending, loop, difficulty, "perfect");
                    var actual = session.BuildResult();
                    Assert.AreEqual(expected.NoteCount, actual.NoteCount, loop + " " + difficulty + " noteCount");
                    Assert.AreEqual(expected.Score, actual.Score, loop + " " + difficulty + " score");
                    Assert.AreEqual(expected.BestCombo, actual.BestCombo, loop + " " + difficulty + " combo");
                    Assert.AreEqual(expected.Stats.Perfect, actual.Stats.Perfect, loop + " " + difficulty + " perfect");
                    Assert.AreEqual(expected.Misses, actual.Misses, loop + " " + difficulty + " misses");
                    Assert.IsTrue(session.IsComplete, loop + " " + difficulty + " complete");
                }
            }
        }

        [Test]
        public void EndingBonusPerfectInputPlannerMatchesSimulator()
        {
            var ending = StageJsonLoader.LoadEndingBonus(ProfileTestRunner.ResolveEndingPackPath("ending-bonus.stage.json"));
            var events = EndingBonusPerfectInputPlanner.Build(ending, "2", "hard");
            Assert.Greater(events.Count, ending.Loops["2"].Charts["hard"].Count);

            for (var i = 1; i < events.Count; i += 1)
            {
                Assert.GreaterOrEqual(events[i].TimeMs, events[i - 1].TimeMs, "events sorted");
            }

            var session = new EndingBonusInteractiveSession(ending, "2", "hard");
            PlayEndingEvents(ending, "2", "hard", session, events);
            var expected = EndingBonusSimulator.Simulate(ending, "2", "hard", "perfect");
            var actual = session.BuildResult();
            Assert.AreEqual(expected.Score, actual.Score);
            Assert.AreEqual(expected.Stats.Perfect, actual.Stats.Perfect);
            Assert.AreEqual(0, actual.Misses);
        }

        [Test]
        public void StagePerfectInputPlannerMatchesSimulator()
        {
            var stage = StageJsonLoader.LoadStage(ProfileTestRunner.ResolveAllStagePackPath("stage07-finalhideout.stage.json"));
            var events = StagePerfectInputPlanner.Build(stage, "2", "hard");
            Assert.Greater(events.Count, stage.Loops["2"].Charts["hard"].Count);

            for (var i = 1; i < events.Count; i += 1)
            {
                Assert.GreaterOrEqual(events[i].TimeMs, events[i - 1].TimeMs, "events sorted");
            }

            var session = new InteractiveBattleSession(stage, "2", "hard");
            PlayStageEvents(stage, "2", "hard", session, events);
            var expected = BattleSimulator.Simulate(stage, "2", "hard", "perfect");
            var actual = session.BuildResult();
            Assert.AreEqual(expected.Score, actual.Score);
            Assert.AreEqual(expected.Stats.Perfect, actual.Stats.Perfect);
            Assert.AreEqual(0, actual.Stats.Miss);
        }

        [Test]
        public void InteractivePerfectRunMatchesSimulator()
        {
            var stage = LoadStage();
            foreach (var difficulty in BattleSimulator.Difficulties)
            {
                var session = new InteractiveBattleSession(stage, difficulty);
                PlayPerfect(stage, difficulty, session);

                var expected = BattleSimulator.Simulate(stage, difficulty, "perfect");
                var actual = session.BuildResult();
                Assert.AreEqual(expected.Clear, actual.Clear, difficulty + " clear");
                Assert.AreEqual(expected.Score, actual.Score, difficulty + " score");
                Assert.AreEqual(expected.Rank, actual.Rank, difficulty + " rank");
                Assert.AreEqual(expected.MaxCombo, actual.MaxCombo, difficulty + " maxCombo");
                Assert.AreEqual(expected.Stats.Perfect, actual.Stats.Perfect, difficulty + " perfect");
                Assert.AreEqual(expected.Stats.Miss, actual.Stats.Miss, difficulty + " miss");
            }
        }

        [Test]
        public void InteractiveLoopPlusPerfectRunMatchesSimulator()
        {
            var stage = StageJsonLoader.LoadStage(ProfileTestRunner.ResolveAllStagePackPath("stage01-shotengai.stage.json"));
            var session = new InteractiveBattleSession(stage, "2", "hard");
            PlayPerfect(stage, "2", "hard", session);

            var expected = BattleSimulator.Simulate(stage, "2", "hard", "perfect");
            var actual = session.BuildResult();
            Assert.AreEqual("2", actual.Loop);
            Assert.AreEqual(208, actual.NoteCount);
            Assert.AreEqual(expected.Clear, actual.Clear, "loop2 hard clear");
            Assert.AreEqual(expected.Score, actual.Score, "loop2 hard score");
            Assert.AreEqual(expected.Rank, actual.Rank, "loop2 hard rank");
            Assert.AreEqual(expected.MaxCombo, actual.MaxCombo, "loop2 hard maxCombo");
            Assert.AreEqual(expected.Stats.Perfect, actual.Stats.Perfect, "loop2 hard perfect");
            Assert.AreEqual(expected.Stats.Miss, actual.Stats.Miss, "loop2 hard miss");
        }

        [Test]
        public void InteractiveExpiredTapMissesAndDamagesPlayer()
        {
            var stage = LoadStage();
            var session = new InteractiveBattleSession(stage, "normal");
            var first = stage.Charts["normal"][0];

            session.SeekBattleClockMs(first.TimeMs + stage.Rhythm.InputGraceMs + 1);
            var result = session.BuildResult();

            Assert.AreEqual(1, result.Stats.Miss);
            Assert.AreEqual(1, result.MissByType.Tap);
            Assert.Less(result.RemainingHp, result.MaxHp);
            Assert.AreEqual(InteractiveBattlePhase.Battle, session.Phase);
        }

        [Test]
        public void InteractivePauseFreezesClockAndJudgement()
        {
            var stage = LoadStage();
            var session = new InteractiveBattleSession(stage, "normal");
            var first = stage.Charts["normal"][0];

            session.AdvanceMs(1000);
            session.Pause();
            var elapsedAtPause = session.ElapsedMs;

            session.AdvanceMs(5000);
            session.SeekBattleClockMs(first.TimeMs + stage.Rhythm.InputGraceMs + 1);
            session.Tap();

            Assert.IsTrue(session.IsPaused);
            Assert.AreEqual(elapsedAtPause, session.ElapsedMs);
            Assert.AreEqual("Paused", session.LastJudgeText);
            Assert.AreEqual(0, session.BuildResult().Stats.Miss);

            session.Resume();
            session.AdvanceMs(250);
            Assert.IsFalse(session.IsPaused);
            Assert.AreEqual(elapsedAtPause + 250, session.ElapsedMs);
        }

        [Test]
        public void InteractiveHpZeroEntersFailed()
        {
            var stage = LoadStage();
            var session = new InteractiveBattleSession(stage, "normal");

            for (var i = 0; i < stage.Charts["normal"].Count && !session.IsFailed; i += 1)
            {
                var note = session.CurrentNote;
                Assert.IsNotNull(note);
                var grace = note.Type == "mash" ? stage.Rhythm.MashInputGraceMs : stage.Rhythm.InputGraceMs;
                session.SeekBattleClockMs(note.TimeMs + note.DurationMs + grace + 1);
            }

            var result = session.BuildResult();
            Assert.IsTrue(session.IsComplete);
            Assert.IsTrue(session.IsFailed);
            Assert.IsFalse(session.IsCleared);
            Assert.AreEqual(InteractiveBattlePhase.Failed, session.Phase);
            Assert.IsFalse(result.Clear);
            Assert.AreEqual(0, result.RemainingHp);
        }

        private static StageExport LoadStage()
        {
            return StageJsonLoader.LoadStage(ProfileTestRunner.ResolveStagePackPath("shotengai.stage.json"));
        }

        private static void AssertRuntimeAsset(RuntimeAssetManifest manifest, string assetPath, string role, string kind)
        {
            for (var i = 0; i < manifest.Assets.Count; i += 1)
            {
                var asset = manifest.Assets[i];
                if (asset.Path != assetPath) continue;

                Assert.AreEqual(role, asset.Role, assetPath + " role");
                Assert.AreEqual(kind, asset.Kind, assetPath + " kind");
                Assert.IsTrue(asset.GitTracked, assetPath + " git tracked");
                Assert.IsNotEmpty(asset.GitObjectId, assetPath + " object id");
                Assert.Greater(asset.References.Count, 0, assetPath + " references");
                return;
            }

            Assert.Fail("Missing runtime asset: " + assetPath);
        }

        private static void AssertStageBackgroundPair(RuntimeAssetImportPlan plan, string stageKey)
        {
            for (var i = 0; i < plan.StageBackgrounds.Count; i += 1)
            {
                var pair = plan.StageBackgrounds[i];
                if (pair.StageKey != stageKey) continue;

                Assert.IsTrue(pair.WebpPath.EndsWith(stageKey + "-v1.webp", System.StringComparison.Ordinal), stageKey + " webp");
                Assert.IsTrue(pair.PngPath.EndsWith(stageKey + "-v1.png", System.StringComparison.Ordinal), stageKey + " png");
                return;
            }

            Assert.Fail("Missing stage background pair: " + stageKey);
        }

        private static void PlayPerfect(StageExport stage, string difficulty, InteractiveBattleSession session)
        {
            PlayPerfect(stage, "1", difficulty, session);
        }

        private static void PlayPerfect(StageExport stage, string loop, string difficulty, InteractiveBattleSession session)
        {
            PlayStageEvents(stage, loop, difficulty, session, StagePerfectInputPlanner.Build(stage, loop, difficulty));
        }

        private static void PlayStageEvents(StageExport stage, string loop, string difficulty, InteractiveBattleSession session, System.Collections.Generic.List<StagePerfectInputEvent> events)
        {
            for (var i = 0; i < events.Count; i += 1)
            {
                session.SeekBattleClockMs(events[i].TimeMs);
                if (events[i].Action == StagePerfectInputPlanner.TapAction) session.Tap();
                else if (events[i].Action == StagePerfectInputPlanner.HoldDownAction) session.HoldDown();
                else if (events[i].Action == StagePerfectInputPlanner.HoldUpAction) session.HoldUp();
            }

            session.SeekBattleClockMs(StagePerfectInputPlanner.CompletionBattleClockMs(stage, loop, difficulty));
        }

        private static void PlayEndingPerfect(EndingBonusExport ending, string loop, string difficulty, EndingBonusInteractiveSession session)
        {
            PlayEndingEvents(ending, loop, difficulty, session, EndingBonusPerfectInputPlanner.Build(ending, loop, difficulty));
        }

        private static void PlayEndingEvents(EndingBonusExport ending, string loop, string difficulty, EndingBonusInteractiveSession session, System.Collections.Generic.List<EndingBonusInputEvent> events)
        {
            for (var i = 0; i < events.Count; i += 1)
            {
                session.SeekBattleClockMs(events[i].TimeMs);
                if (events[i].Action == EndingBonusPerfectInputPlanner.TapAction) session.Tap();
                else if (events[i].Action == EndingBonusPerfectInputPlanner.HoldDownAction) session.HoldDown();
                else if (events[i].Action == EndingBonusPerfectInputPlanner.HoldUpAction) session.HoldUp();
            }

            var chart = ending.Loops[loop].Charts[difficulty];
            var last = chart[chart.Count - 1];
            session.SeekBattleClockMs(last.TimeMs + last.DurationMs + ending.Rhythm.InputGraceMs + ending.Rhythm.MashInputGraceMs + 1);
        }
    }
}
