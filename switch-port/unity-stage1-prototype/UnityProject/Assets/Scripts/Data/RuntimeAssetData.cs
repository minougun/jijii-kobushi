using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class RuntimeAssetManifest
    {
        public RuntimeAssetManifest()
        {
            GameId = "";
            ExportId = "";
            Source = new RuntimeAssetManifestSource();
            Notes = new List<string>();
            Assets = new List<RuntimeAssetEntry>();
        }

        public int SchemaVersion { get; set; }
        public string GameId { get; set; }
        public string ExportId { get; set; }
        public RuntimeAssetManifestSource Source { get; set; }
        public List<string> Notes { get; set; }
        public List<RuntimeAssetEntry> Assets { get; set; }
    }

    public sealed class RuntimeAssetManifestSource
    {
        public RuntimeAssetManifestSource()
        {
            WebUrl = "";
            LocalRepo = "";
            ScannedFiles = new List<string>();
        }

        public string WebUrl { get; set; }
        public string LocalRepo { get; set; }
        public List<string> ScannedFiles { get; set; }
    }

    public sealed class RuntimeAssetEntry
    {
        public RuntimeAssetEntry()
        {
            Path = "";
            Role = "";
            Kind = "";
            ImportHint = "";
            Codec = "";
            GitObjectId = "";
            References = new List<string>();
        }

        public string Path { get; set; }
        public string Role { get; set; }
        public string Kind { get; set; }
        public string ImportHint { get; set; }
        public string Codec { get; set; }
        public bool GitTracked { get; set; }
        public string GitObjectId { get; set; }
        public List<string> References { get; set; }
    }
}
