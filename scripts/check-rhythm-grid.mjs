import assert from "node:assert/strict";
import { DIFFICULTIES, STAGES, getStageChart } from "../src/stages.js";

const MAX_GRID_OFFSET_MS = 1;
const ACCEPTED_STEP_BEAT_RATIOS = [1, 1.5];

function nearestGridOffsetMs(timeMs, startMs, gridMs) {
  const gridIndex = Math.round((timeMs - startMs) / gridMs);
  return Math.abs(timeMs - (startMs + gridIndex * gridMs));
}

function nearestStepRatioOffsetMs(stepMs, beatMs) {
  return Math.min(
    ...ACCEPTED_STEP_BEAT_RATIOS.map((ratio) => Math.abs(stepMs - beatMs * ratio)),
  );
}

function chartConfigForDifficulty(config, difficulty) {
  const density = DIFFICULTIES[difficulty].density;
  const baseSpan = (config.count - 1) * config.stepMs;
  const count = Math.max(24, Math.round(config.count * density));
  return {
    ...config,
    count,
    stepMs: Math.round(baseSpan / Math.max(1, count - 1)),
  };
}

function chartConfigForLoop(config, difficulty, loop) {
  if (loop <= 1) return config;
  const boost = difficulty === "hard" ? 1.08 : difficulty === "normal" ? 1.06 : 1.04;
  const baseSpan = (config.count - 1) * config.stepMs;
  const count = Math.max(24, Math.round(config.count * boost));
  return {
    ...config,
    count,
    stepMs: Math.round(baseSpan / Math.max(1, count - 1)),
  };
}

const summaries = [];

for (const stage of STAGES) {
  const { chartConfig } = stage;
  assert.ok(stage.bpm > 0, `${stage.id}: bpm must be positive`);
  assert.ok(chartConfig.quantizeDivisions > 0, `${stage.id}: quantizeDivisions required`);

  const beatMs = 60000 / stage.bpm;
  const baseStepOffsetMs = nearestStepRatioOffsetMs(chartConfig.stepMs, beatMs);
  assert.ok(
    baseStepOffsetMs <= 2,
    `${stage.id}: stepMs ${chartConfig.stepMs}ms does not match bpm ${stage.bpm}`,
  );

  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const difficultyConfig = chartConfigForDifficulty(chartConfig, difficulty);
    for (const loop of [1, 2]) {
      const loopConfig = chartConfigForLoop(difficultyConfig, difficulty, loop);
      const gridMs = loopConfig.stepMs / chartConfig.quantizeDivisions;
      const chart = getStageChart(stage, difficulty, loop);
      const maxOffsetMs = chart.reduce(
        (maxOffset, note) =>
          Math.max(
            maxOffset,
            nearestGridOffsetMs(note.timeMs, chartConfig.startMs, gridMs),
          ),
        0,
      );
      assert.ok(
        maxOffsetMs <= MAX_GRID_OFFSET_MS,
        `${stage.id}/${difficulty}/loop${loop}: max grid offset ${maxOffsetMs.toFixed(2)}ms`,
      );
      summaries.push(`${stage.id}/${difficulty}/loop${loop}:${maxOffsetMs.toFixed(2)}ms`);
    }
  }
}

console.log(`rhythm grid ok: ${summaries.length} charts, max offset <= ${MAX_GRID_OFFSET_MS}ms`);
