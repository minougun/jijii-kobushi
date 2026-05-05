using System.Collections;
using System.IO;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class Stage1PrototypePlayModeSmokeTests
    {
        [UnityTest]
        public IEnumerator PlaceholderRendererLoadsStageAndFindsBgm()
        {
            var runnerObject = new GameObject("Stage1 PlayMode Smoke Runner");
            var runner = runnerObject.AddComponent<PlaceholderRendererBehaviour>();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded && runner.DebugBgmFileExists) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            Assert.AreEqual("うさぎ公園", runner.DebugStageLocation);
            Assert.GreaterOrEqual(runner.DebugIntroLineCount, 1);
            Assert.IsTrue(runner.DebugBgmFileExists, runner.DebugAudioStatus);

            Object.Destroy(runnerObject);
        }

        [UnityTest]
        public IEnumerator PlaceholderRendererStopsBgmWhenSessionCompletes()
        {
            var runnerObject = new GameObject("Stage1 PlayMode Result Runner");
            var runner = runnerObject.AddComponent<PlaceholderRendererBehaviour>();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            runner.DebugSeekBattleClockMs(999999999);
            yield return null;

            Assert.IsFalse(runner.DebugAudioIsPlaying);
            Assert.AreEqual("BGM stopped: result", runner.DebugAudioStatus);
            Assert.IsNotEmpty(runner.DebugResultScenarioLine);

            Object.Destroy(runnerObject);
        }

        [UnityTest]
        public IEnumerator PlaceholderRendererTogglesPause()
        {
            var runnerObject = new GameObject("Stage1 PlayMode Pause Runner");
            var runner = runnerObject.AddComponent<PlaceholderRendererBehaviour>();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            runner.DebugTogglePause();
            yield return null;
            Assert.IsTrue(runner.DebugPaused);

            runner.DebugTogglePause();
            yield return null;
            Assert.IsFalse(runner.DebugPaused);

            Object.Destroy(runnerObject);
        }

        [UnityTest]
        public IEnumerator PlaceholderRendererCanLoadFinalStagePack()
        {
            var runnerObject = new GameObject("Stage7 PlayMode Smoke Runner");
            var runner = runnerObject.AddComponent<PlaceholderRendererBehaviour>();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            runner.DebugLoadStageNumber(7);

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded && runner.DebugBgmFileExists) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            Assert.AreEqual("X結社本部", runner.DebugStageTitle);
            Assert.AreEqual("X結社本部", runner.DebugStageLocation);
            Assert.GreaterOrEqual(runner.DebugIntroLineCount, 1);
            Assert.IsTrue(runner.DebugBgmFileExists, runner.DebugAudioStatus);

            Object.Destroy(runnerObject);
        }

        [UnityTest]
        public IEnumerator PlaceholderRendererCanLoadStageThreeWithFractionalBgmLead()
        {
            var runnerObject = new GameObject("Stage3 PlayMode Smoke Runner");
            var runner = runnerObject.AddComponent<PlaceholderRendererBehaviour>();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            runner.DebugLoadStageNumber(3);

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded && runner.DebugBgmFileExists) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            Assert.AreEqual("伊藤道場", runner.DebugStageTitle);
            Assert.AreEqual("伊藤道場", runner.DebugStageLocation);
            Assert.GreaterOrEqual(runner.DebugIntroLineCount, 1);
            Assert.IsTrue(runner.DebugBgmFileExists, runner.DebugAudioStatus);

            Object.Destroy(runnerObject);
        }

        [UnityTest]
        public IEnumerator PlaceholderRendererAdvancesFromClearResultToNextStage()
        {
            var runnerObject = new GameObject("Stage Progression PlayMode Runner");
            var runner = runnerObject.AddComponent<PlaceholderRendererBehaviour>();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            Assert.AreEqual(1, runner.DebugStageNumber);

            runner.DebugCompleteStagePerfect();
            yield return null;

            Assert.IsTrue(runner.DebugCanAdvanceToNextStage);
            runner.DebugAdvanceToNextStage();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded && runner.DebugStageNumber == 2) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            Assert.AreEqual(2, runner.DebugStageNumber);
            Assert.AreEqual("港の倉庫", runner.DebugStageTitle);
            Assert.AreEqual("港の倉庫", runner.DebugStageLocation);
            Assert.GreaterOrEqual(runner.DebugIntroLineCount, 1);

            Object.Destroy(runnerObject);
        }

        [UnityTest]
        public IEnumerator PlaceholderRendererCanSaveAndLoadClearedStageProgress()
        {
            var runnerObject = new GameObject("Stage Save Load PlayMode Runner");
            var runner = runnerObject.AddComponent<PlaceholderRendererBehaviour>();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            Assert.AreEqual(1, runner.DebugStageNumber);
            Assert.IsNotEmpty(runner.DebugSaveDirectory, runner.DebugSaveStatus);
            var firstLoopSavePath = Path.Combine(runner.DebugSaveDirectory, "first-loop.jksave");
            if (File.Exists(firstLoopSavePath)) File.Delete(firstLoopSavePath);

            runner.DebugCompleteStagePerfect();
            yield return null;

            Assert.IsTrue(runner.DebugSaveCurrentRun(), runner.DebugSaveStatus);
            Assert.IsTrue(Directory.Exists(runner.DebugSaveDirectory), runner.DebugSaveDirectory);
            Assert.IsTrue(File.Exists(firstLoopSavePath), runner.DebugSaveStatus);
            Assert.Greater(new FileInfo(firstLoopSavePath).Length, 0);
            Assert.IsTrue(runner.DebugLoadCurrentRunSlot(), runner.DebugSaveStatus);

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded && runner.DebugStageNumber == 2) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            Assert.AreEqual(2, runner.DebugStageNumber);
            Assert.AreEqual(1, runner.DebugRunStageResultCount);
            if (File.Exists(firstLoopSavePath)) File.Delete(firstLoopSavePath);

            Object.Destroy(runnerObject);
        }

        [UnityTest]
        public IEnumerator PlaceholderRendererCanUseLoopPlusCharts()
        {
            var runnerObject = new GameObject("Loop Plus PlayMode Smoke Runner");
            var runner = runnerObject.AddComponent<PlaceholderRendererBehaviour>();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            runner.DebugSetDifficulty("hard");
            runner.DebugSetRunLoop(2);

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded && runner.DebugRunLoop == 2) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            Assert.AreEqual(2, runner.DebugRunLoop);
            Assert.AreEqual(208, runner.DebugTotalNotes);

            Object.Destroy(runnerObject);
        }

        [UnityTest]
        public IEnumerator PlaceholderRendererCanPerfectClearAllSevenStagesInOrder()
        {
            var runnerObject = new GameObject("All Stage Progression PlayMode Runner");
            var runner = runnerObject.AddComponent<PlaceholderRendererBehaviour>();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);

            for (var stageNumber = 1; stageNumber <= StagePackCatalog.Count; stageNumber += 1)
            {
                var expected = StagePackCatalog.GetByIndex(stageNumber - 1);
                Assert.AreEqual(stageNumber, runner.DebugStageNumber, "stage number before clear");
                Assert.AreEqual(expected.Title, runner.DebugStageTitle, "stage title before clear");
                Assert.AreEqual(expected.LocationName, runner.DebugStageLocation, "stage location before clear");
                Assert.GreaterOrEqual(runner.DebugIntroLineCount, 1, "intro lines before clear");

                runner.DebugCompleteStagePerfect();
                yield return null;

                Assert.IsNotEmpty(runner.DebugResultScenarioLine, "result scenario line after clear");
                Assert.AreEqual(stageNumber, runner.DebugRunStageResultCount, "stage result count after clear");

                if (stageNumber < StagePackCatalog.Count)
                {
                    Assert.IsTrue(runner.DebugCanAdvanceToNextStage, "can advance after clear");
                    runner.DebugAdvanceToNextStage();

                    for (var i = 0; i < 180; i += 1)
                    {
                        if (runner.DebugSessionLoaded && runner.DebugStageNumber == stageNumber + 1) break;
                        yield return null;
                    }

                    Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
                    Assert.AreEqual(stageNumber + 1, runner.DebugStageNumber, "stage number after advance");
                }
                else
                {
                    Assert.IsFalse(runner.DebugCanAdvanceToNextStage, "final stage should not advance");
                    Assert.IsTrue(runner.DebugCanStartEndingBonus, "final stage can hand off to ED bonus");
                }
            }

            Assert.Greater(runner.DebugRunStageTotalScore, 0);
            Assert.AreEqual("S", runner.DebugRunFinalRank);
            runner.DebugStartEndingBonus();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugEndingBonusLoaded) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugEndingBonusLoaded, runner.DebugError);
            Assert.AreEqual(7, runner.DebugRunStageResultCount, "stage results persist into ED bonus");

            Object.Destroy(runnerObject);
        }

        [UnityTest]
        public IEnumerator PlaceholderRendererStartsEndingBonusAfterFinalStage()
        {
            var runnerObject = new GameObject("Ending Bonus Progression PlayMode Runner");
            var runner = runnerObject.AddComponent<PlaceholderRendererBehaviour>();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugSessionLoaded, runner.DebugError);
            runner.DebugLoadStageNumber(7);

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugSessionLoaded && runner.DebugStageNumber == 7) break;
                yield return null;
            }

            runner.DebugCompleteStagePerfect();
            yield return null;

            Assert.IsTrue(runner.DebugCanStartEndingBonus);
            runner.DebugStartEndingBonus();

            for (var i = 0; i < 180; i += 1)
            {
                if (runner.DebugEndingBonusLoaded) break;
                yield return null;
            }

            Assert.IsTrue(runner.DebugEndingBonusLoaded, runner.DebugError);
            Assert.AreEqual("endingBonus", runner.DebugPrototypeMode);
            Assert.Greater(runner.DebugTotalNotes, 0);
            Assert.IsTrue(runner.DebugEndingVideoAssetExists, runner.DebugAudioStatus);

            runner.DebugCompleteEndingBonusPerfect();
            yield return null;

            Assert.Greater(runner.DebugEndingBonusScore, 0);

            Object.Destroy(runnerObject);
        }
    }
}
