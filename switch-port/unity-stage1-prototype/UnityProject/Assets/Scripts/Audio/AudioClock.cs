using System;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class AudioClock
    {
        public int CountInMs { get; private set; }
        public int ElapsedMs { get; private set; }
        public bool IsPaused { get; private set; }

        public AudioClock(int countInMs)
        {
            CountInMs = Math.Max(0, countInMs);
        }

        public int BattleClockMs
        {
            get { return Math.Max(0, ElapsedMs - CountInMs); }
        }

        public int CountInRemainingMs
        {
            get { return Math.Max(0, CountInMs - ElapsedMs); }
        }

        public void SeekElapsedMs(int elapsedMs)
        {
            ElapsedMs = Math.Max(0, elapsedMs);
        }

        public void AdvanceMs(int deltaMs)
        {
            if (IsPaused) return;
            ElapsedMs = Math.Max(0, ElapsedMs + Math.Max(0, deltaMs));
        }

        public void Pause()
        {
            IsPaused = true;
        }

        public void Resume()
        {
            IsPaused = false;
        }
    }
}
