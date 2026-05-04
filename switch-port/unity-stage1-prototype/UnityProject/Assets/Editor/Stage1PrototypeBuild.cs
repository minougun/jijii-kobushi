#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype.EditorTools
{
    public static class Stage1PrototypeBuild
    {
        private const string ScenePath = "Assets/Scenes/Stage1Prototype.unity";
        private const string DefaultOutputPath = "Builds/Windows/Stage1Prototype.exe";

        [MenuItem("Jijii Kobushi/Build Windows Prototype")]
        public static void BuildWindowsPrototypeMenu()
        {
            BuildWindowsPrototype();
        }

        public static void BuildWindowsPrototype()
        {
            Stage1PrototypeSceneSetup.EnsureSceneVisible();

            var outputPath = GetCommandLineValue("-buildOutput");
            if (string.IsNullOrEmpty(outputPath)) outputPath = DefaultOutputPath;

            var fullOutputPath = Path.GetFullPath(outputPath);
            var outputDirectory = Path.GetDirectoryName(fullOutputPath);
            if (string.IsNullOrEmpty(outputDirectory))
            {
                throw new InvalidOperationException("Build output directory could not be resolved: " + outputPath);
            }

            Directory.CreateDirectory(outputDirectory);

            BuildReport report = null;
            try
            {
                report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
                {
                    scenes = new[] { ScenePath },
                    locationPathName = fullOutputPath,
                    target = BuildTarget.StandaloneWindows64,
                    options = BuildOptions.None
                });
            }
            finally
            {
                PlayerSettings.runInBackground = false;
                AssetDatabase.SaveAssets();
            }

            var summary = report.summary;
            if (summary.result != BuildResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Windows prototype build failed: result=" + summary.result +
                    " errors=" + summary.totalErrors +
                    " warnings=" + summary.totalWarnings);
            }

            Debug.Log(
                "Windows prototype build succeeded: " + fullOutputPath +
                " size=" + summary.totalSize +
                " warnings=" + summary.totalWarnings);
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
