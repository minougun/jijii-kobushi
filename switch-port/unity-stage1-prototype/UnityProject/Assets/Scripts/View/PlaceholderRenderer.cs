using System.Collections.Generic;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class PlaceholderFrame
    {
        public PlaceholderFrame()
        {
            Stats = new JudgeStats();
            RecentNotes = new List<ResolvedNote>();
        }

        public int TimelineMs { get; set; }
        public int BattleClockMs { get; set; }
        public int RemainingHp { get; set; }
        public int MaxCombo { get; set; }
        public JudgeStats Stats { get; set; }
        public List<ResolvedNote> RecentNotes { get; set; }
    }

    public sealed class PlaceholderRenderer
    {
        public string FormatDebugLine(PlaceholderFrame frame)
        {
            return "timeline=" + frame.TimelineMs +
                   " battle=" + frame.BattleClockMs +
                   " hp=" + frame.RemainingHp +
                   " maxCombo=" + frame.MaxCombo +
                   " p/g/b/m=" + frame.Stats.Perfect + "/" + frame.Stats.Good + "/" + frame.Stats.Bad + "/" + frame.Stats.Miss;
        }
    }
}
