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
                if (args.Length == 1)
                {
                    var stage = StageJsonLoader.LoadStage(stageJson);
                    Console.WriteLine(
                        "Stage JSON load: pass " +
                        stage.Stage.Id +
                        " title=" + stage.Stage.Title +
                        " bgm=" + stage.Audio.Bgm.Track +
                        " lead=" + stage.Audio.Bgm.Lead +
                        " easyNotes=" + stage.Charts["easy"].Count +
                        " normalNotes=" + stage.Charts["normal"].Count +
                        " hardNotes=" + stage.Charts["hard"].Count);
                    return 0;
                }

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
