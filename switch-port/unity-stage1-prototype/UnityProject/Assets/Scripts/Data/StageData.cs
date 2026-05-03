using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class StageExport
    {
        public StageExport()
        {
            GameId = "";
            ExportId = "";
            Stage = new StageMeta();
            Audio = new AudioData();
            Rhythm = new RhythmData();
            Player = new PlayerData();
            Enemy = new EnemyData();
            Difficulty = new Dictionary<string, DifficultyData>();
            Charts = new Dictionary<string, List<NoteData>>();
        }

        public int SchemaVersion { get; set; }
        public string GameId { get; set; }
        public string ExportId { get; set; }
        public StageMeta Stage { get; set; }
        public AudioData Audio { get; set; }
        public RhythmData Rhythm { get; set; }
        public PlayerData Player { get; set; }
        public EnemyData Enemy { get; set; }
        public Dictionary<string, DifficultyData> Difficulty { get; set; }
        public Dictionary<string, List<NoteData>> Charts { get; set; }
    }

    public sealed class StageMeta
    {
        public StageMeta()
        {
            Id = "";
            Title = "";
            LocationName = "";
        }

        public string Id { get; set; }
        public int Index { get; set; }
        public string Title { get; set; }
        public string LocationName { get; set; }
        public int Bpm { get; set; }
        public int TravelMs { get; set; }
    }

    public sealed class AudioData
    {
        public AudioData()
        {
            Bgm = new BgmData();
            Timing = new AudioTimingData();
        }

        public BgmData Bgm { get; set; }
        public AudioTimingData Timing { get; set; }
    }

    public sealed class BgmData
    {
        public BgmData()
        {
            Cue = "";
            Track = "";
            AssetKey = "";
            AssetSrc = "";
        }

        public string Cue { get; set; }
        public string Track { get; set; }
        public double Gain { get; set; }
        public int Lead { get; set; }
        public string AssetKey { get; set; }
        public string AssetSrc { get; set; }
        public double TrackVolume { get; set; }
    }

    public sealed class AudioTimingData
    {
        public AudioTimingData()
        {
            ChartStartReference = "";
        }

        public double CountInLeadSeconds { get; set; }
        public string ChartStartReference { get; set; }
        public int BattleDurationPaddingMs { get; set; }
        public int BgmStopPaddingMs { get; set; }
        public int InputOffsetMsDefault { get; set; }
    }

    public sealed class RhythmData
    {
        public RhythmData()
        {
            NoteTypes = new List<string>();
            WindowsMs = new JudgeWindows();
            JudgeScore = new Dictionary<string, int>();
            Scoring = new ScoringData();
        }

        public List<string> NoteTypes { get; set; }
        public JudgeWindows WindowsMs { get; set; }
        public int InputGraceMs { get; set; }
        public int MashInputGraceMs { get; set; }
        public int MashDedupMinGapMs { get; set; }
        public Dictionary<string, int> JudgeScore { get; set; }
        public ScoringData Scoring { get; set; }
    }

    public sealed class JudgeWindows
    {
        public int Perfect { get; set; }
        public int Good { get; set; }
        public int Bad { get; set; }
    }

    public sealed class ScoringData
    {
        public ScoringData()
        {
            RankScoreThresholds = new Dictionary<string, int>();
        }

        public Dictionary<string, int> RankScoreThresholds { get; set; }
    }

    public sealed class PlayerData
    {
        public int MaxHp { get; set; }
    }

    public sealed class EnemyData
    {
        public EnemyData()
        {
            Name = "";
        }

        public string Name { get; set; }
        public double AttackPower { get; set; }
        public double Hp { get; set; }
    }

    public sealed class DifficultyData
    {
        public DifficultyData()
        {
            Id = "";
            Label = "";
            Loop1 = new DifficultyLoopData();
            ChartSummary = new ChartSummaryData();
        }

        public string Id { get; set; }
        public string Label { get; set; }
        public DifficultyLoopData Loop1 { get; set; }
        public ChartSummaryData ChartSummary { get; set; }
    }

    public sealed class DifficultyLoopData
    {
        public double EnemyHpMultiplier { get; set; }
        public double PlayerDamageMultiplier { get; set; }
        public double EnemyAttackMultiplier { get; set; }
    }

    public sealed class ChartSummaryData
    {
        public ChartSummaryData()
        {
            TypeCounts = new TypeCounts();
        }

        public int NoteCount { get; set; }
        public TypeCounts TypeCounts { get; set; }
        public int FirstMs { get; set; }
        public int LastEndMs { get; set; }
    }

    public sealed class TypeCounts
    {
        public int Tap { get; set; }
        public int Hold { get; set; }
        public int Mash { get; set; }
    }

    public sealed class NoteData
    {
        public NoteData()
        {
            Id = "";
            Type = "";
            PhraseLabel = "";
            CallText = "";
            ResponseText = "";
            PhraseRole = "";
        }

        public string Id { get; set; }
        public string Type { get; set; }
        public int TimeMs { get; set; }
        public int DurationMs { get; set; }
        public int TargetCount { get; set; }
        public string PhraseLabel { get; set; }
        public string CallText { get; set; }
        public string ResponseText { get; set; }
        public bool EnemyCue { get; set; }
        public string PhraseRole { get; set; }
        public int PhraseStep { get; set; }
        public bool Finisher { get; set; }
    }

    public sealed class ExpectedResults
    {
        public ExpectedResults()
        {
            Timing = new ExpectedTiming();
            Profiles = new Dictionary<string, Dictionary<string, ExpectedRunResult>>();
        }

        public ExpectedTiming Timing { get; set; }
        public Dictionary<string, Dictionary<string, ExpectedRunResult>> Profiles { get; set; }
    }

    public sealed class ExpectedTiming
    {
        public ExpectedTiming()
        {
            WindowsMs = new JudgeWindows();
        }

        public int CountInMs { get; set; }
        public int FirstNoteBattleMs { get; set; }
        public int FirstNoteVirtualMs { get; set; }
        public JudgeWindows WindowsMs { get; set; }
        public int InputGraceMs { get; set; }
        public int MashInputGraceMs { get; set; }
        public int MashDedupMinGapMs { get; set; }
    }

    public sealed class ExpectedRunResult
    {
        public ExpectedRunResult()
        {
            Rank = "";
            Stats = new JudgeStats();
            MissByType = new TypeCounts();
            Hp = new HpResult();
        }

        public bool Clear { get; set; }
        public int Score { get; set; }
        public string Rank { get; set; }
        public int MaxCombo { get; set; }
        public JudgeStats Stats { get; set; }
        public TypeCounts MissByType { get; set; }
        public HpResult Hp { get; set; }
    }

    public sealed class JudgeStats
    {
        public int Perfect { get; set; }
        public int Good { get; set; }
        public int Bad { get; set; }
        public int Miss { get; set; }
    }

    public sealed class HpResult
    {
        public int Remaining { get; set; }
        public int Max { get; set; }
    }
}
