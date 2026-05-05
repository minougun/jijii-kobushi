#if UNITY_5_3_OR_NEWER
using System;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public static class PrototypeFooterControls
    {
        public static void Draw(
            Rect mainRect,
            bool isEndingBonus,
            bool hasActiveSession,
            bool paused,
            bool isComplete,
            string difficulty,
            int currentRunLoop,
            ref bool holdButtonWasDown,
            Action<string> selectDifficulty,
            Action<int> selectLoop,
            Action showStages,
            Action previousStage,
            Action nextStage,
            Action restart,
            Action togglePause,
            Action saveRun,
            Action loadRun,
            Action tapOrMash,
            Action holdDown,
            Action holdUp)
        {
            var top = mainRect.y + mainRect.height - 74;
            DrawDifficultyButtons((int)mainRect.x + 24, (int)top + 6, difficulty, selectDifficulty);
            DrawLoopButtons((int)mainRect.x + 392, (int)top + 6, currentRunLoop, selectLoop);

            if (isEndingBonus)
            {
                if (GUI.Button(new Rect(mainRect.x + 552, top + 2, 110, 48), "Stages"))
                {
                    if (showStages != null) showStages();
                }
            }
            else
            {
                if (GUI.Button(new Rect(mainRect.x + 552, top + 2, 72, 48), "Prev"))
                {
                    if (previousStage != null) previousStage();
                }

                if (GUI.Button(new Rect(mainRect.x + 632, top + 2, 72, 48), "Next"))
                {
                    if (nextStage != null) nextStage();
                }
            }

            if (GUI.Button(new Rect(mainRect.x + 712, top + 2, 68, 48), "Save"))
            {
                if (saveRun != null) saveRun();
            }

            if (GUI.Button(new Rect(mainRect.x + 786, top + 2, 68, 48), "Load"))
            {
                if (loadRun != null) loadRun();
            }

            if (GUI.Button(new Rect(mainRect.x + 860, top + 2, 88, 48), "Restart"))
            {
                if (restart != null) restart();
            }

            if (GUI.Button(new Rect(mainRect.x + 954, top + 2, 88, 48), paused ? "Resume" : "Pause"))
            {
                if (togglePause != null) togglePause();
            }

            DrawInputButtons((int)mainRect.x + 1052, (int)top, hasActiveSession, paused || isComplete, ref holdButtonWasDown, tapOrMash, holdDown, holdUp);
        }

        private static void DrawDifficultyButtons(int left, int top, string difficulty, Action<string> selectDifficulty)
        {
            GUI.Label(new Rect(left, top, 100, 28), "Difficulty");
            DrawDifficultyButton("easy", left + 92, top, difficulty, selectDifficulty);
            DrawDifficultyButton("normal", left + 176, top, difficulty, selectDifficulty);
            DrawDifficultyButton("hard", left + 278, top, difficulty, selectDifficulty);
        }

        private static void DrawLoopButtons(int left, int top, int currentRunLoop, Action<int> selectLoop)
        {
            GUI.Label(new Rect(left, top, 58, 28), "Loop");
            DrawLoopButton(1, left + 48, top, currentRunLoop, selectLoop);
            DrawLoopButton(2, left + 104, top, currentRunLoop, selectLoop);
        }

        private static void DrawLoopButton(int value, int left, int top, int currentRunLoop, Action<int> selectLoop)
        {
            var label = currentRunLoop == value ? "[" + value + "]" : value.ToString();
            if (GUI.Button(new Rect(left, top, 50, 32), label))
            {
                if (selectLoop != null) selectLoop(value);
            }
        }

        private static void DrawDifficultyButton(string id, int left, int top, string difficulty, Action<string> selectDifficulty)
        {
            var label = difficulty == id ? "[" + id + "]" : id;
            if (GUI.Button(new Rect(left, top, 84, 32), label))
            {
                if (selectDifficulty != null) selectDifficulty(id);
            }
        }

        private static void DrawInputButtons(
            int left,
            int top,
            bool hasActiveSession,
            bool disabled,
            ref bool holdButtonWasDown,
            Action tapOrMash,
            Action holdDown,
            Action holdUp)
        {
            if (!hasActiveSession) return;
            var previousEnabled = GUI.enabled;
            GUI.enabled = previousEnabled && !disabled;

            if (GUI.Button(new Rect(left, top, 128, 52), "Tap / Mash"))
            {
                if (tapOrMash != null) tapOrMash();
            }

            var holdRect = new Rect(left + 140, top, 128, 52);
            GUI.RepeatButton(holdRect, "Hold");

            var currentEvent = Event.current;
            if (!disabled && currentEvent.type == EventType.MouseDown && holdRect.Contains(currentEvent.mousePosition) && !holdButtonWasDown)
            {
                if (holdDown != null) holdDown();
                holdButtonWasDown = true;
                currentEvent.Use();
            }
            else if (!disabled && currentEvent.type == EventType.MouseUp && holdButtonWasDown)
            {
                if (holdUp != null) holdUp();
                holdButtonWasDown = false;
                currentEvent.Use();
            }

            GUI.enabled = previousEnabled;
        }
    }
}
#endif
