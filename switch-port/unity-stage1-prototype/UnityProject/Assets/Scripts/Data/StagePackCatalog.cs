using System;

namespace JijiiKobushi.Stage1Prototype
{
    public static class StagePackCatalog
    {
        public static readonly StagePackEntry[] Entries =
        {
            new StagePackEntry("stage01-shotengai.stage.json", "shotengai", "誘拐の朝", "うさぎ公園"),
            new StagePackEntry("stage02-warehouse.stage.json", "warehouse", "港の倉庫", "港の倉庫"),
            new StagePackEntry("stage03-riverside.stage.json", "riverside", "伊藤道場", "伊藤道場"),
            new StagePackEntry("stage04-mountain.stage.json", "mountain", "峠道", "峠道"),
            new StagePackEntry("stage05-garage.stage.json", "garage", "改造車庫", "改造車庫"),
            new StagePackEntry("stage06-redgate.stage.json", "redgate", "赤門", "赤門"),
            new StagePackEntry("stage07-finalhideout.stage.json", "finalhideout", "X結社本部", "X結社本部")
        };

        public static int Count
        {
            get { return Entries.Length; }
        }

        public static StagePackEntry GetByIndex(int index)
        {
            if (index < 0 || index >= Entries.Length)
            {
                throw new ArgumentOutOfRangeException("index", "stage index out of range: " + index);
            }

            return Entries[index];
        }

        public static string GetFileNameByIndex(int index)
        {
            return GetByIndex(index).FileName;
        }

        public static bool ContainsStageId(string stageId)
        {
            return FindById(stageId) != null;
        }

        public static StagePackEntry FindById(string stageId)
        {
            if (string.IsNullOrEmpty(stageId)) return null;
            for (var i = 0; i < Entries.Length; i += 1)
            {
                if (string.Equals(Entries[i].Id, stageId, StringComparison.Ordinal)) return Entries[i];
            }

            return null;
        }

        public static int ClampStageNumber(int stageNumber)
        {
            if (stageNumber < 1) return 1;
            if (stageNumber > Entries.Length) return Entries.Length;
            return stageNumber;
        }

        public static string[] FileNames()
        {
            var files = new string[Entries.Length];
            for (var i = 0; i < Entries.Length; i += 1)
            {
                files[i] = Entries[i].FileName;
            }

            return files;
        }
    }

    public sealed class StagePackEntry
    {
        public StagePackEntry(string fileName, string id, string title, string locationName)
        {
            FileName = fileName;
            Id = id;
            Title = title;
            LocationName = locationName;
        }

        public string FileName { get; private set; }
        public string Id { get; private set; }
        public string Title { get; private set; }
        public string LocationName { get; private set; }
    }
}
