import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  STAGES,
  damageScaleForDifficulty,
  getStageChart,
  loopEnemyHpMultiplier,
  loopPlayerDamageMultiplier,
} from "../src/stages.js";
import { comboBonusDamage, comboHitMultiplier, finisherBonusDamage, mashStrikeMultiplier, noteDamage } from "../src/rhythm.js";
import { BGM_TRACKS } from "../src/audio.js";

const RUNS = 10000;
const SAMPLE_RATE = 200;

const PROFILES = {
  easy: { label: "Easy", rankWeights: { perfect: 0.2, good: 0.42, bad: 0.26, miss: 0.12 } },
  normal: { label: "Normal", rankWeights: { perfect: 0.32, good: 0.42, bad: 0.18, miss: 0.08 } },
  hard: { label: "Hard", rankWeights: { perfect: 0.48, good: 0.36, bad: 0.12, miss: 0.04 } },
};

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function pickRank(random, weights) {
  const roll = random();
  let acc = 0;
  for (const rank of ["perfect", "good", "bad", "miss"]) {
    acc += weights[rank];
    if (roll <= acc) return rank;
  }
  return "miss";
}

function lowerRank(rank) {
  if (rank === "perfect") return "good";
  if (rank === "good") return "bad";
  if (rank === "bad") return "miss";
  return "miss";
}

function simulatedMashCount(note, rank, random) {
  if (rank === "perfect") return Math.min(note.targetCount + 2, note.targetCount + 1 + Math.floor(random() * 2));
  if (rank === "good") return Math.max(1, note.targetCount - 1);
  if (rank === "bad") return Math.max(1, note.targetCount - 2);
  return Math.max(0, note.targetCount - 4);
}

function simulateClear(stage, difficulty, seed, loop = 1) {
  const random = rng(seed);
  const profile = PROFILES[difficulty];
  const damageScale = damageScaleForDifficulty(stage, difficulty, loop) * loopPlayerDamageMultiplier(loop, stage, difficulty);
  const targetHp = Math.round(stage.enemy.hp * loopEnemyHpMultiplier(loop, stage, difficulty));
  let damage = 0;
  let combo = 0;

  for (const note of getStageChart(stage, difficulty, loop)) {
    let rank = pickRank(random, profile.rankWeights);
    if (note.type === "hold" && rank !== "miss" && random() < 0.08) rank = lowerRank(rank);
    if (rank === "miss") {
      combo = 0;
      continue;
    }

    combo += 1;
    const baseDamage = noteDamage(rank);
    const mashMul = note.type === "mash" ? mashStrikeMultiplier(rank, simulatedMashCount(note, rank, random), note.targetCount) : 1;
    damage += baseDamage * comboHitMultiplier(combo, random) * mashMul * damageScale;
    damage += comboBonusDamage(combo, baseDamage) * mashMul * damageScale;
    damage += finisherBonusDamage(note, rank) * mashMul * damageScale;
    if (damage >= targetHp) {
      return note.timeMs + (note.durationMs ?? 0);
    }
  }
  return null;
}

function quantile(values, q) {
  const index = Math.max(0, Math.min(values.length - 1, Math.floor((values.length - 1) * q)));
  return values[index];
}

function decodeEnvelope(trackPath) {
  if (!existsSync(trackPath)) throw new Error(`missing audio file: ${trackPath}`);
  const result = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", trackPath, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "f32le", "pipe:1"],
    { encoding: "buffer", maxBuffer: 128 * 1024 * 1024 },
  );
  if (result.status !== 0) throw new Error(result.stderr.toString() || `ffmpeg failed: ${trackPath}`);
  const count = Math.floor(result.stdout.length / 4);
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i += 1) samples[i] = Math.abs(result.stdout.readFloatLE(i * 4));
  return samples;
}

