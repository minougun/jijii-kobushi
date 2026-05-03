# Stage 1 Portable Core C#-Style Pseudocode

Source JSON: `docs/exports/switch-stage1-shotengai.stage.json`

This is implementation-shaped pseudocode for the Unity Stage 1 vertical slice. It intentionally avoids renderer details and platform-specific APIs. The first port should load JSON data, run the audio-clock timeline, judge tap/hold/mash, calculate the result, and save a local snapshot for debugging.

## Constants

```csharp
public static class Stage1Constants
{
    public const double CountInSeconds = 3.0;
    public const int CountInMs = 3000;
    public const int InputGraceMs = 250;
    public const int MashGraceMs = 80;
    public const int MashDedupMinGapMs = 70;

    public const int PerfectWindowMs = 60;
    public const int GoodWindowMs = 120;
    public const int BadWindowMs = 190;

    public const int PlayerMaxHp = 12;
    public const int EnemyAttackPower = 1;

    public const string BgmPath = "./assets/audio/koiwazurai.mp3";
    public const double BgmGain = 0.74;
    public const double BgmTrackVolume = 0.78;
    public const int BgmLeadMs = 220;
}

public enum NoteType { Tap, Hold, Mash }
public enum JudgeRank { Perfect, Good, Bad, Miss }
public enum DifficultyId { Easy, Normal, Hard }
public enum RunState { Boot, LoadStage, CountIn, Battle, Paused, Result, Failed, Retry, Exit }
public enum RhythmAction { PressPrimary, PressAlt, HoldDown, HoldUp, Pause, Confirm }
```

## StageData

```csharp
public sealed class StageData
{
    public string StageId;
    public string Title;
    public int Bpm;
    public int TravelMs;

    public AudioData Audio;
    public PlayerData Player;
    public EnemyData Enemy;
    public Dictionary<DifficultyId, DifficultyData> Difficulty;
    public Dictionary<DifficultyId, List<NoteData>> Charts;

    public static StageData FromJson(string json)
    {
        // Use Unity JsonUtility, Newtonsoft.Json, or a project-approved parser.
        // Preserve millisecond values as integers. Do not regenerate charts in code.
        var raw = Json.Parse(json);
        return MapRawJsonToTypedStageData(raw);
    }

    public IReadOnlyList<NoteData> GetChart(DifficultyId difficulty)
    {
        return Charts[difficulty];
    }
}

public sealed class AudioData
{
    public string AssetSrc;       // ./assets/audio/koiwazurai.mp3
    public double Gain;           // 0.74
    public double TrackVolume;    // 0.78
    public int LeadMs;            // 220
    public int BattleDurationPaddingMs; // 1800
    public int BgmStopPaddingMs;        // 900
    public int InputOffsetMsDefault;    // 0
}

public sealed class PlayerData
{
    public int MaxHp; // 12
}

public sealed class EnemyData
{
    public string Name;
    public int Hp;          // 610
    public int AttackPower; // 1
}

public sealed class DifficultyData
{
    public DifficultyId Id;
    public string Label;
    public int NoteCount;
    public int TapCount;
    public int HoldCount;
    public int MashCount;
    public int FirstMs;
    public int LastEndMs;
    public double EnemyAttackMultiplier; // Stage 1 loop1: 1
}
```

## NoteData

```csharp
public sealed class NoteData
{
    public string Id;
    public NoteType Type;
    public int TimeMs;
    public int DurationMs;
    public int TargetCount; // mash only; 0 or absent for tap/hold

    public string PhraseLabel;
    public string CallText;
    public string ResponseText;
    public string EnemyCue;
    public bool Finisher;

    public int EndMs => TimeMs + DurationMs;
    public int VirtualTimeMs => Stage1Constants.CountInMs + TimeMs;
}
```

## InputAdapter

