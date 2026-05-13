import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { STAGES, DIFFICULTIES, getStageChart, getStageChartTimingAudit, normalizeLoop } from "../src/stages.js";
import { BGM_TRACKS } from "../src/audio.js";

const SAMPLE_RATE = 500;
const MIN_SUBDIVISION_SUPPORT_RATIO = 0.9;
const MIN_BEAT_SUPPORT_RATIO_FAIL = 0.65;
const MIN_BEAT_SUPPORT_RATIO_WARN = 0.9;
const MAX_CHART_TO_BEST_SUBDIVISION_OFFSET_MS = 50;
const WARN_CHART_TO_BEST_SUBDIVISION_OFFSET_MS = 35;
const MAX_STEP_DRIFT_MS = 0.001;
const EXPECTED_CSV_HEADERS = [
  "stage",
  "difficulty",
  "loop",
  "noteId",
  "noteType",
  "phraseRole",
  "enemyCue",
  "noteTimeMs",
  "durationMs",
  "noteEndMs",
  "trackTimeMs",
  "nearestBeatMs",
  "nearestSubdivisionMs",
  "signedBeatOffsetMs",
  "signedSubdivisionOffsetMs",
  "signedChartGridOffsetMs",
  "barIndex",
  "beatInBar",
  "chartSubdivisionSupportRatio",
  "beatSupportRatio",
  "timingWarning",
  "droppedFromSpacing",
];

function parseArgs(argv) {
  const options = { csv: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--csv") {
      options.csv = argv[i + 1] ?? "";
      i += 1;
    } else if (arg.startsWith("--csv=")) {
      options.csv = arg.slice("--csv=".length);
    }
  }
  return options;
}

