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
        public void AllStagePacksLoadAndPassSmokeGate()
        {
            var stages = ProfileTestRunner.RunAllStageSmoke();
            Assert.AreEqual(7, stages.Count);
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
