#if UNITY_5_3_OR_NEWER
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class RhythmInputBindingProfile
    {
        private readonly KeyCode[] tapOrMashKeys;
        private readonly KeyCode[] holdKeys;
        private readonly KeyCode[] pauseKeys;
        private readonly KeyCode[] restartKeys;
        private readonly string[] tapOrMashButtons;

        public RhythmInputBindingProfile(KeyCode[] tapOrMashKeys, KeyCode[] holdKeys, KeyCode[] pauseKeys, KeyCode[] restartKeys, string[] tapOrMashButtons)
        {
            this.tapOrMashKeys = CopyKeys(tapOrMashKeys);
            this.holdKeys = CopyKeys(holdKeys);
            this.pauseKeys = CopyKeys(pauseKeys);
            this.restartKeys = CopyKeys(restartKeys);
            this.tapOrMashButtons = CopyStrings(tapOrMashButtons);
        }

        public KeyCode[] TapOrMashKeys
        {
            get { return CopyKeys(tapOrMashKeys); }
        }

        public KeyCode[] HoldKeys
        {
            get { return CopyKeys(holdKeys); }
        }

        public KeyCode[] PauseKeys
        {
            get { return CopyKeys(pauseKeys); }
        }

        public KeyCode[] RestartKeys
        {
            get { return CopyKeys(restartKeys); }
        }

        public string[] TapOrMashButtons
        {
            get { return CopyStrings(tapOrMashButtons); }
        }

        public static RhythmInputBindingProfile CreateDefault()
        {
            return new RhythmInputBindingProfile(
                new[]
                {
                    KeyCode.Space,
                    KeyCode.Z,
                    KeyCode.JoystickButton0,
                    KeyCode.JoystickButton2
                },
                new[]
                {
                    KeyCode.X,
                    KeyCode.J,
                    KeyCode.JoystickButton1,
                    KeyCode.JoystickButton3
                },
                new[]
                {
                    KeyCode.P,
                    KeyCode.Escape,
                    KeyCode.JoystickButton9
                },
                new[]
                {
                    KeyCode.Return,
                    KeyCode.JoystickButton7
                },
                new[]
                {
                    "Submit"
                });
        }

        private static KeyCode[] CopyKeys(KeyCode[] source)
        {
            if (source == null) return new KeyCode[0];
            var copy = new KeyCode[source.Length];
            source.CopyTo(copy, 0);
            return copy;
        }

        private static string[] CopyStrings(string[] source)
        {
            if (source == null) return new string[0];
            var copy = new string[source.Length];
            source.CopyTo(copy, 0);
            return copy;
        }
    }
}
#endif
