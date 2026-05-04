using System.Collections;
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
    }
}
