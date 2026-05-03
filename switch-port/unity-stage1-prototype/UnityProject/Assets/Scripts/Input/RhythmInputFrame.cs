#if UNITY_5_3_OR_NEWER
namespace JijiiKobushi.Stage1Prototype
{
    public sealed class RhythmInputFrame
    {
        public bool TapOrMashDown { get; set; }
        public bool HoldDown { get; set; }
        public bool HoldUp { get; set; }
        public bool PauseDown { get; set; }
        public bool RestartDown { get; set; }
    }
}
#endif
