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
    for (const loop of [1, 2]) {
      const gridMs = chartConfig.stepMs / chartConfig.quantizeDivisions;
      const chart = getStageChart(stage, difficulty, loop);
      const baseSpanMs = (chartConfig.count - 1) * chartConfig.stepMs;
      const maxDurationMs = chart.reduce((maxDuration, note) => Math.max(maxDuration, note.durationMs ?? 0), 0);
      const lastEndMs = chart.at(-1).timeMs + (chart.at(-1).durationMs ?? 0);
      const allowedTailMs = maxDurationMs + chartConfig.stepMs * (chartConfig.finale ? 4 : 2) + MAX_GRID_OFFSET_MS;
      let maxOffsetMs = 0;
      for (const note of chart) {
        maxOffsetMs = Math.max(maxOffsetMs, nearestGridOffsetMs(note.timeMs, chartConfig.startMs, gridMs));
        if (note.durationMs) {
          maxOffsetMs = Math.max(maxOffsetMs, nearestGridOffsetMs(note.durationMs, 0, gridMs));
          maxOffsetMs = Math.max(maxOffsetMs, nearestGridOffsetMs(note.timeMs + note.durationMs, chartConfig.startMs, gridMs));
        }
      }
      assert.ok(
        maxOffsetMs <= MAX_GRID_OFFSET_MS,
        `${stage.id}/${difficulty}/loop${loop}: max grid offset ${maxOffsetMs.toFixed(2)}ms`,
      );
      assert.ok(
        lastEndMs <= chartConfig.startMs + baseSpanMs + allowedTailMs,
        `${stage.id}/${difficulty}/loop${loop}: chart ends too late (${lastEndMs}ms)`,
      );
      summaries.push(`${stage.id}/${difficulty}/loop${loop}:${maxOffsetMs.toFixed(2)}ms`);
    }
  }
}

console.log(`rhythm grid ok: ${summaries.length} charts, max offset <= ${MAX_GRID_OFFSET_MS}ms`);
