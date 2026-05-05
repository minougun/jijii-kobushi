using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace JijiiKobushi.Stage1Prototype
{
    public enum RunSaveSlot
    {
        FirstLoop,
        LoopPlus
    }

    public sealed class RunSaveSnapshot
    {
        public RunSaveSnapshot()
        {
            Difficulty = "";
            StageResults = new List<StageRunSummary>();
        }

        public int Version { get; set; }
        public RunSaveSlot Slot { get; set; }
        public string Difficulty { get; set; }
        public int RunLoop { get; set; }
        public int StageNumber { get; set; }
        public int Hp { get; set; }
        public int MaxHp { get; set; }
        public int Spirit { get; set; }
        public int TotalScore { get; set; }
        public List<StageRunSummary> StageResults { get; set; }
    }

    public interface IRunSaveStore
    {
        void Save(RunSaveSnapshot snapshot);
        bool TryLoad(RunSaveSlot slot, out RunSaveSnapshot snapshot);
    }

    public sealed class MemoryRunSaveStore : IRunSaveStore
    {
        private readonly Dictionary<RunSaveSlot, RunSaveSnapshot> snapshots = new Dictionary<RunSaveSlot, RunSaveSnapshot>();

        public void Save(RunSaveSnapshot snapshot)
        {
            if (snapshot == null) throw new ArgumentNullException("snapshot");
            snapshots[snapshot.Slot] = snapshot;
        }

        public bool TryLoad(RunSaveSlot slot, out RunSaveSnapshot snapshot)
        {
            return snapshots.TryGetValue(slot, out snapshot);
        }
    }

    public sealed class FileRunSaveStore : IRunSaveStore
    {
        private readonly string directoryPath;

        public FileRunSaveStore(string directoryPath)
        {
            if (string.IsNullOrWhiteSpace(directoryPath)) throw new ArgumentException("Save directory is required.", "directoryPath");
            this.directoryPath = directoryPath;
        }

        public void Save(RunSaveSnapshot snapshot)
        {
            if (snapshot == null) throw new ArgumentNullException("snapshot");
            Directory.CreateDirectory(directoryPath);
            File.WriteAllText(PathForSlot(snapshot.Slot), RunSaveCodec.Encode(snapshot), Encoding.UTF8);
        }

        public bool TryLoad(RunSaveSlot slot, out RunSaveSnapshot snapshot)
        {
            var path = PathForSlot(slot);
            if (!File.Exists(path))
            {
                snapshot = null;
                return false;
            }

            snapshot = RunSaveCodec.Decode(File.ReadAllText(path, Encoding.UTF8));
            return snapshot.Slot == slot;
        }

        private string PathForSlot(RunSaveSlot slot)
        {
            return Path.Combine(directoryPath, slot == RunSaveSlot.FirstLoop ? "first-loop.jksave" : "loop-plus.jksave");
        }
    }

    public static class RunSaveCodec
    {
        private const string Header = "JII_KOBUSHI_RUN_SAVE_V1";

        public static string Encode(RunSaveSnapshot snapshot)
        {
            if (snapshot == null) throw new ArgumentNullException("snapshot");
            var builder = new StringBuilder();
            builder.AppendLine(Header);
            Append(builder, "version", snapshot.Version);
            Append(builder, "slot", snapshot.Slot.ToString());
            Append(builder, "difficulty", snapshot.Difficulty);
            Append(builder, "runLoop", snapshot.RunLoop);
            Append(builder, "stageNumber", snapshot.StageNumber);
            Append(builder, "hp", snapshot.Hp);
            Append(builder, "maxHp", snapshot.MaxHp);
            Append(builder, "spirit", snapshot.Spirit);
            Append(builder, "totalScore", snapshot.TotalScore);

            var results = snapshot.StageResults ?? new List<StageRunSummary>();
            Append(builder, "stageResultCount", results.Count);
            for (var i = 0; i < results.Count; i += 1)
            {
                var result = results[i];
                if (result == null) continue;
                builder.Append("stageResult=");
                builder.Append(result.StageNumber.ToString(CultureInfo.InvariantCulture));
                builder.Append('|');
                builder.Append(EncodeText(result.Title));
                builder.Append('|');
                builder.Append(result.Score.ToString(CultureInfo.InvariantCulture));
                builder.Append('|');
                builder.Append(EncodeText(result.Rank));
                builder.Append('|');
                builder.Append(result.MaxCombo.ToString(CultureInfo.InvariantCulture));
                builder.Append('|');
                builder.Append(result.NoteCount.ToString(CultureInfo.InvariantCulture));
                builder.Append('|');
                builder.Append(result.Clear ? "1" : "0");
                builder.Append('|');
                builder.Append(result.Perfect.ToString(CultureInfo.InvariantCulture));
                builder.Append('|');
                builder.Append(result.Good.ToString(CultureInfo.InvariantCulture));
                builder.Append('|');
                builder.Append(result.Bad.ToString(CultureInfo.InvariantCulture));
                builder.Append('|');
                builder.AppendLine(result.Miss.ToString(CultureInfo.InvariantCulture));
            }

            return builder.ToString();
        }

        public static RunSaveSnapshot Decode(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) throw new ArgumentException("Save data is empty.", "text");
            var lines = text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
            if (lines.Length == 0 || lines[0] != Header)
            {
                throw new InvalidDataException("Unsupported run save header.");
            }

            var snapshot = new RunSaveSnapshot();
            var stageResults = new List<StageRunSummary>();
            for (var i = 1; i < lines.Length; i += 1)
            {
                var line = lines[i];
                if (string.IsNullOrWhiteSpace(line)) continue;
                var equals = line.IndexOf('=');
                if (equals <= 0) throw new InvalidDataException("Malformed run save line: " + line);
                var key = line.Substring(0, equals);
                var value = line.Substring(equals + 1);

                if (key == "version") snapshot.Version = ParseInt(value, key);
                else if (key == "slot") snapshot.Slot = ParseSlot(value);
                else if (key == "difficulty") snapshot.Difficulty = value;
                else if (key == "runLoop") snapshot.RunLoop = ParseInt(value, key);
                else if (key == "stageNumber") snapshot.StageNumber = ParseInt(value, key);
                else if (key == "hp") snapshot.Hp = ParseInt(value, key);
                else if (key == "maxHp") snapshot.MaxHp = ParseInt(value, key);
                else if (key == "spirit") snapshot.Spirit = ParseInt(value, key);
                else if (key == "totalScore") snapshot.TotalScore = ParseInt(value, key);
                else if (key == "stageResult") stageResults.Add(ParseStageResult(value));
            }

            if (snapshot.Version != 1) throw new InvalidDataException("Unsupported run save version: " + snapshot.Version);
            snapshot.StageResults = stageResults;
            return snapshot;
        }

        private static void Append(StringBuilder builder, string key, object value)
        {
            builder.Append(key);
            builder.Append('=');
            builder.AppendLine(Convert.ToString(value, CultureInfo.InvariantCulture));
        }

        private static StageRunSummary ParseStageResult(string value)
        {
            var parts = value.Split('|');
            if (parts.Length != 11) throw new InvalidDataException("Malformed stage result row.");
            return new StageRunSummary(
                ParseInt(parts[0], "stageNumber"),
                DecodeText(parts[1]),
                ParseInt(parts[2], "score"),
                DecodeText(parts[3]),
                ParseInt(parts[4], "maxCombo"),
                ParseInt(parts[5], "noteCount"),
                parts[6] == "1",
                ParseInt(parts[7], "perfect"),
                ParseInt(parts[8], "good"),
                ParseInt(parts[9], "bad"),
                ParseInt(parts[10], "miss"));
        }

        private static RunSaveSlot ParseSlot(string value)
        {
            if (value == RunSaveSlot.FirstLoop.ToString()) return RunSaveSlot.FirstLoop;
            if (value == RunSaveSlot.LoopPlus.ToString()) return RunSaveSlot.LoopPlus;
            throw new InvalidDataException("Unsupported run save slot: " + value);
        }

        private static int ParseInt(string value, string key)
        {
            int parsed;
            if (!int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out parsed))
            {
                throw new InvalidDataException("Invalid integer for " + key + ": " + value);
            }

            return parsed;
        }

        private static string EncodeText(string value)
        {
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(value ?? ""));
        }

        private static string DecodeText(string value)
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(value));
        }
    }

    public static class RunSaveService
    {
        public static RunSaveSlot SlotForLoop(int runLoop)
        {
            return runLoop <= 1 ? RunSaveSlot.FirstLoop : RunSaveSlot.LoopPlus;
        }

        public static RunSaveSnapshot CreateStageSnapshot(
            string difficulty,
            int runLoop,
            int stageNumber,
            int stageCount,
            InteractiveBattleSession session,
            RunProgressTracker progress)
        {
            if (session == null) throw new ArgumentNullException("session");
            if (progress == null) throw new ArgumentNullException("progress");

            var maxHp = session.MaxHp;
            var defeated = session.IsFailed;
            var cleared = session.IsCleared;
            var completesRun = cleared && stageNumber >= stageCount;
            var snapshotLoop = completesRun ? Math.Max(1, runLoop) + 1 : Math.Max(1, runLoop);
            var snapshotStageNumber = completesRun ? 1 : cleared ? ClampStage(stageNumber + 1, stageCount) : ClampStage(stageNumber, stageCount);
            var hp = defeated || completesRun ? maxHp : Math.Max(1, Math.Min(maxHp, session.RemainingHp));

            return new RunSaveSnapshot
            {
                Version = 1,
                Slot = SlotForLoop(snapshotLoop),
                Difficulty = NormalizeDifficulty(difficulty),
                RunLoop = snapshotLoop,
                StageNumber = snapshotStageNumber,
                Hp = hp,
                MaxHp = maxHp,
                Spirit = 0,
                TotalScore = completesRun ? 0 : progress.TotalScore,
                StageResults = completesRun ? new List<StageRunSummary>() : CopyStageResults(progress)
            };
        }

        public static void RestoreProgress(RunSaveSnapshot snapshot, RunProgressTracker progress)
        {
            if (snapshot == null) throw new ArgumentNullException("snapshot");
            if (progress == null) throw new ArgumentNullException("progress");
            progress.Restore(NormalizeDifficulty(snapshot.Difficulty), Math.Max(1, snapshot.RunLoop), snapshot.StageResults);
        }

        public static RunSaveSnapshot CreateNextLoopSnapshot(string difficulty, int completedRunLoop, int maxHp)
        {
            var nextLoop = Math.Max(1, completedRunLoop) + 1;
            var safeMaxHp = Math.Max(1, maxHp);
            return new RunSaveSnapshot
            {
                Version = 1,
                Slot = SlotForLoop(nextLoop),
                Difficulty = NormalizeDifficulty(difficulty),
                RunLoop = nextLoop,
                StageNumber = 1,
                Hp = safeMaxHp,
                MaxHp = safeMaxHp,
                Spirit = 0,
                TotalScore = 0,
                StageResults = new List<StageRunSummary>()
            };
        }

        private static List<StageRunSummary> CopyStageResults(RunProgressTracker progress)
        {
            var copy = new List<StageRunSummary>();
            var source = progress.StageResults;
            for (var i = 0; i < source.Count; i += 1)
            {
                copy.Add(source[i]);
            }

            return copy;
        }

        private static int ClampStage(int stageNumber, int stageCount)
        {
            if (stageCount <= 0) return 1;
            return Math.Max(1, Math.Min(stageCount, stageNumber));
        }

        private static string NormalizeDifficulty(string difficulty)
        {
            if (difficulty == "easy" || difficulty == "hard") return difficulty;
            return "normal";
        }
    }
}
