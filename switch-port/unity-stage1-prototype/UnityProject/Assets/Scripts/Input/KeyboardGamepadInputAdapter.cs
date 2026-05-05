#if UNITY_5_3_OR_NEWER
using System;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class KeyboardGamepadInputAdapter : IRhythmInputAdapter
    {
        private readonly RhythmInputBindingProfile bindings;

        public KeyboardGamepadInputAdapter()
            : this(RhythmInputBindingProfile.CreateDefault())
        {
        }

        public KeyboardGamepadInputAdapter(RhythmInputBindingProfile bindings)
        {
            this.bindings = bindings ?? RhythmInputBindingProfile.CreateDefault();
        }

        public RhythmInputBindingProfile Bindings
        {
            get { return bindings; }
        }

        public RhythmInputFrame PollFrame()
        {
            return new RhythmInputFrame
            {
                TapOrMashDown =
                    AnyKeyDown(bindings.TapOrMashKeys) ||
                    AnyButtonDown(bindings.TapOrMashButtons),
                HoldDown = AnyKeyDown(bindings.HoldKeys),
                HoldUp = AnyKeyUp(bindings.HoldKeys),
                PauseDown = AnyKeyDown(bindings.PauseKeys),
                RestartDown = AnyKeyDown(bindings.RestartKeys)
            };
        }

        private static bool AnyKeyDown(KeyCode[] keys)
        {
            for (var i = 0; i < keys.Length; i += 1)
            {
                if (Input.GetKeyDown(keys[i])) return true;
            }
            return false;
        }

        private static bool AnyKeyUp(KeyCode[] keys)
        {
            for (var i = 0; i < keys.Length; i += 1)
            {
                if (Input.GetKeyUp(keys[i])) return true;
            }
            return false;
        }

        private static bool AnyButtonDown(string[] buttonNames)
        {
            for (var i = 0; i < buttonNames.Length; i += 1)
            {
                if (GetButtonDownSafe(buttonNames[i])) return true;
            }
            return false;
        }

        private static bool GetButtonDownSafe(string buttonName)
        {
            try
            {
                return Input.GetButtonDown(buttonName);
            }
            catch (ArgumentException)
            {
                return false;
            }
        }
    }
}
#endif