function decodeEnvelope(trackPath) {
  if (!existsSync(trackPath)) throw new Error(`missing audio file: ${trackPath}`);
  const result = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", trackPath, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "f32le", "pipe:1"],
    { encoding: "buffer", maxBuffer: 128 * 1024 * 1024 },
  );
  if (result.error) throw new Error(`ffmpeg failed for ${trackPath}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(result.stderr?.toString() || `ffmpeg failed: ${trackPath}`);
  const count = Math.floor(result.stdout.length / 4);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i += 1) samples[i] = Math.abs(result.stdout.readFloatLE(i * 4));
  return samples;
}

function onsetEnvelope(samples) {
  const onset = new Float32Array(samples.length);
  let previous = 0;
  for (let i = 0; i < samples.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - 4); j <= i; j += 1) {
      sum += samples[j];
      count += 1;
    }
    const smoothed = sum / count;
    onset[i] = Math.max(0, smoothed - previous);
    previous = smoothed;
  }
  return onset;
}

function windowMax(values, center, radius) {
  const lo = Math.max(0, center - radius);
  const hi = Math.min(values.length - 1, center + radius);
  let max = 0;
  for (let i = lo; i <= hi; i += 1) max = Math.max(max, values[i]);
  return max;
}

function gridScore(onset, bpm, phaseMs, divisions = 1) {
  const stepSamples = ((60 / bpm) * SAMPLE_RATE) / divisions;
  const phaseSamples = (phaseMs / 1000) * SAMPLE_RATE;
  const radius = Math.round(0.045 * SAMPLE_RATE);
  let sum = 0;
  let count = 0;
  for (let pos = phaseSamples; pos < onset.length; pos += stepSamples) {
    sum += windowMax(onset, Math.round(pos), radius);
    count += 1;
  }
  return count ? sum / count : 0;
}

function findBestPhase(onset, bpm, divisions = 1) {
  const stepMs = 60000 / bpm / divisions;
  let best = { phaseMs: 0, score: -Infinity };
  for (let phaseMs = 0; phaseMs < stepMs; phaseMs += 2) {
    const score = gridScore(onset, bpm, phaseMs, divisions);
    if (score > best.score) best = { phaseMs, score };
  }
  return best;
}

function modulo(value, base) {
  return ((value % base) + base) % base;
}

function signedGridOffset(timeMs, phaseMs, gridMs) {
  const gridIndex = Math.round((timeMs - phaseMs) / gridMs);
  return timeMs - (phaseMs + gridIndex * gridMs);
}

function nearestGridMs(timeMs, phaseMs, gridMs) {
  const gridIndex = Math.round((timeMs - phaseMs) / gridMs);
  return phaseMs + gridIndex * gridMs;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function assertExpectedCsvHeaders(headers) {
  const actual = headers.join(",");
  const expected = EXPECTED_CSV_HEADERS.join(",");
  if (actual !== expected) {
    throw new Error(`unexpected audio sync CSV header:\nactual:   ${actual}\nexpected: ${expected}`);
  }
}

function writeGithubStepSummary(warnings) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const lines = [
    "## Audio Sync Machine Audit",
    "",
    `Timing warnings: ${warnings.length}`,
    "",
  ];
  if (warnings.length) {
    lines.push(...warnings.map((warning) => `- ${warning}`), "");
  } else {
    lines.push("No timing warnings.", "");
  }
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
}

function makeRows(stage, beatPhaseMs, subdivisionPhaseMs, chartSubdivisionSupportRatio, beatSupportRatio, timingWarning) {
  const rows = [];
  const beatMs = 60000 / stage.bpm;
  const subdivisionMs = beatMs / (stage.chartConfig.quantizeDivisions || 1);
  const chartGridMs = stage.chartConfig.stepMs / (stage.chartConfig.quantizeDivisions || 1);
  const trackOffsetMs = (stage.bgm?.startSeconds ?? 0) * 1000;

  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (const loop of [1, 2]) {
      const chart = getStageChart(stage, difficulty, loop);
      const audit = getStageChartTimingAudit(stage, difficulty, loop);
      for (const [index, note] of chart.entries()) {
        const trackTimeMs = note.timeMs + trackOffsetMs;
        const nearestBeatMs = nearestGridMs(trackTimeMs, beatPhaseMs, beatMs);
        const nearestSubdivisionMs = nearestGridMs(trackTimeMs, subdivisionPhaseMs, subdivisionMs);
        const barIndex = Math.floor((nearestBeatMs - beatPhaseMs) / (beatMs * 4));
        const beatInBar = modulo(Math.round((nearestBeatMs - beatPhaseMs) / beatMs), 4);
        rows.push({
          stage: stage.id,
          difficulty,
          loop: normalizeLoop(loop),
          noteId: `${difficulty}-l${loop}-${String(index + 1).padStart(4, "0")}`,
          noteType: note.type,
          phraseRole: note.phraseRole ?? "",
          enemyCue: Boolean(note.enemyCue),
          noteTimeMs: Math.round(note.timeMs),
          durationMs: Math.round(note.durationMs ?? 0),
          noteEndMs: Math.round(note.timeMs + (note.durationMs ?? 0)),
          trackTimeMs: Math.round(trackTimeMs),
          nearestBeatMs: Math.round(nearestBeatMs),
          nearestSubdivisionMs: Math.round(nearestSubdivisionMs),
          signedBeatOffsetMs: Math.round(signedGridOffset(trackTimeMs, beatPhaseMs, beatMs)),
          signedSubdivisionOffsetMs: Math.round(signedGridOffset(trackTimeMs, subdivisionPhaseMs, subdivisionMs)),
          signedChartGridOffsetMs: Math.round(signedGridOffset(trackTimeMs, modulo(stage.chartConfig.startMs + trackOffsetMs, chartGridMs), chartGridMs)),
          barIndex,
          beatInBar,
          chartSubdivisionSupportRatio: chartSubdivisionSupportRatio.toFixed(3),
          beatSupportRatio: beatSupportRatio.toFixed(3),
          timingWarning,
          droppedFromSpacing: "no",
        });
      }
      for (const [index, note] of audit.droppedNotes.entries()) {
        const trackTimeMs = note.timeMs + trackOffsetMs;
        const nearestBeatMs = nearestGridMs(trackTimeMs, beatPhaseMs, beatMs);
        const nearestSubdivisionMs = nearestGridMs(trackTimeMs, subdivisionPhaseMs, subdivisionMs);
        const barIndex = Math.floor((nearestBeatMs - beatPhaseMs) / (beatMs * 4));
        const beatInBar = modulo(Math.round((nearestBeatMs - beatPhaseMs) / beatMs), 4);
        rows.push({
          stage: stage.id,
          difficulty,
          loop: normalizeLoop(loop),
          noteId: `${difficulty}-l${loop}-drop-${String(index + 1).padStart(4, "0")}`,
          noteType: note.type,
          phraseRole: note.phraseRole ?? "",
          enemyCue: Boolean(note.enemyCue),
          noteTimeMs: Math.round(note.timeMs),
          durationMs: Math.round(note.durationMs ?? 0),
          noteEndMs: Math.round(note.timeMs + (note.durationMs ?? 0)),
          trackTimeMs: Math.round(trackTimeMs),
          nearestBeatMs: Math.round(nearestBeatMs),
          nearestSubdivisionMs: Math.round(nearestSubdivisionMs),
          signedBeatOffsetMs: Math.round(signedGridOffset(trackTimeMs, beatPhaseMs, beatMs)),
          signedSubdivisionOffsetMs: Math.round(signedGridOffset(trackTimeMs, subdivisionPhaseMs, subdivisionMs)),
          signedChartGridOffsetMs: Math.round(signedGridOffset(trackTimeMs, modulo(stage.chartConfig.startMs + trackOffsetMs, chartGridMs), chartGridMs)),
          barIndex,
          beatInBar,
          chartSubdivisionSupportRatio: chartSubdivisionSupportRatio.toFixed(3),
          beatSupportRatio: beatSupportRatio.toFixed(3),
          timingWarning,
          droppedFromSpacing: note.dropReason,
        });
      }
    }
  }
  return rows;
}

const options = parseArgs(process.argv.slice(2));
const rows = [];
const failures = [];
const warnings = [];
const summaries = [];

for (const stage of STAGES) {
  const trackPath = BGM_TRACKS[stage.bgm.track]?.src.replace("./", "");
  if (!trackPath) throw new Error(`${stage.id}: missing BGM track mapping`);
  const samples = decodeEnvelope(trackPath);
  const onset = onsetEnvelope(samples);
  const beatMs = 60000 / stage.bpm;
  const divisions = stage.chartConfig.quantizeDivisions || 4;
  const subdivisionMs = beatMs / divisions;
  const trackOffsetMs = (stage.bgm?.startSeconds ?? 0) * 1000;
  const expectedStepMs = beatMs * (stage.chartConfig.stepBeatRatio ?? 1);
  const stepDriftMs = Math.abs(stage.chartConfig.stepMs - expectedStepMs);
  const bestBeat = findBestPhase(onset, stage.bpm, 1);
  const bestSubdivision = findBestPhase(onset, stage.bpm, divisions);
  const chartBeatPhaseMs = modulo(stage.chartConfig.startMs + trackOffsetMs, beatMs);
  const chartSubdivisionPhaseMs = modulo(stage.chartConfig.startMs + trackOffsetMs, subdivisionMs);
  const chartBeatScore = gridScore(onset, stage.bpm, chartBeatPhaseMs, 1);
  const chartSubdivisionScore = gridScore(onset, stage.bpm, chartSubdivisionPhaseMs, divisions);
  const beatSupportRatio = chartBeatScore / Math.max(Number.EPSILON, bestBeat.score);
  const subdivisionSupportRatio = chartSubdivisionScore / Math.max(Number.EPSILON, bestSubdivision.score);
  const chartToBestSubdivisionOffsetMs = signedGridOffset(chartSubdivisionPhaseMs, bestSubdivision.phaseMs, subdivisionMs);

  if (stepDriftMs > MAX_STEP_DRIFT_MS) failures.push(`${stage.id}: step drift ${stepDriftMs.toFixed(6)}ms`);
  if (subdivisionSupportRatio < MIN_SUBDIVISION_SUPPORT_RATIO) {
    failures.push(`${stage.id}: subdivision support ${(subdivisionSupportRatio * 100).toFixed(1)}%`);
  }
  if (beatSupportRatio < MIN_BEAT_SUPPORT_RATIO_FAIL) {
    failures.push(`${stage.id}: beat support ${(beatSupportRatio * 100).toFixed(1)}%`);
  } else if (beatSupportRatio < MIN_BEAT_SUPPORT_RATIO_WARN) {
    warnings.push(`${stage.id}: beat support warning ${(beatSupportRatio * 100).toFixed(1)}%`);
  }
  if (Math.abs(chartToBestSubdivisionOffsetMs) > MAX_CHART_TO_BEST_SUBDIVISION_OFFSET_MS) {
    failures.push(`${stage.id}: chart/best subdivision offset ${Math.round(chartToBestSubdivisionOffsetMs)}ms`);
  } else if (Math.abs(chartToBestSubdivisionOffsetMs) > WARN_CHART_TO_BEST_SUBDIVISION_OFFSET_MS) {
    warnings.push(`${stage.id}: chart/best subdivision offset warning ${Math.round(chartToBestSubdivisionOffsetMs)}ms`);
  }
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (const loop of [1, 2]) {
      for (const note of getStageChartTimingAudit(stage, difficulty, loop).droppedNotes) {
        if (note.enemyCue || note.phraseRole === "call") {
          failures.push(`${stage.id}/${difficulty}/loop${loop}: dropped anchor note sourceIndex=${note.sourceIndex} reason=${note.dropReason}`);
        }
      }
    }
  }
  const timingWarning = warnings.filter((warning) => warning.startsWith(`${stage.id}:`)).join("; ");

  summaries.push(
    `${stage.id.padEnd(14)} bpm=${stage.bpm} step=${stage.chartConfig.stepMs.toFixed(3)}ms subSupport=${(subdivisionSupportRatio * 100).toFixed(1)}% beatSupport=${(beatSupportRatio * 100).toFixed(1)}% chartBestSubOffset=${Math.round(chartToBestSubdivisionOffsetMs)}ms${timingWarning ? " WARN" : ""} track=${trackPath}`,
  );
  rows.push(...makeRows(stage, bestBeat.phaseMs, bestSubdivision.phaseMs, subdivisionSupportRatio, beatSupportRatio, timingWarning));
}

if (options.csv) {
  mkdirSync(dirname(options.csv), { recursive: true });
  const headers = Object.keys(rows[0] ?? {});
  assertExpectedCsvHeaders(headers);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
  writeFileSync(options.csv, `${csv}\n`);
}

console.log("audio sync machine audit");
for (const summary of summaries) console.log(summary);
for (const warning of warnings) console.warn(`warning: ${warning}`);
console.log(`timing warnings=${warnings.length}`);
if (options.csv) console.log(`csv=${options.csv} rows=${rows.length}`);
writeGithubStepSummary(warnings);

if (failures.length) {
  throw new Error(`audio sync machine audit failed:\n${failures.join("\n")}`);
}
