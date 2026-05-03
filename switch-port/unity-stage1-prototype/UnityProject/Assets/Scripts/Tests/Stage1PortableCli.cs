#if !UNITY_5_3_OR_NEWER
using System;

namespace JijiiKobushi.Stage1Prototype
{
    public static class Stage1PortableCli
    {
        public static int Main(string[] args)
        {
            try
            {
                var stageJson = args.Length > 0 ? args[0] : ProfileTestRunner.ResolveStagePackPath("shotengai.stage.json");
                var expectedJson = args.Length > 1 ? args[1] : ProfileTestRunner.ResolveStagePackPath("expected-results.json");
                Console.WriteLine(ProfileTestRunner.RunAllAndFormatReport(stageJson, expectedJson));
                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return 1;
            }
        }
    }
}
#endif
