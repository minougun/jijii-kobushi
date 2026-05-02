import { DIFFICULTIES } from "../src/stages.js";
import { createEndingBonusChart, endingBonusDifficultyConfig, endingBonusScoreValue, ENDING_BONUS_FALLBACK_DURATION_MS } from "../src/ending-bonus.js";

const RUNS = 10000;
const MIN_REALISTIC_MASH_INTERVAL_MS = 105;

const PLAYER_PROFILES = {
  casual: {
    label: "Casual",
    timingStdMs: 118,
    holdStdMs: 125,
    mashTapIntervalMs: 155,
    mashJitterMs: 26,
    panicChance: 0.1,
  },
  steady: {
    label: "Steady",
    timingStdMs: 86,
    holdStdMs: 92,
    mashTapIntervalMs: 128,
    mashJitterMs: 20,
    panicChance: 0.055,
  },
  skilled: {
    label: "Skilled",
    timingStdMs: 62,
    holdStdMs: 70,
    mashTapIntervalMs: 104,
    mashJitterMs: 15,
    panicChance: 0.025,
  },
};

const MODE_MATCHED_PROFILE = {
  easy: PLAYER_PROFILES.casual,
  normal: PLAYER_PROFILES.steady,
  hard: PLAYER_PROFILES.skilled,
};

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function gaussian(random) {
  const u1 = Math.max(1e-9, random());
  const u2 = Math.max(1e-9, random());
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function judgeOffset(offsetMs) {
  const abs = Math.abs(offsetMs);
  if (abs <= 60) return "perfect";
  if (abs <= 120) return "good";
  if (abs <= 190) return "bad";
  return "miss";
}

function lowerRank(a, b) {
  const order = { miss: 0, bad: 1, good: 2, perfect: 3 };
  return order[a] <= order[b] ? a : b;
}

function judgeMash(note, taps) {
  const start = note.timeMs - 80;
  const end = note.timeMs + note.durationMs + 80;
  let count = 0;
  let lastCounted = -Infinity;
  for (const time of taps) {
    if (time < start || time > end) continue;
    if (time - lastCounted < 70) continue;
    count += 1;
    lastCounted = time;
  }
  if (count >= note.targetCount) return { rank: count > note.targetCount + 2 ? "good" : "perfect", count };
  if (count >= note.targetCount - 1) return { rank: "good", count };
  if (count >= note.targetCount - 3) return { rank: "bad", count };
  return { rank: "miss", count };
}

function simulateNote(note, profile, random, pressure) {
  if (random() < profile.panicChance * pressure) return { rank: "miss", count: 0 };
  if (note.type === "tap") {
    const offset = Math.round(gaussian(random) * profile.timingStdMs * pressure);
    return { rank: judgeOffset(offset), count: 1 };
  }
  if (note.type === "hold") {
    const startOffset = Math.round(gaussian(random) * profile.timingStdMs * pressure);
    const endOffset = Math.round(gaussian(random) * profile.holdStdMs * pressure);
    return { rank: lowerRank(judgeOffset(startOffset), judgeOffset(endOffset)), count: 1 };
  }
  const taps = [];
  const start = note.timeMs - 40 + gaussian(random) * 28 * pressure;
  const interval = Math.max(76, profile.mashTapIntervalMs * pressure + gaussian(random) * profile.mashJitterMs);
  for (let time = start; time <= note.timeMs + note.durationMs + 50; time += Math.max(70, interval + gaussian(random) * profile.mashJitterMs)) {
    if (random() > 0.04 * pressure) taps.push(time);
  }
  return judgeMash(note, taps);
}

function simulateRun(chart, profile, seed, difficulty, loop) {
  const random = rng(seed);
  const tuning = endingBonusDifficultyConfig(difficulty, loop);
  const pressure = 1 + tuning.loopLevel * 0.08 + (difficulty === "hard" ? 0.05 : difficulty === "easy" ? -0.04 : 0);
  const stats = { perfect: 0, good: 0, bad: 0, miss: 0 };
  let combo = 0;
  let bestCombo = 0;
  let score = 0;
  let mashCountTotal = 0;
  for (const note of chart) {
    const result = simulateNote(note, profile, random, pressure);
    stats[result.rank] += 1;
    if (note.type === "mash") mashCountTotal += result.count;
    if (result.rank === "miss") {
      combo = 0;
      continue;
    }
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);
    score += endingBonusScoreValue(result.rank, combo);
  }
  return { score, bestCombo, stats, mashCountTotal };
}

