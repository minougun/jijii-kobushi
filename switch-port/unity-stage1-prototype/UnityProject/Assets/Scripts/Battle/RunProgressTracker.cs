using System;
using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class RunProgressTracker
    {
        private readonly List<StageRunSummary> stageResults = new List<StageRunSummary>();
        private string currentDifficulty = "";
        private int currentLoop;

        public int Count
        {
            get { return stageResults.Count; }
        }

        public IReadOnlyList<StageRunSummary> StageResults
        {
            get { return stageResults; }
        }

        public int TotalScore
        {
            get
            {
                var total = 0;
                for (var i = 0; i < stageResults.Count; i += 1)
                {
                    total += stageResults[i].Score;
                }

                return total;
            }
        }

        public int AverageScore
        {
            get
            {
                if (stageResults.Count == 0) return 0;
                return (int)Math.Floor(TotalScore / (double)stageResults.Count + 0.5);
            }
        }

        public string FinalRank
        {
            get { return BattleSimulator.RankScore(AverageScore); }
        }

        public void ResetIfNeeded(string difficulty, int loop, int stageIndex)
        {
            if (currentDifficulty == difficulty && currentLoop == loop && stageIndex != 0) return;

            stageResults.Clear();
            currentDifficulty = difficulty;
            currentLoop = loop;
        }

        public void Clear()
        {
            stageResults.Clear();
            currentDifficulty = "";
            currentLoop = 0;
        }

        public void Record(int stageNumber, string title, BattleRunResult result)
        {
            if (result == null) throw new ArgumentNullException("result");

            var summary = new StageRunSummary(
                stageNumber,
                title,
                result.Score,
                result.Rank,
                result.MaxCombo,
                result.NoteCount,
                result.Clear,
                result.Stats.Perfect,
                result.Stats.Good,
                result.Stats.Bad,
                result.Stats.Miss);

            for (var i = 0; i < stageResults.Count; i += 1)
            {
                if (stageResults[i].StageNumber != stageNumber) continue;
                stageResults[i] = summary;
                Sort();
                return;
            }

            stageResults.Add(summary);
            Sort();
        }

        public StageRunSummary Find(int stageNumber)
        {
            for (var i = 0; i < stageResults.Count; i += 1)
            {
                if (stageResults[i].StageNumber == stageNumber) return stageResults[i];
            }

            return null;
        }

        public static int Accuracy(StageRunSummary summary)
        {
            if (summary == null) return 0;
            var total = summary.Perfect + summary.Good + summary.Bad + summary.Miss;
            if (total <= 0) return 0;
            var weighted = summary.Perfect + summary.Good * 0.72 + summary.Bad * 0.34;
            return Math.Max(0, Math.Min(100, (int)Math.Floor((weighted / total) * 100.0 + 0.5)));
        }

        private void Sort()
        {
            stageResults.Sort((left, right) => left.StageNumber.CompareTo(right.StageNumber));
        }
    }

    public sealed class StageRunSummary
    {
        public StageRunSummary(
            int stageNumber,
            string title,
            int score,
            string rank,
            int maxCombo,
            int noteCount,
            bool clear,
            int perfect,
            int good,
            int bad,
            int miss)
        {
            StageNumber = stageNumber;
            Title = title ?? "";
            Score = score;
            Rank = rank ?? "";
            MaxCombo = maxCombo;
            NoteCount = noteCount;
            Clear = clear;
            Perfect = perfect;
            Good = good;
            Bad = bad;
            Miss = miss;
        }

        public int StageNumber { get; private set; }
        public string Title { get; private set; }
        public int Score { get; private set; }
        public string Rank { get; private set; }
        public int MaxCombo { get; private set; }
        public int NoteCount { get; private set; }
        public bool Clear { get; private set; }
        public int Perfect { get; private set; }
        public int Good { get; private set; }
        public int Bad { get; private set; }
        public int Miss { get; private set; }
    }
}