```csharp
public readonly struct RhythmInputEvent
{
    public readonly RhythmAction Action;
    public readonly double TimeMs; // battle clock ms, not Unity frame time
    public readonly bool IsDown;

    public RhythmInputEvent(RhythmAction action, double timeMs, bool isDown)
    {
        Action = action;
        TimeMs = timeMs;
        IsDown = isDown;
    }
}

public sealed class InputAdapter
{
    private readonly Queue<RhythmInputEvent> _events = new Queue<RhythmInputEvent>();
    private bool _primaryWasDown;

    public void Poll(AudioClock clock)
    {
        double battleMs = clock.BattleClockMs;

        bool primaryDown = ReadPrimaryButton();
        if (primaryDown && !_primaryWasDown)
        {
            _events.Enqueue(new RhythmInputEvent(RhythmAction.PressPrimary, battleMs, true));
            _events.Enqueue(new RhythmInputEvent(RhythmAction.HoldDown, battleMs, true));
        }
        if (!primaryDown && _primaryWasDown)
        {
            _events.Enqueue(new RhythmInputEvent(RhythmAction.HoldUp, battleMs, false));
        }
        _primaryWasDown = primaryDown;

        if (ReadPausePressed())
        {
            _events.Enqueue(new RhythmInputEvent(RhythmAction.Pause, battleMs, true));
        }
    }

    public List<RhythmInputEvent> Drain()
    {
        var drained = new List<RhythmInputEvent>();
        while (_events.Count > 0) drained.Add(_events.Dequeue());
        return drained;
    }
}
```

## AudioClock

```csharp
public sealed class AudioClock
{
    private double _songStartDspTime;
    private double _pauseStartedDspTime;
    private double _pausedDurationMs;
    private bool _paused;

    public double ElapsedMs { get; private set; }
    public double BattleClockMs => ElapsedMs - Stage1Constants.CountInMs;
    public double CountInRemainingMs => Math.Max(0, Stage1Constants.CountInMs - ElapsedMs);

    public void Start(double currentDspTime)
    {
        _songStartDspTime = currentDspTime;
        _pausedDurationMs = 0;
        _paused = false;
        ElapsedMs = 0;
    }

    public void Update(double currentDspTime)
    {
        if (_paused) return;
        ElapsedMs = (currentDspTime - _songStartDspTime) * 1000.0 - _pausedDurationMs;
    }

    public void Pause(double currentDspTime)
    {
        if (_paused) return;
        _paused = true;
        _pauseStartedDspTime = currentDspTime;
        PauseAudio();
    }

    public void Resume(double currentDspTime)
    {
        if (!_paused) return;
        _pausedDurationMs += (currentDspTime - _pauseStartedDspTime) * 1000.0;
        _paused = false;
        ResumeAudio();
    }

    public bool IsDrifting(double audioPlaybackMs, double toleranceMs = 35)
    {
        return Math.Abs(audioPlaybackMs - ElapsedMs) > toleranceMs;
    }

    public void ResyncToAudio(double audioPlaybackMs, double currentDspTime)
    {
        // Keep judgement aligned to audio if a drift monitor detects a large gap.
        _songStartDspTime = currentDspTime - ((audioPlaybackMs + _pausedDurationMs) / 1000.0);
        ElapsedMs = audioPlaybackMs;
    }
}
```

## RhythmJudge

```csharp
public readonly struct JudgeResult
{
    public readonly JudgeRank Rank;
    public readonly int OffsetMs;
    public readonly int Count;
    public readonly int TargetCount;

    public JudgeResult(JudgeRank rank, int offsetMs, int count = 0, int targetCount = 0)
    {
        Rank = rank;
        OffsetMs = offsetMs;
        Count = count;
        TargetCount = targetCount;
    }
}

public static class RhythmJudge
{
    public static JudgeRank JudgeOffset(int offsetMs)
    {
        int abs = Math.Abs(offsetMs);
        if (abs <= Stage1Constants.PerfectWindowMs) return JudgeRank.Perfect;
        if (abs <= Stage1Constants.GoodWindowMs) return JudgeRank.Good;
        if (abs <= Stage1Constants.BadWindowMs) return JudgeRank.Bad;
        return JudgeRank.Miss;
    }

    public static JudgeResult JudgeTap(NoteData note, double inputAtMs, int inputOffsetMs = 0)
    {
        int offsetMs = (int)Math.Round(inputAtMs + inputOffsetMs - note.TimeMs);
        return new JudgeResult(JudgeOffset(offsetMs), offsetMs);
    }

    public static JudgeRank Lower(JudgeRank a, JudgeRank b)
    {
        return RankValue(a) <= RankValue(b) ? a : b;
    }

    private static int RankValue(JudgeRank rank)
    {
        switch (rank)
        {
            case JudgeRank.Perfect: return 4;
            case JudgeRank.Good: return 3;
            case JudgeRank.Bad: return 2;
            default: return 1;
        }
    }
}
```

