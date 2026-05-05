using System;
using System.Collections.Generic;

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
