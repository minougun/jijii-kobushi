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
            Assert.IsTrue(runner.DebugBgmFileExists, runner.DebugAudioStatus);

            Object.Destroy(runnerObject);
        }
    }
}