## HoldJudge

```csharp
public static class HoldJudge
{
    public static JudgeResult Judge(NoteData note, double downAtMs, double upAtMs, int inputOffsetMs = 0)
    {
        JudgeResult start = RhythmJudge.JudgeTap(note, downAtMs, inputOffsetMs);

        int endTargetMs = note.TimeMs + note.DurationMs;
        int endOffsetMs = (int)Math.Round(upAtMs + inputOffsetMs - endTargetMs);
        JudgeRank endRank = RhythmJudge.JudgeOffset(endOffsetMs);

        JudgeRank finalRank = RhythmJudge.Lower(start.Rank, endRank);
        int reportedOffset = Math.Abs(start.OffsetMs) >= Math.Abs(endOffsetMs)
            ? start.OffsetMs
            : endOffsetMs;

        return new JudgeResult(finalRank, reportedOffset);
    }
}
```

## MashJudge

```csharp
public static class MashJudge
{
    public static JudgeResult Judge(NoteData note, IReadOnlyList<double> tapTimesMs)
    {
        double startMs = note.TimeMs - Stage1Constants.MashGraceMs;
        double endMs = note.TimeMs + note.DurationMs + Stage1Constants.MashGraceMs;
        int count = 0;
        double lastCountedMs = double.NegativeInfinity;

        foreach (double tapTimeMs in tapTimesMs)
        {
            if (tapTimeMs < startMs || tapTimeMs > endMs) continue;
            if (tapTimeMs - lastCountedMs < Stage1Constants.MashDedupMinGapMs) continue;

            count += 1;
            lastCountedMs = tapTimeMs;
        }

        JudgeRank rank = JudgeRank.Miss;
        if (count >= note.TargetCount) rank = JudgeRank.Perfect;
        else if (count >= note.TargetCount - 1) rank = JudgeRank.Good;
        else if (count >= note.TargetCount - 3) rank = JudgeRank.Bad;

        if (count > note.TargetCount + 2)
        {
            if (rank == JudgeRank.Perfect) rank = JudgeRank.Good;
            else if (rank == JudgeRank.Good) rank = JudgeRank.Bad;
            else if (rank == JudgeRank.Bad) rank = JudgeRank.Miss;
        }

        return new JudgeResult(rank, 0, count, note.TargetCount);
    }
}
```

## BattleController