function quantile(values, q) {
  const index = Math.max(0, Math.min(values.length - 1, Math.floor((values.length - 1) * q)));
  return values[index];
}

function summarize(difficulty, loop, profile) {
  const chart = createEndingBonusChart(ENDING_BONUS_FALLBACK_DURATION_MS, difficulty, loop);
  const scores = [];
  const combos = [];
  const totals = { perfect: 0, good: 0, bad: 0, miss: 0 };
  for (let i = 0; i < RUNS; i += 1) {
    const result = simulateRun(chart, profile, (loop * 1009 + i) * (difficulty.length + 17), difficulty, loop);
    scores.push(result.score);
    combos.push(result.bestCombo);
    for (const key of Object.keys(totals)) totals[key] += result.stats[key];
  }
  scores.sort((a, b) => a - b);
  combos.sort((a, b) => a - b);
  const totalNotes = chart.length * RUNS;
  const typeCounts = chart.reduce(
    (acc, note) => {
      acc[note.type] += 1;
      return acc;
    },
    { tap: 0, hold: 0, mash: 0 },
  );
  const mashNotes = chart.filter((note) => note.type === "mash");
  const tightestMashIntervalMs = mashNotes.reduce((min, note) => {
    const requiredIntervalMs = (note.durationMs + 160) / Math.max(1, note.targetCount);
    return Math.min(min, requiredIntervalMs);
  }, Infinity);
  const hitRate = 1 - totals.miss / totalNotes;
  const perfectRate = totals.perfect / totalNotes;
  return {
    difficulty,
    loop,
    notes: chart.length,
    typeCounts,
    hitRate,
    perfectRate,
    scoreP10: quantile(scores, 0.1),
    scoreP50: quantile(scores, 0.5),
    scoreP90: quantile(scores, 0.9),
    comboP50: quantile(combos, 0.5),
    maxMashTarget: Math.max(...mashNotes.map((note) => note.targetCount), 0),
    tightestMashIntervalMs,
  };
}

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

function printModeMatched() {
  console.log("ED bonus mode-matched balance");
  let hasUnrealisticMash = false;
  for (const loop of [1, 2]) {
    console.log(`\nloop ${loop}`);
    for (const difficulty of Object.keys(DIFFICULTIES)) {
      const summary = summarize(difficulty, loop, MODE_MATCHED_PROFILE[difficulty]);
      if (summary.tightestMashIntervalMs < MIN_REALISTIC_MASH_INTERVAL_MS) hasUnrealisticMash = true;
      console.log(
        `${difficulty.padEnd(6)} notes=${String(summary.notes).padStart(3)} tap/hold/mash=${summary.typeCounts.tap}/${summary.typeCounts.hold}/${summary.typeCounts.mash} maxMash=${String(summary.maxMashTarget).padStart(2)} tightMash=${String(Math.round(summary.tightestMashIntervalMs)).padStart(3)}ms hit=${pct(summary.hitRate).padStart(4)} perfect=${pct(summary.perfectRate).padStart(4)} score[p10=${String(summary.scoreP10).padStart(5)}, p50=${String(summary.scoreP50).padStart(5)}, p90=${String(summary.scoreP90).padStart(5)}] combo[p50=${String(summary.comboP50).padStart(3)}]`,
      );
    }
  }
  if (hasUnrealisticMash) {
    console.error(`\nERROR: ED bonus contains mash notes tighter than ${MIN_REALISTIC_MASH_INTERVAL_MS}ms/tap.`);
    process.exitCode = 1;
  }
}

function printCrossProfile() {
  console.log("\nED bonus cross-profile check");
  for (const [profileId, profile] of Object.entries(PLAYER_PROFILES)) {
    console.log(`\n${profile.label}`);
    for (const loop of [1, 2]) {
      const line = Object.keys(DIFFICULTIES)
        .map((difficulty) => {
          const summary = summarize(difficulty, loop, profile);
          return `${difficulty}:hit${pct(summary.hitRate)}/p50${summary.scoreP50}`;
        })
        .join("  ");
      console.log(`loop${loop} ${line}`);
    }
  }
}

printModeMatched();
printCrossProfile();
