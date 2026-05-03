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
    }
}