```csharp
public sealed class BattleController
{
    private StageData _stage;
    private DifficultyId _difficulty;
    private IReadOnlyList<NoteData> _chart;
    private AudioClock _clock;
    private InputAdapter _input;
    private ResultCalculator _result;

    private int _nextNoteIndex;
    private readonly Dictionary<string, double> _holdDownTimes = new Dictionary<string, double>();
    private readonly Dictionary<string, List<double>> _mashBuffers = new Dictionary<string, List<double>>();

    public RunState State { get; private set; } = RunState.Boot;
    public SaveSnapshot Snapshot { get; private set; }
    public DifficultyId CurrentDifficulty => _difficulty;
    public double CurrentBattleClockMs => _clock.BattleClockMs;
    public int NextNoteIndex => _nextNoteIndex;

    public void Load(StageData stage, DifficultyId difficulty)
    {
        _stage = stage;
        _difficulty = difficulty;
        _chart = stage.GetChart(difficulty);
        _result = new ResultCalculator(stage.Player.MaxHp, _chart.Count);
        _nextNoteIndex = 0;
        State = RunState.LoadStage;
    }

    public void StartBattle(double dspTime)
    {
        _clock.Start(dspTime);
        PlayBgm(_stage.Audio.AssetSrc, _stage.Audio.Gain, _stage.Audio.TrackVolume, _stage.Audio.LeadMs);
        State = RunState.CountIn;
    }

    public void Update(double dspTime)
    {
        if (State != RunState.CountIn && State != RunState.Battle) return;

        _clock.Update(dspTime);
        if (State == RunState.CountIn && _clock.ElapsedMs >= Stage1Constants.CountInMs)
        {
            State = RunState.Battle;
        }

        if (_clock.IsDrifting(GetAudioPlaybackMs()))
        {
            _clock.ResyncToAudio(GetAudioPlaybackMs(), dspTime);
        }

        _input.Poll(_clock);
        DispatchInput(_input.Drain());
        AutoMissExpiredNotes(_clock.BattleClockMs);

        if (_result.CurrentHp <= 0)
        {
            State = RunState.Failed;
            Snapshot = SaveSnapshot.FromRun(this, _result.BuildFinal(false));
            return;
        }

        if (_nextNoteIndex >= _chart.Count && AllPendingNotesClosed())
        {
            State = RunState.Result;
            Snapshot = SaveSnapshot.FromRun(this, _result.BuildFinal(true));
        }
    }

    private void DispatchInput(IReadOnlyList<RhythmInputEvent> events)
    {
        foreach (var inputEvent in events)
        {
            if (inputEvent.Action == RhythmAction.Pause)
            {
                Pause();
                continue;
            }

            NoteData note = FindBestPendingNote(inputEvent);
            if (note == null) continue;

            if (note.Type == NoteType.Tap && inputEvent.IsDown)
            {
                Resolve(note, RhythmJudge.JudgeTap(note, inputEvent.TimeMs));
            }
            else if (note.Type == NoteType.Hold && inputEvent.Action == RhythmAction.HoldDown)
            {
                _holdDownTimes[note.Id] = inputEvent.TimeMs;
            }
            else if (note.Type == NoteType.Hold && inputEvent.Action == RhythmAction.HoldUp)
            {
                double downAtMs = _holdDownTimes[note.Id];
                Resolve(note, HoldJudge.Judge(note, downAtMs, inputEvent.TimeMs));
            }
            else if (note.Type == NoteType.Mash && inputEvent.IsDown)
            {
                if (!_mashBuffers.ContainsKey(note.Id)) _mashBuffers[note.Id] = new List<double>();
                _mashBuffers[note.Id].Add(inputEvent.TimeMs);
            }
        }
    }

    private void AutoMissExpiredNotes(double battleClockMs)
    {
        while (_nextNoteIndex < _chart.Count)
        {
            NoteData note = _chart[_nextNoteIndex];
            if (note.Type == NoteType.Mash)
            {
                double mashEnd = note.TimeMs + note.DurationMs + Stage1Constants.MashGraceMs;
                if (battleClockMs <= mashEnd) break;
                var taps = _mashBuffers.ContainsKey(note.Id) ? _mashBuffers[note.Id] : EmptyTaps();
                Resolve(note, MashJudge.Judge(note, taps));
            }
            else
            {
                double missDeadline = note.TimeMs + Stage1Constants.InputGraceMs;
                if (battleClockMs <= missDeadline) break;
                Resolve(note, new JudgeResult(JudgeRank.Miss, (int)(battleClockMs - note.TimeMs)));
            }
        }
    }

    private void Resolve(NoteData note, JudgeResult judge)
    {
        _result.Apply(note, judge, _stage.Enemy.AttackPower, _stage.Difficulty[_difficulty].EnemyAttackMultiplier);
        _nextNoteIndex += 1;
    }

    public void Pause()
    {
        if (State != RunState.CountIn && State != RunState.Battle) return;
        _clock.Pause(CurrentDspTime());
        State = RunState.Paused;
    }

    public void Resume()
    {
        if (State != RunState.Paused) return;
        _clock.Resume(CurrentDspTime());
        State = _clock.ElapsedMs < Stage1Constants.CountInMs ? RunState.CountIn : RunState.Battle;
    }
}
```

## ResultCalculator

