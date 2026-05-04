using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public static class StageRuntimeVisualAssets
    {
        private static readonly Dictionary<string, string> BackgroundByStageId = new Dictionary<string, string>
        {
            { "shotengai", "./assets/images/stage-bg-shotengai-v1.png" },
            { "warehouse", "./assets/images/stage-bg-warehouse-v1.png" },
            { "riverside", "./assets/images/stage-bg-riverside-v1.png" },
            { "mountain", "./assets/images/stage-bg-mountain-v1.png" },
            { "garage", "./assets/images/stage-bg-garage-v1.png" },
            { "redgate", "./assets/images/stage-bg-redgate-v1.png" },
            { "finalhideout", "./assets/images/stage-bg-finalhideout-v1.png" }
        };

        public static string GetBackgroundAssetPath(string stageId)
        {
            string path;
            return !string.IsNullOrEmpty(stageId) && BackgroundByStageId.TryGetValue(stageId, out path) ? path : "";
        }
    }
}
