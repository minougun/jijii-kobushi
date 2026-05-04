using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class EndingBonusExport
    {
        public EndingBonusExport()
        {
            GameId = "";
            ExportId = "";
            Ending = new EndingBonusMeta();
            Rhythm = new RhythmData();
            Loops = new Dictionary<string, EndingBonusLoopData>();
        }

        public int SchemaVersion { get; set; }
        public string GameId { get; set; }
        public string ExportId { get; set; }
        public EndingBonusMeta Ending { get; set; }
        public RhythmData Rhythm { get; set; }
        public Dictionary<string, EndingBonusLoopData> Loops { get; set; }
    }

    public sealed class EndingBonusMeta
    {
        public EndingBonusMeta()
        {
            Id = "";
            Title = "";
            Description = "";
            FirstLoopVideoSrc = "";
            LoopPlusVideoSrc = "";
        }

        public string Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string FirstLoopVideoSrc { get; set; }
        public string LoopPlusVideoSrc { get; set; }
        public int FallbackDurationMs { get; set; }
        public int FirstBeatMs { get; set; }
    }

    public sealed class EndingBonusLoopData
    {
        public EndingBonusLoopData()
        {
            Difficulty = new Dictionary<string, EndingBonusDifficultyData>();
            Charts = new Dictionary<string, List<NoteData>>();
        }

        public Dictionary<string, EndingBonusDifficultyData> Difficulty { get; set; }
        public Dictionary<string, List<NoteData>> Charts { get; set; }
    }

    public sealed class EndingBonusDifficultyData
    {
        public EndingBonusDifficultyData()
        {
            Id = "";
            Label = "";
            ChartSummary = new EndingBonusChartSummaryData();
        }

        public string Id { get; set; }
        public string Label { get; set; }
        public int BeatMs { get; set; }
        public double HoldBeats { get; set; }
        public double MashBeats { get; set; }
        public int MashTargetBase { get; set; }
        public int MashTargetStep { get; set; }
        public int MashTargetMax { get; set; }
        public int MinMashTapIntervalMs { get; set; }
        public int LoopLevel { get; set; }
        public EndingBonusChartSummaryData ChartSummary { get; set; }
    }

    public sealed class EndingBonusChartSummaryData
    {
        public EndingBonusChartSummaryData()
        {
            TypeCounts = new TypeCounts();
        }

        public int NoteCount { get; set; }
        public TypeCounts TypeCounts { get; set; }
        public int FirstMs { get; set; }
        public int LastEndMs { get; set; }
        public int MaxMashTarget { get; set; }
        public int TightestMashIntervalMs { get; set; }
    }

    public sealed class EndingBonusExpectedResults
    {
        public EndingBonusExpectedResults()
        {
            Timing = new EndingBonusExpectedTiming();
            Loops = new Dictionary<string, EndingBonusExpectedLoop>();
        }

        public EndingBonusExpectedTiming Timing { get; set; }
        public Dictionary<string, EndingBonusExpectedLoop> Loops { get; set; }
    }

    public sealed class EndingBonusExpectedTiming
    {
        public EndingBonusExpectedTiming()
        {
            WindowsMs = new JudgeWindows();
        }

        public int FirstBeatMs { get; set; }
        public int FallbackDurationMs { get; set; }
        public JudgeWindows WindowsMs { get; set; }
        public int InputGraceMs { get; set; }
        public int MashInputGraceMs { get; set; }
        public int MashDedupMinGapMs { get; set; }
    }

    public sealed class EndingBonusExpectedLoop
    {
        public EndingBonusExpectedLoop()
        {
            Profiles = new Dictionary<string, Dictionary<string, EndingBonusRunResult>>();
        }

        public Dictionary<string, Dictionary<string, EndingBonusRunResult>> Profiles { get; set; }
    }

    public sealed class EndingBonusRunResult
    {
        public EndingBonusRunResult()
        {
            TypeCounts = new TypeCounts();
            Stats = new JudgeStats();
            MissByType = new TypeCounts();
            Samples = new List<ResolvedNote>();
        }

        public int NoteCount { get; set; }
        public TypeCounts TypeCounts { get; set; }
        public JudgeStats Stats { get; set; }
        public TypeCounts MissByType { get; set; }
        public int Hits { get; set; }
        public int Misses { get; set; }
        public int BestCombo { get; set; }
        public int Score { get; set; }
        public List<ResolvedNote> Samples { get; set; }
    }
}
