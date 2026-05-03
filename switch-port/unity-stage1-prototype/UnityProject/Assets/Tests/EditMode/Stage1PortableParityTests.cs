using NUnit.Framework;

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
        }

        private static StageExport LoadStage()
        {
            return StageJsonLoader.LoadStage(ProfileTestRunner.ResolveStagePackPath("shotengai.stage.json"));
        }

        private static void PlayPerfect(StageExport stage, string difficulty, InteractiveBattleSession session)
        {
            var chart = stage.Charts[difficulty];
            for (var i = 0; i < chart.Count; i += 1)
            {
                var note = chart[i];
                session.SeekBattleClockMs(note.TimeMs);

                if (note.Type == "tap")
                {
                    session.Tap();
                }
                else if (note.Type == "hold")
                {
                    session.HoldDown();
                    session.SeekBattleClockMs(note.TimeMs + note.DurationMs);
                    session.HoldUp();
                }
                else if (note.Type == "mash")
                {
                    PlayPerfectMash(stage, note, session);
                    session.SeekBattleClockMs(note.TimeMs + note.DurationMs + stage.Rhythm.MashInputGraceMs + 1);
                }
            }
        }

        private static void PlayPerfectMash(StageExport stage, NoteData note, InteractiveBattleSession session)
        {
            var target = note.TargetCount;
            var gap = target <= 1 ? 0 : System.Math.Max(stage.Rhythm.MashDedupMinGapMs, (note.DurationMs - 20) / (target - 1));
            for (var i = 0; i < target; i += 1)
            {
                session.SeekBattleClockMs(note.TimeMs + 10 + i * gap);
                session.Tap();
            }
        }
    }
}
