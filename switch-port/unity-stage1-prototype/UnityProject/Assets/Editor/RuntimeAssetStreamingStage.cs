#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype.EditorTools
{
    public static class RuntimeAssetStreamingStage
    {
        [MenuItem("Jijii Kobushi/Stage Runtime Assets To StreamingAssets")]
        public static void StageRuntimeAssetsToStreamingAssets()
        {
            var manifestPath = ProfileTestRunner.ResolveRuntimeAssetManifestPath("runtime-assets.json");
            var manifest = StageJsonLoader.LoadRuntimeAssetManifest(manifestPath);
            var catalog = RuntimeAssetCatalog.FromManifest(manifest);
            var plan = RuntimeAssetImportPlanner.Build(manifest, manifest.Source.LocalRepo, true);
            var streamingRoot = Path.Combine(Application.dataPath, "StreamingAssets");
            var dryRun = HasCommandLineFlag("-assetStageDryRun");
            var result = StageAvailableAssets(manifest, catalog, streamingRoot, dryRun);
            var report = FormatReport(manifest, plan, result, manifestPath, streamingRoot, dryRun);

            var outputPath = GetCommandLineValue("-assetStageOutput");
            if (string.IsNullOrEmpty(outputPath))
            {
                outputPath = Path.Combine(ResolveSwitchPortRoot(), "unity-stage1-prototype", "runtime-asset-stage-report.txt");
            }

            var fullPath = Path.GetFullPath(outputPath);
            var directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            File.WriteAllText(fullPath, report, Encoding.UTF8);
            Debug.Log(report);

            if (!dryRun) AssetDatabase.Refresh();

            if (plan.MissingGitTracked.Count > 0 || plan.IncompleteStageBackgroundPairs.Count > 0 || result.FailedCopies.Count > 0)
            {
                throw new InvalidOperationException("Runtime asset staging found blocking manifest gaps. See " + fullPath);
            }
        }

        private static RuntimeAssetStageResult StageAvailableAssets(RuntimeAssetManifest manifest, RuntimeAssetCatalog catalog, string streamingRoot, bool dryRun)
        {
            var result = new RuntimeAssetStageResult();
            foreach (var asset in manifest.Assets)
            {
                var sourcePath = catalog.ResolveLocalPath(asset.Path);
                var relativePath = catalog.GetStreamingAssetsRelativePath(asset.Path);
                if (string.IsNullOrEmpty(sourcePath))
                {
                    result.MissingLocalFiles.Add(asset.Path);
                    continue;
                }

                var destinationPath = Path.Combine(streamingRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
                var destinationDirectory = Path.GetDirectoryName(destinationPath);
                if (string.IsNullOrEmpty(destinationDirectory))
                {
                    result.FailedCopies.Add(asset.Path + " -> unresolved destination");
                    continue;
                }

                if (!dryRun)
                {
                    Directory.CreateDirectory(destinationDirectory);
                    if (File.Exists(destinationPath) && new FileInfo(sourcePath).Length == new FileInfo(destinationPath).Length)
                    {
                        result.StagedFiles.Add(relativePath);
                        continue;
                    }
                    File.Copy(sourcePath, destinationPath, true);
                }

                result.StagedFiles.Add(relativePath);
            }

            result.StagedFiles.Sort(StringComparer.Ordinal);
            result.MissingLocalFiles.Sort(StringComparer.Ordinal);
            result.FailedCopies.Sort(StringComparer.Ordinal);
            return result;
        }

        private static string FormatReport(RuntimeAssetManifest manifest, RuntimeAssetImportPlan plan, RuntimeAssetStageResult result, string manifestPath, string streamingRoot, bool dryRun)
        {
            var status = plan.MissingGitTracked.Count == 0 && plan.IncompleteStageBackgroundPairs.Count == 0 && result.FailedCopies.Count == 0 ? "pass" : "fail";
            var builder = new StringBuilder();
            builder.AppendLine("Unity runtime asset staging: " + status);
            builder.AppendLine("dryRun: " + dryRun);
            builder.AppendLine("webUrl: " + manifest.Source.WebUrl);
            builder.AppendLine("manifest: " + manifestPath);
            builder.AppendLine("streamingRoot: " + streamingRoot);
            builder.AppendLine("totalAssets: " + manifest.Assets.Count);
            builder.AppendLine("stagedFiles: " + result.StagedFiles.Count);
            AppendList(builder, "staged", result.StagedFiles);
            builder.AppendLine("missingGitTracked: " + plan.MissingGitTracked.Count);
            AppendList(builder, "missingGitTracked", plan.MissingGitTracked);
            builder.AppendLine("incompleteStageBackgroundPairs: " + plan.IncompleteStageBackgroundPairs.Count);
            AppendList(builder, "incompleteStageBackgroundPairs", plan.IncompleteStageBackgroundPairs);
            builder.AppendLine("missingLocalFiles: " + result.MissingLocalFiles.Count);
            AppendList(builder, "missingLocalFiles", result.MissingLocalFiles);
            builder.AppendLine("failedCopies: " + result.FailedCopies.Count);
            AppendList(builder, "failedCopies", result.FailedCopies);
            return builder.ToString();
        }

        private static void AppendList(StringBuilder builder, string label, List<string> items)
        {
            foreach (var item in items)
            {
                builder.AppendLine("  - " + label + ": " + item);
            }
        }

        private static string ResolveSwitchPortRoot()
        {
            var current = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (current != null)
            {
                var candidate = Path.Combine(current.FullName, "switch-port");
                if (Directory.Exists(candidate)) return candidate;

                if (current.Name == "switch-port") return current.FullName;
                current = current.Parent;
            }
            return Directory.GetCurrentDirectory();
        }

        private static bool HasCommandLineFlag(string flag)
        {
            var args = Environment.GetCommandLineArgs();
            for (var i = 0; i < args.Length; i += 1)
            {
                if (args[i] == flag) return true;
            }

            return false;
        }

        private static string GetCommandLineValue(string key)
        {
            var args = Environment.GetCommandLineArgs();
            for (var i = 0; i < args.Length - 1; i += 1)
            {
                if (args[i] == key) return args[i + 1];
            }

            return "";
        }

        private sealed class RuntimeAssetStageResult
        {
            public RuntimeAssetStageResult()
            {
                StagedFiles = new List<string>();
                MissingLocalFiles = new List<string>();
                FailedCopies = new List<string>();
            }

            public List<string> StagedFiles { get; private set; }
            public List<string> MissingLocalFiles { get; private set; }
            public List<string> FailedCopies { get; private set; }
        }
    }
}
#endif
