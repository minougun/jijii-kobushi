using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class Stage1PrototypePlayModeSmokeTests
    {
        private static readonly string[] ExpectedStageTitles =
        {
            "誘拐の朝",
            "声を失う倉庫",
            "内部破壊の稽古",
            "鉄仮面の追跡",
            "狂う拍と音響兵",
            "赤門をこじ開けろ",
            "白馬の正体"
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
            Assert.AreEqual("白馬の正体", runner.DebugStageTitle);
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
            Assert.AreEqual("内部破壊の稽古", runner.DebugStageTitle);
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
            Assert.AreEqual("声を失う倉庫", runner.DebugStageTitle);
            Assert.AreEqual("港の倉庫", runner.DebugStageLocation);
            Assert.GreaterOrEqual(runner.DebugIntroLineCount, 1);

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

            for (var stageNumber = 1; stageNumber <= ExpectedStageTitles.Length; stageNumber += 1)
            {
                Assert.AreEqual(stageNumber, runner.DebugStageNumber, "stage number before clear");
                Assert.AreEqual(ExpectedStageTitles[stageNumber - 1], runner.DebugStageTitle, "stage title before clear");
                Assert.AreEqual(ExpectedStageLocations[stageNumber - 1], runner.DebugStageLocation, "stage location before clear");
                Assert.GreaterOrEqual(runner.DebugIntroLineCount, 1, "intro lines before clear");

                runner.DebugCompleteStagePerfect();
                yield return null;

                Assert.IsNotEmpty(runner.DebugResultScenarioLine, "result scenario line after clear");

                if (stageNumber < ExpectedStageTitles.Length)
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
                }
            }

            Object.Destroy(runnerObject);
        }
    }
}
