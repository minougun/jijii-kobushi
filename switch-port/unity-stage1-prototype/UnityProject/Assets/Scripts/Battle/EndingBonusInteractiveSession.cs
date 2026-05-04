using System;
using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class EndingBonusInteractiveSession
    {
        private readonly EndingBonusExport exportData;
        private readonly List<NoteData> chart;
        private readonly AudioClock clock;
        private readonly List<ResolvedNote> resolved;
        private readonly Dictionary<int, List<int>> mashTapTimesByIndex;
        private readonly bool[] resolvedFlags;
        private readonly JudgeStats stats;
        private readonly TypeCounts missByType;

        private int currentNoteIndex;
        private int combo;
        private int maxCombo;
        private int score;
        private int hits;
        private int misses;
        private int activeHoldIndex;
        private int activeHoldDownAtMs;
        private string lastJudgeText;

        public EndingBonusInteractiveSession(EndingBonusExport exportData, string loop, string difficulty)
        {
            this.exportData = exportData;
            Loop = ResolveLoopKey(exportData, loop);
            Difficulty = difficulty;
            chart = exportData.Loops[Loop].Charts[difficulty];
            clock = new AudioClock(0);
            resolved = new List<ResolvedNote>(chart.Count);
            mashTapTimesByIndex = new Dictionary<int, List<int>>();
            resolvedFlags = new bool[chart.Count];
            stats = new JudgeStats();
            missByType = new TypeCounts();
            activeHoldIndex = -1;
            lastJudgeText = "ED Ready";
        }

        public string Loop { get; private set; }

        public string Difficulty { get; private set; }

        public int ElapsedMs
        {
            get { return clock.ElapsedMs; }
        }

        public int BattleClockMs
        {
            get { return clock.BattleClockMs; }
        }

        public int Combo
        {
            get { return combo; }
        }

        public int MaxCombo
        {
            get { return maxCombo; }
        }

        public int Score
        {
            get { return score; }
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

        public NoteData CurrentNote
        {
            get
            {
                if (currentNoteIndex < 0 || currentNoteIndex >= chart.Count) return null;
                return chart[currentNoteIndex];
            }
        }

        public bool IsComplete
        {
            get { return resolved.Count >= chart.Count; }
        }

        public bool IsPaused
        {
            get { return clock.IsPaused; }
        }

        public bool IsHoldActiveForNoteIndex(int noteIndex)
        {
            return activeHoldIndex == noteIndex;
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
            clock.SeekElapsedMs(Math.Max(0, battleClockMs));
            ResolveExpiredNotes();
        }

        public JudgeResult Tap()
        {
            if (clock.IsPaused)
            {
                lastJudgeText = "Paused";
                return null;
            }

            var note = CurrentNote;
            if (note == null)
            {
                lastJudgeText = "No note";
                return null;
            }

            var now = clock.BattleClockMs;
            var tapIndex = FindDueNoteIndex("tap", now);
            if (tapIndex >= 0)
            {
                var tapNote = chart[tapIndex];
                var result = RhythmJudge.JudgeTap(tapNote, now, exportData.Rhythm);
                ResolveNote(tapIndex, tapNote, result);
                return result;
            }

            var countedMash = CountActiveMashTaps(now);
            if (countedMash) return null;

            lastJudgeText = note.Type == "mash" ? "Mash outside window" : "Tap outside search window";
            return null;
        }

        public void HoldDown()
        {
            if (clock.IsPaused)
            {
                lastJudgeText = "Paused";
                return;
            }

            var now = clock.BattleClockMs;
            var holdIndex = FindDueNoteIndex("hold", now);
            if (holdIndex < 0)
            {
                var note = CurrentNote;
                lastJudgeText = note == null ? "No note" : "Next is " + note.Type;
                return;
            }

            activeHoldIndex = holdIndex;
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
            var result = RhythmJudge.JudgeHold(note, activeHoldDownAtMs, clock.BattleClockMs, exportData.Rhythm);
            ResolveNote(activeHoldIndex, note, result);
            activeHoldIndex = -1;
            return result;
        }

        public EndingBonusRunResult BuildResult()
        {
            return new EndingBonusRunResult
            {
                NoteCount = chart.Count,
                TypeCounts = CountType(chart),
                Stats = CloneStats(stats),
                MissByType = CloneTypeCounts(missByType),
                Hits = hits,
                Misses = misses,
                BestCombo = maxCombo,
                Score = score,
                Samples = BuildRecentNotes()
            };
        }

        private void ResolveExpiredNotes()
        {
            while (!IsComplete)
            {
                var now = clock.BattleClockMs;
                var changed = false;

                for (var i = 0; i < chart.Count; i += 1)
                {
                    if (resolvedFlags[i]) continue;

                    var note = chart[i];
                    if (note.Type == "tap")
                    {
                        if (now <= note.TimeMs + exportData.Rhythm.InputGraceMs) continue;
                        ResolveNote(i, note, MissResult());
                        changed = true;
                        continue;
                    }

                    if (note.Type == "hold")
                    {
                        if (activeHoldIndex == i)
                        {
                            if (now <= note.TimeMs + note.DurationMs + exportData.Rhythm.InputGraceMs) continue;
                            activeHoldIndex = -1;
                            ResolveNote(i, note, MissResult());
                            changed = true;
                            continue;
                        }

                        if (now <= note.TimeMs + exportData.Rhythm.InputGraceMs) continue;
                        ResolveNote(i, note, MissResult());
                        changed = true;
                        continue;
                    }

                    if (note.Type == "mash")
                    {
                        if (now <= note.TimeMs + note.DurationMs + exportData.Rhythm.MashInputGraceMs) continue;
                        List<int> mashTimes;
                        if (!mashTapTimesByIndex.TryGetValue(i, out mashTimes)) mashTimes = new List<int>();
                        var result = RhythmJudge.JudgeMash(note, mashTimes, exportData.Rhythm);
                        ResolveNote(i, note, result);
                        mashTapTimesByIndex.Remove(i);
                        changed = true;
                        continue;
                    }

                    ResolveNote(i, note, MissResult());
                    changed = true;
                }

                if (!changed) return;
            }
        }

        private void ResolveNote(int noteIndex, NoteData note, JudgeResult result)
        {
            if (resolvedFlags[noteIndex]) return;
            resolvedFlags[noteIndex] = true;

            var rankName = RhythmJudge.ToJsonRank(result.Rank);
            if (result.Rank == JudgeRank.Miss)
            {
                combo = 0;
                misses += 1;
            }
            else
            {
                combo += 1;
                maxCombo = Math.Max(maxCombo, combo);
                hits += 1;
                score += EndingBonusScoreValue(result.Rank, combo);
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
                TimelineMs = note.TimeMs,
                Detail = BuildDetail(note, result)
            });

            lastJudgeText = rankName.ToUpperInvariant() + " " + BuildDetail(note, result);
            currentNoteIndex = FindFirstUnresolvedIndex();
        }

        private static JudgeResult MissResult()
        {
            return new JudgeResult { Rank = JudgeRank.Miss, OffsetMs = 0 };
        }

        private static int EndingBonusScoreValue(JudgeRank rank, int combo)
        {
            if (rank == JudgeRank.Perfect) return 140 + Math.Min(180, combo * 6);
            if (rank == JudgeRank.Good) return 90 + Math.Min(120, combo * 4);
            if (rank == JudgeRank.Bad) return 35 + Math.Min(60, combo * 2);
            return 0;
        }

        private static string ResolveLoopKey(EndingBonusExport exportData, string loop)
        {
            if (exportData.Loops != null && exportData.Loops.ContainsKey(loop)) return loop;
            return "1";
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

        private bool CountActiveMashTaps(int now)
        {
            var counted = false;
            for (var i = 0; i < chart.Count; i += 1)
            {
                if (resolvedFlags[i]) continue;
                var note = chart[i];
                if (note.Type != "mash") continue;

                var start = note.TimeMs - exportData.Rhythm.MashInputGraceMs;
                var end = note.TimeMs + note.DurationMs + exportData.Rhythm.MashInputGraceMs;
                if (now < start || now > end) continue;

                List<int> mashTimes;
                if (!mashTapTimesByIndex.TryGetValue(i, out mashTimes))
                {
                    mashTimes = new List<int>();
                    mashTapTimesByIndex[i] = mashTimes;
                }
                mashTimes.Add(now);
                lastJudgeText = "Mash " + mashTimes.Count + "/" + note.TargetCount;
                counted = true;
            }
            return counted;
        }

        private int FindDueNoteIndex(string type, int now)
        {
            var bestIndex = -1;
            var bestOffset = int.MaxValue;
            for (var i = 0; i < chart.Count; i += 1)
            {
                if (resolvedFlags[i]) continue;
                var note = chart[i];
                if (note.Type != type) continue;

                var offset = Math.Abs(now - note.TimeMs);
                if (offset > exportData.Rhythm.InputGraceMs || offset >= bestOffset) continue;

                bestOffset = offset;
                bestIndex = i;
            }
            return bestIndex;
        }

        private int FindFirstUnresolvedIndex()
        {
            for (var i = 0; i < resolvedFlags.Length; i += 1)
            {
                if (!resolvedFlags[i]) return i;
            }
            return resolvedFlags.Length;
        }

        private static TypeCounts CountType(List<NoteData> sourceChart)
        {
            var counts = new TypeCounts();
            foreach (var note in sourceChart)
            {
                if (note.Type == "tap") counts.Tap += 1;
                else if (note.Type == "hold") counts.Hold += 1;
                else if (note.Type == "mash") counts.Mash += 1;
            }
            return counts;
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
