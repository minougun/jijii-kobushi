#if UNITY_5_3_OR_NEWER
using System;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public sealed class KeyboardGamepadInputAdapter : IRhythmInputAdapter
    {
        public RhythmInputFrame PollFrame()
        {
            return new RhythmInputFrame
            {
                TapOrMashDown =
                    Input.GetKeyDown(KeyCode.Space) ||
                    Input.GetKeyDown(KeyCode.Z) ||
                    Input.GetKeyDown(KeyCode.JoystickButton0) ||
                    GetButtonDownSafe("Submit"),
                HoldDown =
                    Input.GetKeyDown(KeyCode.X) ||
                    Input.GetKeyDown(KeyCode.J) ||
                    Input.GetKeyDown(KeyCode.JoystickButton1),
                HoldUp =
                    Input.GetKeyUp(KeyCode.X) ||
                    Input.GetKeyUp(KeyCode.J) ||
                    Input.GetKeyUp(KeyCode.JoystickButton1),
                RestartDown =
                    Input.GetKeyDown(KeyCode.Return) ||
                    Input.GetKeyDown(KeyCode.JoystickButton7)
            };
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
