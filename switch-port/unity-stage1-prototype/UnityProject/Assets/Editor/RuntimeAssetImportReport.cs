#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype.EditorTools
{
    public static class RuntimeAssetImportReport
    {
        [MenuItem("Jijii Kobushi/Write Runtime Asset Import Report")]
        public static void WriteRuntimeAssetImportReport()
        {
            var manifestPath = ProfileTestRunner.ResolveRuntimeAssetManifestPath("runtime-assets.json");
            var manifest = StageJsonLoader.LoadRuntimeAssetManifest(manifestPath);
            var repoRoot = string.IsNullOrWhiteSpace(manifest.Source.LocalRepo)
                ? ResolveRepoRoot()
                : manifest.Source.LocalRepo;
            var plan = RuntimeAssetImportPlanner.Build(manifest, repoRoot, true);
            var report = FormatReport(manifest, plan, manifestPath, repoRoot);

            var outputPath = GetCommandLineValue("-assetReportOutput");
            if (string.IsNullOrEmpty(outputPath))
            {
                outputPath = Path.Combine(ResolveSwitchPortRoot(), "unity-stage1-prototype", "runtime-asset-import-report.txt");
            }

            var fullPath = Path.GetFullPath(outputPath);
            var directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
            File.WriteAllText(fullPath, report, Encoding.UTF8);
            Debug.Log(report);

            if (plan.MissingGitTracked.Count > 0 || plan.IncompleteStageBackgroundPairs.Count > 0)
            {
                throw new InvalidOperationException("Runtime asset import report found blocking asset manifest gaps. See " + fullPath);
            }
        }

        private static string FormatReport(RuntimeAssetManifest manifest, RuntimeAssetImportPlan plan, string manifestPath, string repoRoot)
        {
            var status = plan.MissingGitTracked.Count == 0 && plan.IncompleteStageBackgroundPairs.Count == 0 ? "pass" : "fail";
            var builder = new StringBuilder();
            builder.AppendLine("Unity runtime asset import: " + status);
            builder.AppendLine("webUrl: " + manifest.Source.WebUrl);
            builder.AppendLine("localRepo: " + repoRoot);
            builder.AppendLine("manifest: " + manifestPath);
            builder.AppendLine("totalAssets: " + plan.TotalAssets);
            builder.AppendLine("kindCounts: " + FormatCounts(plan.KindCounts));
            builder.AppendLine("roleCounts: " + FormatCounts(plan.RoleCounts));
            builder.AppendLine("audioAssets: " + plan.AudioAssets.Count);
            AppendList(builder, "audio", plan.AudioAssets);
            builder.AppendLine("videoAssets: " + plan.VideoAssets.Count);
            AppendList(builder, "video", plan.VideoAssets);
            builder.AppendLine("fontAssets: " + plan.FontAssets.Count);
            AppendList(builder, "font", plan.FontAssets);
            builder.AppendLine("imageAssets: " + plan.ImageAssets.Count);
            builder.AppendLine("stageBackgroundPairs: " + plan.StageBackgrounds.Count);
            foreach (var pair in plan.StageBackgrounds)
            {
                builder.AppendLine("  - " + pair.StageKey + ": webp=" + pair.WebpPath + " png=" + pair.PngPath);
            }
            builder.AppendLine("missingGitTracked: " + plan.MissingGitTracked.Count);
            AppendList(builder, "missingGitTracked", plan.MissingGitTracked);
            builder.AppendLine("incompleteStageBackgroundPairs: " + plan.IncompleteStageBackgroundPairs.Count);
            AppendList(builder, "incompleteStageBackgroundPairs", plan.IncompleteStageBackgroundPairs);
            builder.AppendLine("missingLocalFiles: " + plan.MissingLocalFiles.Count);
            AppendList(builder, "missingLocalFiles", plan.MissingLocalFiles);
            builder.AppendLine("missingLocalFiles are warnings for local Switch-port work because Web image files may be skip-worktree locally.");
            return builder.ToString();
        }

        private static string FormatCounts(Dictionary<string, int> counts)
        {
            var keys = new List<string>(counts.Keys);
            keys.Sort(StringComparer.Ordinal);
            var parts = new List<string>();
            foreach (var key in keys)
            {
                parts.Add(key + "=" + counts[key]);
            }
            return string.Join(", ", parts.ToArray());
        }

        private static void AppendList(StringBuilder builder, string label, List<string> items)
        {
            foreach (var item in items)
            {
                builder.AppendLine("  - " + label + ": " + item);
            }
        }

        private static string ResolveRepoRoot()
        {
            var current = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (current != null)
            {
                if (Directory.Exists(Path.Combine(current.FullName, ".git"))) return current.FullName;
                current = current.Parent;
            }
            return Directory.GetCurrentDirectory();
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

        private static string GetCommandLineValue(string key)
        {
            var args = Environment.GetCommandLineArgs();
            for (var i = 0; i < args.Length - 1; i += 1)
            {
                if (args[i] == key) return args[i + 1];
            }

            return "";
        }
    }
}
#endif