```csharp
public sealed class ResultCalculator
{
    private readonly int _maxHp;
    private readonly int _totalNotes;
    private readonly List<ResolvedNote> _notes = new List<ResolvedNote>();
    private int _combo;

    public int CurrentHp { get; private set; }
    public int MaxCombo { get; private set; }
    public int PerfectCount { get; private set; }
    public int GoodCount { get; private set; }
    public int BadCount { get; private set; }
    public int MissCount { get; private set; }

    public ResultCalculator(int maxHp, int totalNotes)
    {
        _maxHp = maxHp;
        _totalNotes = totalNotes;
        CurrentHp = maxHp;
    }

    public void Apply(NoteData note, JudgeResult judge, int enemyAttackPower, double enemyAttackMultiplier)
    {
        _notes.Add(new ResolvedNote(note.Id, note.Type, judge));

        if (judge.Rank == JudgeRank.Miss)
        {
            _combo = 0;
            if (note.Type != NoteType.Mash)
            {
                CurrentHp = Math.Max(0, CurrentHp - (int)(enemyAttackPower * enemyAttackMultiplier));
            }
        }
        else
        {
            _combo += 1;
            MaxCombo = Math.Max(MaxCombo, _combo);
        }

        if (judge.Rank == JudgeRank.Perfect) PerfectCount += 1;
        else if (judge.Rank == JudgeRank.Good) GoodCount += 1;
        else if (judge.Rank == JudgeRank.Bad) BadCount += 1;
        else MissCount += 1;
    }

    public RunResult BuildFinal(bool chartCompleted)
    {
        int score = CalculateScore(_totalNotes, MaxCombo, CurrentHp, _maxHp);
        return new RunResult
        {
            Clear = chartCompleted && CurrentHp > 0,
            Score = score,
            Rank = RankScore(score),
            MaxCombo = MaxCombo,
            Perfect = PerfectCount,
            Good = GoodCount,
            Bad = BadCount,
            Miss = MissCount,
            Hp = CurrentHp,
            MaxHp = _maxHp
        };
    }

    private int CalculateScore(int totalNotes, int maxCombo, int hp, int maxHp)
    {
        int judgePoints = PerfectCount * 100 + GoodCount * 70 + BadCount * 30;
        double judgePart = (judgePoints / (totalNotes * 100.0)) * 7000.0;
        double comboPart = (maxCombo / (double)totalNotes) * 1500.0;
        double hpPart = (Math.Max(0, hp) / (double)maxHp) * 1300.0;
        double comboBonusPart = 0.0;
        return (int)Math.Round(Clamp(judgePart + comboPart + hpPart + comboBonusPart, 0, 10000));
    }

    private string RankScore(int score)
    {
        if (score >= 8400) return "S";
        if (score >= 7000) return "A";
        if (score >= 5400) return "B";
        return "C";
    }
}
```

## SaveSnapshot

```csharp
public sealed class SaveSnapshot
{
    public string StageId;
    public DifficultyId Difficulty;
    public double BattleClockMs;
    public int NextNoteIndex;
    public int Hp;
    public int MaxCombo;
    public int Perfect;
    public int Good;
    public int Bad;
    public int Miss;
    public string LastState;
    public RunResult LastResult;

    public static SaveSnapshot FromRun(BattleController controller, RunResult result)
    {
        return new SaveSnapshot
        {
            StageId = "shotengai",
            Difficulty = controller.CurrentDifficulty,
            BattleClockMs = controller.CurrentBattleClockMs,
            NextNoteIndex = controller.NextNoteIndex,
            Hp = result.Hp,
            MaxCombo = result.MaxCombo,
            Perfect = result.Perfect,
            Good = result.Good,
            Bad = result.Bad,
            Miss = result.Miss,
            LastState = controller.State.ToString(),
            LastResult = result
        };
    }

    public string ToJson()
    {
        return Json.Serialize(this);
    }
}
```

## Implementation Notes

- `virtualTimeMs = 3000 + note.timeMs`.
- The first Stage 1 note is at battle `1200ms`, virtual timeline `4200ms`.
- Judge all input from timestamped events, not from render frame timing.
- Treat rendering as a placeholder subscriber to `StageRunState` until the C# logic matches the portable runner.
- Keep `InputAdapter` replaceable so keyboard, gamepad, and automated profile tests feed the same `RhythmInputEvent` path.
