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
                if (args.Length > 0 && args[0] == "--all-stages")
                {
                    var stages = ProfileTestRunner.RunAllStageSmoke();
                    var profileResults = ProfileTestRunner.RunAllStageProfileParity();
                    var endingResults = ProfileTestRunner.RunEndingBonusProfileParity();
                    Console.WriteLine("Unity all-stage smoke: pass stages=" + stages.Count + " profileResults=" + profileResults.Count + " endingResults=" + endingResults.Count);
                    foreach (var stage in stages)
                    {
                        Console.WriteLine(
                            "stage " + (stage.Stage.Index + 1) +
                            " id=" + stage.Stage.Id +
                            " title=" + stage.Stage.Title +
                            " location=" + stage.Stage.LocationName +
                            " bgm=" + stage.Audio.Bgm.Track);
                    }

                    return 0;
                }

                if (args.Length > 0 && args[0] == "--ending")
                {
                    var endingResults = ProfileTestRunner.RunEndingBonusProfileParity();
                    Console.WriteLine("Unity ending bonus parity: pass profileResults=" + endingResults.Count);
                    return 0;
                }

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