function onsetEnvelope(samples) {
  const onset = new Float32Array(samples.length);
  let previous = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const start = Math.max(0, i - 3);
    let sum = 0;
    for (let j = start; j <= i; j += 1) sum += samples[j];
    const smoothed = sum / (i - start + 1);
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

function gridScore(onset, bpm, phaseMs) {
  const beatSamples = (60 / bpm) * SAMPLE_RATE;
  const phaseSamples = (phaseMs / 1000) * SAMPLE_RATE;
  const radius = Math.round(0.055 * SAMPLE_RATE);
  let sum = 0;
  let count = 0;
  for (let pos = phaseSamples; pos < onset.length; pos += beatSamples) {
    sum += windowMax(onset, Math.round(pos), radius);
    count += 1;
  }
  return count ? sum / count : 0;
}

function findBeatPhase(onset, bpm) {
  const beatMs = 60000 / bpm;
  let best = { phaseMs: 0, score: -Infinity };
  for (let phaseMs = 0; phaseMs < beatMs; phaseMs += 5) {
    const score = gridScore(onset, bpm, phaseMs);
    if (score > best.score) best = { phaseMs, score };
  }
  return best;
}

function signedGridOffset(timeMs, phaseMs, gridMs) {
  const gridIndex = Math.round((timeMs - phaseMs) / gridMs);
  return timeMs - (phaseMs + gridIndex * gridMs);
}

function summarizeOffsets(offsets) {
  const abs = offsets.map((offset) => Math.abs(offset)).sort((a, b) => a - b);
  return {
    p50: Math.round(quantile(abs, 0.5)),
    p90: Math.round(quantile(abs, 0.9)),
    p99: Math.round(quantile(abs, 0.99)),
    max: Math.round(abs.at(-1) ?? 0),
    within25: Math.round((abs.filter((offset) => offset <= 25).length / Math.max(1, abs.length)) * 100),
    within40: Math.round((abs.filter((offset) => offset <= 40).length / Math.max(1, abs.length)) * 100),
  };
}

function noteGridStats(stage, difficulty, phaseMs, loop = 1) {
  const chart = getStageChart(stage, difficulty, loop);
  const beatMs = 60000 / stage.bpm;
  const subdivisionMs = beatMs / 4;
  const trackOffsetMs = (stage.bgm?.startSeconds ?? 0) * 1000;
  const trackTimes = chart
    .flatMap((note) => (note.type === "hold" ? [note.timeMs, note.timeMs + note.durationMs] : [note.timeMs]))
    .map((timeMs) => timeMs + trackOffsetMs);
  const beatOffsets = trackTimes.map((timeMs) => signedGridOffset(timeMs, phaseMs, beatMs));
  const subdivisionOffsets = trackTimes.map((timeMs) => signedGridOffset(timeMs, phaseMs, subdivisionMs));
  const firstTrackMs = (chart[0]?.timeMs ?? 0) + trackOffsetMs;
  const firstBeatOffset = signedGridOffset(firstTrackMs, phaseMs, beatMs);
  const firstSubdivisionOffset = signedGridOffset(firstTrackMs, phaseMs, subdivisionMs);
  return {
    beat: summarizeOffsets(beatOffsets),
    subdivision: summarizeOffsets(subdivisionOffsets),
    firstBeatOffset: Math.round(firstBeatOffset),
    firstSubdivisionOffset: Math.round(firstSubdivisionOffset),
  };
}

function trackPathFor(stage) {
  const track = BGM_TRACKS[stage.bgm.track];
  if (!track) throw new Error(`${stage.id}: unknown track ${stage.bgm.track}`);
  return track.src.replace("./", "");
}

console.log("Clear timing audit");
for (const [difficulty, profile] of Object.entries(PROFILES)) {
  console.log(`\n${profile.label}`);
  for (const [stageIndex, stage] of STAGES.entries()) {
    const clears = [];
    for (let i = 0; i < RUNS; i += 1) {
      const clearMs = simulateClear(stage, difficulty, (stageIndex + 1) * 1000003 + i * 97);
      if (clearMs != null) clears.push(clearMs / 1000);
    }
    clears.sort((a, b) => a - b);
    const chart = getStageChart(stage, difficulty);
    const endSec = (chart.at(-1).timeMs + (chart.at(-1).durationMs ?? 0)) / 1000;
    const clearRate = clears.length / RUNS;
    const p50 = clears.length ? quantile(clears, 0.5) : null;
    const p90 = clears.length ? quantile(clears, 0.9) : null;
    const p50Rate = p50 == null ? "n/a" : `${Math.round((p50 / endSec) * 100)}%`;
    console.log(
      `${stage.id.padEnd(14)} clear=${Math.round(clearRate * 100)}% p50=${p50?.toFixed(1) ?? "n/a"}s p90=${p90?.toFixed(1) ?? "n/a"}s chartEnd=${endSec.toFixed(1)}s p50At=${p50Rate}`,
    );
  }
}

console.log("\nBGM beat-grid audit (same BGM phase; chart varies by difficulty)");
for (const stage of STAGES) {
  const trackPath = trackPathFor(stage);
  const samples = decodeEnvelope(trackPath);
  const trackSeconds = samples.length / SAMPLE_RATE;
  const onset = onsetEnvelope(samples);
  const beat = findBeatPhase(onset, stage.bpm);
  const parts = ["easy", "normal", "hard"].map((difficulty) => {
    const s = noteGridStats(stage, difficulty, beat.phaseMs);
    return `${difficulty} subP90=${s.subdivision.p90}ms subMax=${s.subdivision.max}ms <=25=${s.subdivision.within25}% <=40=${s.subdivision.within40}% firstBeat=${s.firstBeatOffset}ms`;
  });
  console.log(
    `${stage.id.padEnd(14)} bpm=${String(stage.bpm).padStart(3)} phase=${String(Math.round(beat.phaseMs)).padStart(4)}ms trackDur=${trackSeconds.toFixed(1)}s ${parts.join(" | ")} track=${trackPath}`,
  );
}
