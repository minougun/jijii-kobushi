# Ending Video Assets

Place the post-clear ending movie here.

Supported filenames:

- `ending.mp4` — recommended first choice. Use H.264 video and AAC audio for broad browser support.
- `ending-loop2.mp4` — optional loop-2-and-later ED. The game selects this after clearing a run whose completed loop is `2` or higher.
- `ending.webm` — reserved fallback filename if WebM source selection is added later.

Guidelines:

- Keep the ending video as a single file for the post-clear ED sequence.
- Prefer 1280x720 or lower for mobile stability.
- Keep bitrate moderate so the browser game does not stall on first playback.
- The game starts this video from a user click on the ending overlay, so audio playback is allowed by normal browser autoplay policies.
- If neither file exists, the game skips the ED video and proceeds to the results screen.
- If `ending-loop2.mp4` fails to load, the game falls back to `ending.mp4` before proceeding to results.
