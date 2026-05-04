using System;
using System.Collections.Generic;
using System.IO;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class RuntimeAssetCatalog
    {
        private readonly Dictionary<string, RuntimeAssetEntry> byPath;
        private readonly Dictionary<string, List<RuntimeAssetEntry>> byRole;

        public RuntimeAssetCatalog(RuntimeAssetManifest manifest, string repoRoot)
        {
            if (manifest == null) throw new ArgumentNullException("manifest");

            Manifest = manifest;
            RepoRoot = RuntimeAssetPathUtility.NormalizeRepoRoot(repoRoot);
            byPath = new Dictionary<string, RuntimeAssetEntry>();
            byRole = new Dictionary<string, List<RuntimeAssetEntry>>();

            foreach (var asset in manifest.Assets)
            {
                var normalizedPath = RuntimeAssetPathUtility.NormalizeAssetPath(asset.Path);
                byPath[normalizedPath] = asset;

                List<RuntimeAssetEntry> roleList;
                if (!byRole.TryGetValue(asset.Role, out roleList))
                {
                    roleList = new List<RuntimeAssetEntry>();
                    byRole[asset.Role] = roleList;
                }
                roleList.Add(asset);
            }
        }

        public RuntimeAssetManifest Manifest { get; private set; }
        public string RepoRoot { get; private set; }

        public static RuntimeAssetCatalog FromManifest(RuntimeAssetManifest manifest)
        {
            return new RuntimeAssetCatalog(manifest, manifest.Source.LocalRepo);
        }

        public bool TryGetByPath(string assetSrc, out RuntimeAssetEntry entry)
        {
            return byPath.TryGetValue(RuntimeAssetPathUtility.NormalizeAssetPath(assetSrc), out entry);
        }

        public RuntimeAssetEntry RequireByPath(string assetSrc)
        {
            RuntimeAssetEntry entry;
            if (TryGetByPath(assetSrc, out entry)) return entry;
            throw new KeyNotFoundException("Runtime asset is not listed in the manifest: " + assetSrc);
        }

        public List<RuntimeAssetEntry> GetByRole(string role)
        {
            List<RuntimeAssetEntry> entries;
            if (!byRole.TryGetValue(role, out entries)) return new List<RuntimeAssetEntry>();
            return new List<RuntimeAssetEntry>(entries);
        }

        public string ResolveLocalPath(string assetSrc)
        {
            var normalizedPath = RuntimeAssetPathUtility.NormalizeAssetPath(assetSrc);
            if (string.IsNullOrEmpty(normalizedPath) || string.IsNullOrEmpty(RepoRoot)) return "";

            var candidate = Path.Combine(RepoRoot, normalizedPath.Replace('/', Path.DirectorySeparatorChar));
            return File.Exists(candidate) ? candidate : "";
        }

        public string ResolveStreamingAssetsPath(string assetSrc, string streamingAssetsRoot)
        {
            return RuntimeAssetPathUtility.ResolveStreamingAssetsPath(assetSrc, streamingAssetsRoot);
        }

        public string GetStreamingAssetsRelativePath(string assetSrc)
        {
            return RuntimeAssetPathUtility.ToStreamingAssetsRelativePath(assetSrc);
        }
    }

    public static class RuntimeAssetPathUtility
    {
        public static string NormalizeAssetPath(string assetSrc)
        {
            if (string.IsNullOrEmpty(assetSrc)) return "";
            var normalized = assetSrc.Replace('\\', '/');
            if (normalized.StartsWith("./", StringComparison.Ordinal)) normalized = normalized.Substring(2);
            while (normalized.StartsWith("/", StringComparison.Ordinal)) normalized = normalized.Substring(1);
            return normalized;
        }

        public static string NormalizeRepoRoot(string repoRoot)
        {
            if (string.IsNullOrWhiteSpace(repoRoot)) return repoRoot;
            var normalized = repoRoot.Replace('\\', '/');
            if (normalized.StartsWith("/mnt/", StringComparison.Ordinal) && normalized.Length > 6 && normalized[6] == '/')
            {
                var drive = normalized[5];
                var rest = normalized.Substring(7).Replace('/', Path.DirectorySeparatorChar);
                return char.ToUpperInvariant(drive) + ":" + Path.DirectorySeparatorChar + rest;
            }

            return repoRoot;
        }

        public static string ToStreamingAssetsRelativePath(string assetSrc)
        {
            var normalized = NormalizeAssetPath(assetSrc);
            if (string.IsNullOrEmpty(normalized)) return "";
            return "JiiKobushi/" + normalized;
        }

        public static string ResolveStreamingAssetsPath(string assetSrc, string streamingAssetsRoot)
        {
            if (string.IsNullOrEmpty(streamingAssetsRoot)) return "";
            var relativePath = ToStreamingAssetsRelativePath(assetSrc);
            if (string.IsNullOrEmpty(relativePath)) return "";

            var candidate = Path.Combine(streamingAssetsRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
            return File.Exists(candidate) ? candidate : "";
        }
    }
}
