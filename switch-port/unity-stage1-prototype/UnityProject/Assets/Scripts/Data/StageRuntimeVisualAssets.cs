namespace JijiiKobushi.Stage1Prototype
{
    public static class StageRuntimeVisualAssets
    {
        public static string GetBackgroundAssetPath(string stageId)
        {
            if (!StagePackCatalog.ContainsStageId(stageId)) return "";
            return "./assets/images/stage-bg-" + stageId + "-v1.png";
        }
    }
}
