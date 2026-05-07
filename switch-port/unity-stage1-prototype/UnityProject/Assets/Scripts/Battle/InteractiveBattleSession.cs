using System;
using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public enum InteractiveBattlePhase
    {
        CountIn,
        Battle,
        Paused,
        Result,
        Failed
    }

    public sealed class InteractiveBattleSession
    {
        private readonly StageExport stage;
        private readonly DifficultyData difficultyData;
        private readonly List<NoteData> chart;
        private readonly AudioClock clock;
        private readonly List<ResolvedNote> resolved;
        private readonly List<int> mashTapTimesMs;
        private readonly JudgeStats stats;
        private readonly TypeCounts missByType;

        private int currentNoteIndex;
        private int combo;
        private int maxCombo;
        private double hp;
        private double hpDamageTaken;
        private int activeHoldIndex;
        private int activeHoldDownAtMs;
        private string lastJudgeText;

        public InteractiveBattleSession(StageExport stage, string difficulty)
            : this(stage, "1", difficulty)
        {
        }

        public InteractiveBattleSession(StageExport stage, string loop, string difficulty)
        {
            this.stage = stage;
            Loop = ResolveLoopKey(stage, loop);
            Difficulty = difficulty;
            var loopData = ResolveLoop(stage, Loop);
            difficultyData = loopData.Difficulty[difficulty];
            chart = loopData.Charts[difficulty];
            clock = new AudioClock((int)Math.Round(stage.Audio.Timing.CountInLeadSeconds * 1000.0, MidpointRounding.AwayFromZero));
            resolved = new List<ResolvedNote>(chart.Count);
            mashTapTimesMs = new List<int>();
            stats = new JudgeStats();
            missByType = new TypeCounts();
            hp = stage.Player.MaxHp;
            activeHoldIndex = -1;
            lastJudgeText = "Ready";
        }

        public string Difficulty { get; private set; }

        public string Loop { get; private set; }

        public int CountInMs
        {
            get { return clock.CountInMs; }
        }

        public int ElapsedMs
        {
            get { return clock.ElapsedMs; }
        }

        public int BattleClockMs
        {
            get { return clock.BattleClockMs; }
        }

        public int CountInRemainingMs
        {
            get { return clock.CountInRemainingMs; }
        }

        public int RemainingHp
        {
            get { return (int)Math.Round(Math.Max(0, hp), MidpointRounding.AwayFromZero); }
        }

        public int MaxHp
        {
            get { return stage.Player.MaxHp; }
        }

        public int Combo
        {
            get { return combo; }
        }

        public int MaxCombo
        {
            get { return maxCombo; }
        }

        public JudgeStats Stats
        {
            get { return stats; }
        }

        public TypeCounts MissByType
        {
            get { return missByType; }
        }

        public int ResolvedCount
        {
            get { return resolved.Count; }
        }

        public int TotalNotes
        {
            get { return chart.Count; }
        }

        public int CurrentNoteIndex
        {
            get { return currentNoteIndex; }
        }

        public string LastJudgeText
        {
            get { return lastJudgeText; }
        }

        public InteractiveBattlePhase Phase
        {
            get
            {
                if (IsFailed) return InteractiveBattlePhase.Failed;
                if (IsCleared) return InteractiveBattlePhase.Result;
                if (clock.IsPaused) return InteractiveBattlePhase.Paused;
                if (clock.CountInRemainingMs > 0) return InteractiveBattlePhase.CountIn;
                return InteractiveBattlePhase.Battle;
            }
        }

        public NoteData CurrentNote
        {
            get
            {
                if (currentNoteIndex < 0 || currentNoteIndex >= chart.Count) return null;
                return chart[currentNoteIndex];
            }
        }

        public bool IsHoldActiveForNoteIndex(int noteIndex)
        {
            return activeHoldIndex == noteIndex;
        }

        public bool IsComplete
        {
            get { return IsFailed || IsCleared; }
        }

        public bool IsFailed
        {
            get { return hp <= 0; }
        }

        public bool IsCleared
        {
            get { return hp > 0 && currentNoteIndex >= chart.Count; }
        }

        public bool IsPaused
        {
            get { return clock.IsPaused; }
        }

        public void Pause()
        {
            if (IsComplete) return;
            clock.Pause();
            lastJudgeText = "Paused";
        }

        public void Resume()
        {
            if (IsComplete) return;
            clock.Resume();
            lastJudgeText = "Resume";
        }

        public void AdvanceMs(int deltaMs)
        {
            if (IsComplete || clock.IsPaused) return;
            clock.AdvanceMs(deltaMs);
            ResolveExpiredNotes();
        }

        public void SeekElapsedMs(int elapsedMs)
        {
            if (IsComplete || clock.IsPaused) return;
            clock.SeekElapsedMs(elapsedMs);
            ResolveExpiredNotes();
        }

        public void SeekBattleClockMs(int battleClockMs)
        {
            if (clock.IsPaused) return;
            clock.SeekElapsedMs(clock.CountInMs + Math.Max(0, battleClockMs));
            ResolveExpiredNotes();
        }

        public JudgeResult Tap()
        {
            if (clock.IsPaused)
            {
                lastJudgeText = "Paused";
                return null;
            }

            if (Phase == InteractiveBattlePhase.CountIn)
            {
                lastJudgeText = "Count-in";
                return null;
            }

            var note = CurrentNote;
            if (note == null)
            {
                lastJudgeText = "No note";
                return null;
            }

            var now = clock.BattleClockMs;
            if (note.Type == "mash")
            {
                var start = note.TimeMs - stage.Rhythm.MashInputGraceMs;
                var end = note.TimeMs + note.DurationMs + stage.Rhythm.MashInputGraceMs;
                if (now < start || now > end)
                {
                    lastJudgeText = "Mash outside window";
                    return null;
                }

                mashTapTimesMs.Add(now);
                lastJudgeText = "Mash " + mashTapTimesMs.Count + "/" + note.TargetCount;
                return null;
            }

            if (note.Type != "tap")
            {
                lastJudgeText = "Next is " + note.Type;
                return null;
            }

            if (Math.Abs(now - note.TimeMs) > stage.Rhythm.InputGraceMs)
            {
                lastJudgeText = "Tap outside search window";
                return null;
            }

            var result = RhythmJudge.JudgeTap(note, now, stage.Rhythm);
            ResolveNote(note, result);
            return result;
        }

        public void HoldDown()
        {
            if (clock.IsPaused)
            {
                lastJudgeText = "Paused";
                return;
            }

            if (Phase == InteractiveBattlePhase.CountIn)
            {
                lastJudgeText = "Count-in";
                return;
            }

            var note = CurrentNote;
            if (note == null)
            {
                lastJudgeText = "No note";
                return;
            }

            var now = clock.BattleClockMs;
            if (note.Type != "hold")
            {
                lastJudgeText = "Next is " + note.Type;
                return;
            }

            if (Math.Abs(now - note.TimeMs) > stage.Rhythm.InputGraceMs)
            {
                lastJudgeText = "Hold start outside window";
                return;
            }

            activeHoldIndex = currentNoteIndex;
            activeHoldDownAtMs = now;
            lastJudgeText = "Hold...";
        }

        public JudgeResult HoldUp()
        {
            if (clock.IsPaused)
            {
                lastJudgeText = "Paused";
                return null;
            }

            if (activeHoldIndex < 0 || activeHoldIndex >= chart.Count)
            {
                lastJudgeText = "No active hold";
                return null;
            }

            var note = chart[activeHoldIndex];
            var result = RhythmJudge.JudgeHold(note, activeHoldDownAtMs, clock.BattleClockMs, stage.Rhythm);
            ResolveNote(note, result);
            activeHoldIndex = -1;
            return result;
        }

        public BattleRunResult BuildResult()
        {
            var score = BattleSimulator.CalculateStageScore(resolved, chart.Count, maxCombo, RemainingHp, stage.Player.MaxHp);
            var last = chart[chart.Count - 1];

            return new BattleRunResult
            {
                Difficulty = Difficulty,
                Loop = Loop,
                Profile = "interactive",
                CountInMs = clock.CountInMs,
                FinishTimelineMs = clock.CountInMs + last.TimeMs + last.DurationMs + stage.Audio.Timing.BattleDurationPaddingMs,
                NoteCount = chart.Count,
                TypeCounts = difficultyData.ChartSummary.TypeCounts,
                Stats = CloneStats(stats),
                MissByType = CloneTypeCounts(missByType),
                MaxCombo = maxCombo,
                RemainingHp = RemainingHp,
                MaxHp = stage.Player.MaxHp,
                HpDamageTaken = hpDamageTaken,
                Clear = hp > 0 && currentNoteIndex >= chart.Count,
                Score = score,
                Rank = BattleSimulator.RankScore(score),
                Samples = BuildRecentNotes()
            };
        }

        private void ResolveExpiredNotes()
        {
            while (!IsComplete && clock.CountInRemainingMs == 0)
            {
                var note = CurrentNote;
                var now = clock.BattleClockMs;

                if (note.Type == "tap")
                {
                    if (now <= note.TimeMs + stage.Rhythm.InputGraceMs) return;
                    ResolveNote(note, MissResult());
                    continue;
                }

                if (note.Type == "hold")
                {
                    if (activeHoldIndex == currentNoteIndex)
                    {
                        if (now <= note.TimeMs + note.DurationMs + stage.Rhythm.InputGraceMs) return;
                        activeHoldIndex = -1;
                        ResolveNote(note, MissResult());
                        continue;
                    }

                    if (now <= note.TimeMs + stage.Rhythm.InputGraceMs) return;
                    ResolveNote(note, MissResult());
                    continue;
                }

                if (note.Type == "mash")
                {
                    if (now <= note.TimeMs + note.DurationMs + stage.Rhythm.MashInputGraceMs) return;
                    var result = RhythmJudge.JudgeMash(note, mashTapTimesMs, stage.Rhythm);
                    ResolveNote(note, result);
                    mashTapTimesMs.Clear();
                    continue;
                }

                ResolveNote(note, MissResult());
            }
        }

        private void ResolveNote(NoteData note, JudgeResult result)
        {
            var rankName = RhythmJudge.ToJsonRank(result.Rank);
            if (result.Rank == JudgeRank.Miss && note.Type != "mash")
            {
                var damage = stage.Enemy.AttackPower * difficultyData.Loop.EnemyAttackMultiplier;
                hp = Math.Max(0, hp - damage);
                hpDamageTaken += damage;
            }

            if (result.Rank == JudgeRank.Miss)
            {
                combo = 0;
            }
            else
            {
                combo += 1;
                maxCombo = Math.Max(maxCombo, combo);
            }

            if (result.Rank == JudgeRank.Perfect) stats.Perfect += 1;
            else if (result.Rank == JudgeRank.Good) stats.Good += 1;
            else if (result.Rank == JudgeRank.Bad) stats.Bad += 1;
            else stats.Miss += 1;

            if (result.Rank == JudgeRank.Miss)
            {
                if (note.Type == "tap") missByType.Tap += 1;
                else if (note.Type == "hold") missByType.Hold += 1;
                else if (note.Type == "mash") missByType.Mash += 1;
            }

            resolved.Add(new ResolvedNote
            {
                Rank = rankName,
                NoteId = note.Id,
                Type = note.Type,
                NoteTimeMs = note.TimeMs,
                TimelineMs = clock.CountInMs + note.TimeMs,
                Detail = BuildDetail(note, result)
            });

            lastJudgeText = (rankName.ToUpperInvariant() + " " + BuildPlayFeedback(note, result)).Trim();
            currentNoteIndex += 1;
        }

        private static JudgeResult MissResult()
        {
            return new JudgeResult { Rank = JudgeRank.Miss, OffsetMs = 0 };
        }

        private static string ResolveLoopKey(StageExport stage, string loop)
        {
            if (stage.Loops != null && stage.Loops.ContainsKey(loop)) return loop;
            return "1";
        }

        private static StageLoopData ResolveLoop(StageExport stage, string loop)
        {
            if (stage.Loops != null && stage.Loops.ContainsKey(loop)) return stage.Loops[loop];
            return new StageLoopData
            {
                Label = "1周目",
                Difficulty = stage.Difficulty,
                Charts = stage.Charts
            };
        }

        private static string BuildDetail(NoteData note, JudgeResult result)
        {
            if (note.Type == "mash")
            {
                return result.Count + "/" + result.TargetCount;
            }

            if (note.Type == "hold" && result.Start != null && result.End != null)
            {
                return "start " + result.Start.OffsetMs + "ms end " + result.End.OffsetMs + "ms";
            }

            return result.OffsetMs + "ms";
        }

        private static string BuildPlayFeedback(NoteData note, JudgeResult result)
        {
            if (result.Rank == JudgeRank.Miss && note.Type == "mash") return "Mash short " + BuildMashProgress(result);
            if (note.Type == "mash") return BuildMashFeedback(result);
            if (note.Type == "hold" && result.Start != null && result.End != null) return BuildHoldFeedback(result);
            return BuildTimingFeedback(result.OffsetMs);
        }

        private static string BuildHoldFeedback(JudgeResult result)
        {
            var release = BuildTimingFeedback(result.End.OffsetMs, "release ");
            var start = BuildTimingFeedback(result.Start.OffsetMs);
            if (result.End.Rank == result.Rank && release.Length > 0) return release;
            if (result.Start.Rank == result.Rank && start.Length > 0) return start;
            if (release.Length > 0) return release;
            if (start.Length > 0) return start;
            return BuildDetail(new NoteData { Type = "hold" }, result);
        }

        private static string BuildMashFeedback(JudgeResult result)
        {
            var progress = BuildMashProgress(result);
            if (result.Count < result.TargetCount) return "Mash short " + progress;
            if (result.Count > result.TargetCount + 2) return "Overmash " + progress;
            return progress;
        }

        private static string BuildMashProgress(JudgeResult result)
        {
            return result.Count + "/" + result.TargetCount;
        }

        private static string BuildTimingFeedback(int offsetMs, string prefix = "")
        {
            if (Math.Abs(offsetMs) <= 32) return "";
            return offsetMs < 0 ? prefix + "early " + Math.Abs(offsetMs) + "ms" : prefix + "late " + Math.Abs(offsetMs) + "ms";
        }

        private List<ResolvedNote> BuildRecentNotes()
        {
            var start = Math.Max(0, resolved.Count - 6);
            var list = new List<ResolvedNote>();
            for (var i = start; i < resolved.Count; i += 1)
            {
                list.Add(resolved[i]);
            }
            return list;
        }

        private static JudgeStats CloneStats(JudgeStats source)
        {
            return new JudgeStats
            {
                Perfect = source.Perfect,
                Good = source.Good,
                Bad = source.Bad,
                Miss = source.Miss
            };
        }

        private static TypeCounts CloneTypeCounts(TypeCounts source)
        {
            return new TypeCounts
            {
                Tap = source.Tap,
                Hold = source.Hold,
                Mash = source.Mash
            };
        }
    }
}
