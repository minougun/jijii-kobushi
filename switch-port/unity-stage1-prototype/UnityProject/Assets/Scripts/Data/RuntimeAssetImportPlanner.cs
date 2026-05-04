using System;
using System.Collections.Generic;
using System.IO;

namespace JijiiKobushi.Stage1Prototype
{
    public static class RuntimeAssetImportPlanner
    {
        public static RuntimeAssetImportPlan Build(RuntimeAssetManifest manifest, string repoRoot, bool checkLocalFiles)
        {
            if (manifest == null) throw new ArgumentNullException("manifest");

            var plan = new RuntimeAssetImportPlan
            {
                TotalAssets = manifest.Assets.Count
            };

            var backgroundBases = new Dictionary<string, RuntimeStageBackgroundPair>();
            foreach (var asset in manifest.Assets)
            {
                if (!asset.GitTracked) plan.MissingGitTracked.Add(asset.Path);
                if (checkLocalFiles && !File.Exists(Path.Combine(repoRoot, asset.Path.Replace('/', Path.DirectorySeparatorChar))))
                {
                    plan.MissingLocalFiles.Add(asset.Path);
                }

                Increment(plan.KindCounts, asset.Kind);
                Increment(plan.RoleCounts, asset.Role);

                if (asset.Kind == "audio") plan.AudioAssets.Add(asset.Path);
                else if (asset.Kind == "video") plan.VideoAssets.Add(asset.Path);
                else if (asset.Kind == "font") plan.FontAssets.Add(asset.Path);
                else if (asset.Kind == "raster-image" || asset.Kind == "vector-image") plan.ImageAssets.Add(asset.Path);

                if (asset.Role == "stage-background")
                {
                    AddStageBackground(backgroundBases, asset.Path);
                }
            }

            foreach (var pair in backgroundBases.Values)
            {
                plan.StageBackgrounds.Add(pair);
                if (string.IsNullOrEmpty(pair.WebpPath) || string.IsNullOrEmpty(pair.PngPath))
                {
                    plan.IncompleteStageBackgroundPairs.Add(pair.StageKey);
                }
            }

            plan.StageBackgrounds.Sort((left, right) => string.CompareOrdinal(left.StageKey, right.StageKey));
            plan.AudioAssets.Sort(StringComparer.Ordinal);
            plan.VideoAssets.Sort(StringComparer.Ordinal);
            plan.FontAssets.Sort(StringComparer.Ordinal);
            plan.ImageAssets.Sort(StringComparer.Ordinal);
            plan.MissingGitTracked.Sort(StringComparer.Ordinal);
            plan.MissingLocalFiles.Sort(StringComparer.Ordinal);
            plan.IncompleteStageBackgroundPairs.Sort(StringComparer.Ordinal);
            return plan;
        }

        private static void Increment(Dictionary<string, int> counts, string key)
        {
            if (string.IsNullOrEmpty(key)) key = "unknown";
            counts[key] = counts.ContainsKey(key) ? counts[key] + 1 : 1;
        }

        private static void AddStageBackground(Dictionary<string, RuntimeStageBackgroundPair> pairs, string assetPath)
        {
            var fileName = Path.GetFileNameWithoutExtension(assetPath);
            const string prefix = "stage-bg-";
            const string suffix = "-v1";
            if (!fileName.StartsWith(prefix, StringComparison.Ordinal)) return;

            var stageKey = fileName.Substring(prefix.Length);
            if (stageKey.EndsWith(suffix, StringComparison.Ordinal))
            {
                stageKey = stageKey.Substring(0, stageKey.Length - suffix.Length);
            }

            RuntimeStageBackgroundPair pair;
            if (!pairs.TryGetValue(stageKey, out pair))
            {
                pair = new RuntimeStageBackgroundPair { StageKey = stageKey };
                pairs[stageKey] = pair;
            }

            var ext = Path.GetExtension(assetPath).ToLowerInvariant();
            if (ext == ".webp") pair.WebpPath = assetPath;
            else if (ext == ".png") pair.PngPath = assetPath;
        }
    }

    public sealed class RuntimeAssetImportPlan
    {
        public RuntimeAssetImportPlan()
        {
            KindCounts = new Dictionary<string, int>();
            RoleCounts = new Dictionary<string, int>();
            AudioAssets = new List<string>();
            VideoAssets = new List<string>();
            FontAssets = new List<string>();
            ImageAssets = new List<string>();
            StageBackgrounds = new List<RuntimeStageBackgroundPair>();
            MissingGitTracked = new List<string>();
            MissingLocalFiles = new List<string>();
            IncompleteStageBackgroundPairs = new List<string>();
        }

        public int TotalAssets { get; set; }
        public Dictionary<string, int> KindCounts { get; private set; }
        public Dictionary<string, int> RoleCounts { get; private set; }
        public List<string> AudioAssets { get; private set; }
        public List<string> VideoAssets { get; private set; }
        public List<string> FontAssets { get; private set; }
        public List<string> ImageAssets { get; private set; }
        public List<RuntimeStageBackgroundPair> StageBackgrounds { get; private set; }
        public List<string> MissingGitTracked { get; private set; }
        public List<string> MissingLocalFiles { get; private set; }
        public List<string> IncompleteStageBackgroundPairs { get; private set; }
    }

    public sealed class RuntimeStageBackgroundPair
    {
        public RuntimeStageBackgroundPair()
        {
            StageKey = "";
            WebpPath = "";
            PngPath = "";
        }

        public string StageKey { get; set; }
        public string WebpPath { get; set; }
        public string PngPath { get; set; }
    }
}
