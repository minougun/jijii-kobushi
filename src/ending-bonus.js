import { DIFFICULTIES, normalizeLoop } from "./stages.js";

export const ENDING_BONUS_FIRST_BEAT_MS = 1600;
export const ENDING_BONUS_FALLBACK_DURATION_MS = 77300;

export const ENDING_BONUS_DIFFICULTY = {
  easy: {
    beatMs: 760,
    holdBeats: 1.35,
    tapEveryPhrase: 5,
    mashTargetBase: 4,
    mashTargetStep: 4,
    mashTargetMax: 7,
    mashBeats: 2.25,
    minMashTapIntervalMs: 230,
    label: "ED拍ゆったり",
  },
  normal: {
    beatMs: 640,
    holdBeats: 1.25,
    tapEveryPhrase: 4,
    mashTargetBase: 6,
    mashTargetStep: 3,
    mashTargetMax: 9,
    mashBeats: 2,
    minMashTapIntervalMs: 155,
    label: "ED拍",
  },
  hard: {
    beatMs: 540,
    holdBeats: 1.12,
    tapEveryPhrase: 3,
    mashTargetBase: 6,
    mashTargetStep: 3,
    mashTargetMax: 8,
    mashBeats: 1.85,
    minMashTapIntervalMs: 145,
    label: "ED拍詰め",
  },
};

export function endingBonusDifficultyConfig(difficulty = "normal", loop = 1) {
  const base = ENDING_BONUS_DIFFICULTY[DIFFICULTIES[difficulty] ? difficulty : "normal"] ?? ENDING_BONUS_DIFFICULTY.normal;
  const loopLevel = Math.min(3, Math.max(0, normalizeLoop(loop) - 1));
  return {
    ...base,
    beatMs: Math.max(440, Math.round(base.beatMs * (1 - loopLevel * 0.075))),
    holdBeats: Math.max(0.9, base.holdBeats - loopLevel * 0.06),
    mashTargetBase: base.mashTargetBase + loopLevel,
    mashTargetMax: base.mashTargetMax + loopLevel,
    mashBeats: Math.max(1.55, base.mashBeats - loopLevel * 0.08),
    minMashTapIntervalMs: Math.max(105, base.minMashTapIntervalMs - loopLevel * 3),
    loopLevel,
  };
}

export function createEndingBonusChart(durationMs = ENDING_BONUS_FALLBACK_DURATION_MS, difficulty = "normal", loop = 1) {
  const config = endingBonusDifficultyConfig(difficulty, loop);
  const beatMs = config.beatMs;
  const endMs = Math.max(ENDING_BONUS_FIRST_BEAT_MS + beatMs * 8, durationMs - 1400);
  const chart = [];
  const phraseMs = beatMs * 8;
  const pushNote = (note) => {
    const end = note.timeMs + (note.durationMs ?? 0);
    if (note.timeMs >= ENDING_BONUS_FIRST_BEAT_MS && end <= endMs) chart.push(note);
  };

  for (let phraseStart = ENDING_BONUS_FIRST_BEAT_MS, phrase = 0; phraseStart < endMs; phraseStart += phraseMs, phrase += 1) {
    const phraseLabel = config.label;
    const holdDurationMs = Math.round(beatMs * config.holdBeats);
    const mashDurationMs = Math.round(beatMs * config.mashBeats);
    const desiredMashTarget = Math.min(config.mashTargetMax, config.mashTargetBase + Math.floor(phrase / config.mashTargetStep));
    const realisticMashTarget = Math.max(3, Math.floor((mashDurationMs + 160) / config.minMashTapIntervalMs));
    const mashTarget = Math.min(desiredMashTarget, realisticMashTarget);

    pushNote({ type: "tap", timeMs: phraseStart, phraseLabel });
    pushNote({ type: "tap", timeMs: phraseStart + beatMs, phraseLabel });
    if (phrase % 2 === 0) {
      pushNote({ type: "hold", timeMs: phraseStart + beatMs * 2, durationMs: holdDurationMs, phraseLabel });
      pushNote({ type: "tap", timeMs: phraseStart + beatMs * 4, phraseLabel });
      if (config.tapEveryPhrase <= 4) pushNote({ type: "tap", timeMs: phraseStart + beatMs * 4.5, phraseLabel });
      pushNote({
        type: "mash",
        timeMs: phraseStart + beatMs * 5,
        durationMs: mashDurationMs,
        targetCount: mashTarget,
        phraseLabel,
      });
    } else {
      pushNote({ type: "tap", timeMs: phraseStart + beatMs * 2, phraseLabel });
      pushNote({ type: "hold", timeMs: phraseStart + beatMs * 3, durationMs: holdDurationMs + Math.round(beatMs * 0.35), phraseLabel });
      if (config.tapEveryPhrase <= 3) pushNote({ type: "tap", timeMs: phraseStart + beatMs * 4.35, phraseLabel });
      pushNote({
        type: "mash",
        timeMs: phraseStart + beatMs * 5,
        durationMs: mashDurationMs,
        targetCount: mashTarget,
        phraseLabel,
      });
      pushNote({ type: "tap", timeMs: phraseStart + beatMs * 7, phraseLabel });
    }
  }
  return chart.sort((a, b) => a.timeMs - b.timeMs);
}

export function endingBonusScoreValue(rank, combo) {
  if (rank === "perfect") return 140 + Math.min(180, combo * 6);
  if (rank === "good") return 90 + Math.min(120, combo * 4);
  if (rank === "bad") return 35 + Math.min(60, combo * 2);
  return 0;
}
