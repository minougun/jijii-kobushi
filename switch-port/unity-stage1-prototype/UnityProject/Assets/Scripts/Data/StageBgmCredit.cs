namespace JijiiKobushi.Stage1Prototype
{
    public static class StageBgmCredit
    {
        public const string Provider = "PeriTune";

        public static string ForStage(StageExport stage)
        {
            if (stage == null || stage.Audio == null || stage.Audio.Bgm == null || string.IsNullOrEmpty(stage.Audio.Bgm.AssetSrc)) return "";
            return "Music: " + Provider;
        }
    }
}
