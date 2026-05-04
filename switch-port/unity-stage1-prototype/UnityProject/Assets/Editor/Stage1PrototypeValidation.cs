#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype.EditorTools
{
    public static class Stage1PrototypeValidation
    {
        [MenuItem("Jijii Kobushi/Run Portable Parity Checks")]
        public static void RunPortableParityChecks()
        {
            var stages = ProfileTestRunner.RunAllStageSmoke();
            var stageProfiles = ProfileTestRunner.RunAllStageProfileParity();
            var endingProfiles = ProfileTestRunner.RunEndingBonusProfileParity();

            var report =
                "Unity portable parity: pass" + Environment.NewLine +
                "stages=" + stages.Count + Environment.NewLine +
                "stageProfileResults=" + stageProfiles.Count + Environment.NewLine +
                "endingProfileResults=" + endingProfiles.Count + Environment.NewLine;

            var outputPath = GetCommandLineValue("-validationOutput");
            if (!string.IsNullOrEmpty(outputPath))
            {
                var fullPath = Path.GetFullPath(outputPath);
                var directory = Path.GetDirectoryName(fullPath);
                if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
                File.WriteAllText(fullPath, report);
            }

            Debug.Log(report);
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
