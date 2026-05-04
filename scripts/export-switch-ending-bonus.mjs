import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createEndingBonusChart,
  endingBonusDifficultyConfig,
  endingBonusScoreValue,
  ENDING_BONUS_FALLBACK_DURATION_MS,
  ENDING_BONUS_FIRST_BEAT_MS,
} from "../src/ending-bonus.js";
import { DIFFICULTIES } from "../src/stages.js";
import {
  JUDGE_SCORE,
  judgeHold,
  judgeMash,
  judgeTap,
  MASH_INPUT_GRACE_MS,
  WINDOWS_MS,
} from "../src/rhythm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const outputDir = join(repoRoot, "switch-port", "ending");
const bonusOutputPath = join(outputDir, "ending-bonus.stage.json");
const expectedOutputPath = join(outputDir, "ending-bonus.expected-results.json");
const CHECK_ONLY = process.argv.includes("--check");

const INPUT_GRACE_MS = WINDOWS_MS.bad + 60;
const MASH_DEDUP_MIN_GAP_MS = 70;
const MIN_REALISTIC_MASH_INTERVAL_MS = 105;
const LOOPS = [1, 2];
const DIFFICULTY_IDS = Object.keys(DIFFICULTIES);
const PROFILE_ORDER = ["perfect", "steady", "early", "late", "mash-weak", "mash-heavy"];

const PROFILE_PATTERNS = {
  perfect: {
    tapOffsets: [0],
    holdStartOffsets: [0],
    holdEndOffsets: [0],
    mashModes: ["perfect"],
  },
  steady: {
    tapOffsets: [0, 32, -44, 58, -76, 96, -112],
    holdStartOffsets: [0, 38, -56, 84, -108],
    holdEndOffsets: [0, 46, -64, 102, -118],
    mashModes: ["perfect", "good", "perfect", "good"],
  },
  early: {
    tapOffsets: [-190, -191, -220],
    holdStartOffsets: [-190, -191, -220],
    holdEndOffsets: [-190, -191, -220],
    mashModes: ["perfect"],
  },
  late: {
    tapOffsets: [190, 191, 220],
    holdStartOffsets: [190, 191, 220],
    holdEndOffsets: [190, 191, 220],
    mashModes: ["perfect"],
  },
  "mash-weak": {
    tapOffsets: [0],
    holdStartOffsets: [0],
    holdEndOffsets: [0],
    mashModes: ["miss"],
  },
  "mash-heavy": {
    tapOffsets: [0],
    holdStartOffsets: [0],
    holdEndOffsets: [0],
    mashModes: ["heavy"],
  },
};

function pick(pattern, index) {
  return pattern[index % pattern.length];
}

function typeCounts(chart) {
  return chart.reduce(
    (counts, note) => {
      counts[note.type] += 1;
      return counts;
    },
    { tap: 0, hold: 0, mash: 0 },
  );
}

function normalizeChart(chart, difficulty, loop) {
  return chart.map((note, index) => ({
    id: `ed-l${loop}-${difficulty}-${String(index + 1).padStart(3, "0")}`,
    type: note.type,
    timeMs: Math.round(note.timeMs),
    durationMs: Math.round(note.durationMs ?? 0),
    targetCount: note.type === "mash" ? note.targetCount : 0,
    phraseLabel: note.phraseLabel ?? "",
  }));
}

function summarizeChart(chart) {
  const last = chart.at(-1);
  const mashNotes = chart.filter((note) => note.type === "mash");
  const tightestMashIntervalMs = mashNotes.reduce((min, note) => {
    const requiredIntervalMs = (note.durationMs + MASH_INPUT_GRACE_MS * 2) / Math.max(1, note.targetCount);
    return Math.min(min, requiredIntervalMs);
  }, Infinity);

  return {
    noteCount: chart.length,
    typeCounts: typeCounts(chart),
    firstMs: chart[0]?.timeMs ?? 0,
    lastEndMs: last ? last.timeMs + last.durationMs : 0,
    maxMashTarget: Math.max(...mashNotes.map((note) => note.targetCount), 0),
    tightestMashIntervalMs: Number.isFinite(tightestMashIntervalMs) ? Math.round(tightestMashIntervalMs) : 0,
  };
}

function buildBonusExport() {
  const loops = {};

  for (const loop of LOOPS) {
    const charts = {};
    const difficulty = {};
    for (const difficultyId of DIFFICULTY_IDS) {
      const config = endingBonusDifficultyConfig(difficultyId, loop);
      const chart = normalizeChart(
        createEndingBonusChart(ENDING_BONUS_FALLBACK_DURATION_MS, difficultyId, loop),
        difficultyId,
        loop,
      );
      const chartSummary = summarizeChart(chart);
      if (chartSummary.tightestMashIntervalMs < MIN_REALISTIC_MASH_INTERVAL_MS) {
        throw new Error(
          `Unrealistic ending mash interval: loop=${loop} difficulty=${difficultyId} tightest=${chartSummary.tightestMashIntervalMs}ms`,
        );
      }
      charts[difficultyId] = chart;
      difficulty[difficultyId] = {
        id: difficultyId,
        label: DIFFICULTIES[difficultyId].label,
        beatMs: config.beatMs,
        holdBeats: config.holdBeats,
        mashBeats: config.mashBeats,
        mashTargetBase: config.mashTargetBase,
        mashTargetStep: config.mashTargetStep,
        mashTargetMax: config.mashTargetMax,
        minMashTapIntervalMs: config.minMashTapIntervalMs,
        loopLevel: config.loopLevel,
        chartSummary,
      };
    }
    loops[String(loop)] = { difficulty, charts };
  }

  return {
    schemaVersion: 1,
    gameId: "jii-kobushi",
    exportId: "switch-ending-bonus",
    ending: {
      id: "ending-bonus",
      title: "ED拍ボーナス",
      description: "ED動画の音声をBGMとして使う本編同型のボーナスリズムゲーム。",
      firstLoopVideoSrc: "./assets/video/ending.mp4",
      loopPlusVideoSrc: "./assets/video/ending-loop2.mp4",
      fallbackDurationMs: ENDING_BONUS_FALLBACK_DURATION_MS,
      firstBeatMs: ENDING_BONUS_FIRST_BEAT_MS,
    },
    rhythm: {
      noteTypes: ["tap", "hold", "mash"],
      windowsMs: WINDOWS_MS,
      inputGraceMs: INPUT_GRACE_MS,
      mashInputGraceMs: MASH_INPUT_GRACE_MS,
      mashDedupMinGapMs: MASH_DEDUP_MIN_GAP_MS,
      judgeScore: JUDGE_SCORE,
      scoring: {
        rankScoreThresholds: {},
        perfectBase: 140,
        perfectComboCap: 180,
        goodBase: 90,
        goodComboCap: 120,
        badBase: 35,
        badComboCap: 60,
      },
    },
    loops,
  };
}

function makeMashTaps(note, mode, rhythm) {
  if (mode === "miss") return [];
  const count =
    mode === "perfect"
      ? note.targetCount
      : mode === "good"
        ? Math.max(0, note.targetCount - 1)
        : mode === "heavy"
          ? note.targetCount + 3
          : Math.max(0, note.targetCount - 3);
  const start = note.timeMs - rhythm.mashInputGraceMs + 10;
  const availableMs = note.durationMs + rhythm.mashInputGraceMs * 2 - 20;
  const safeGap = Math.max(rhythm.mashDedupMinGapMs, Math.floor(availableMs / Math.max(1, count)));
  return Array.from({ length: count }, (_, index) => start + index * safeGap);
}

function simulateNote(note, noteIndex, profile, rhythm) {
  if (note.type === "tap") {
    const inputAtMs = note.timeMs + pick(profile.tapOffsets, noteIndex);
    return judgeTap(note, inputAtMs);
  }
  if (note.type === "hold") {
    const downAtMs = note.timeMs + pick(profile.holdStartOffsets, noteIndex);
    const upAtMs = note.timeMs + note.durationMs + pick(profile.holdEndOffsets, noteIndex);
    return judgeHold(note, downAtMs, upAtMs);
  }
  if (note.type === "mash") {
    const mode = pick(profile.mashModes, noteIndex);
    return judgeMash(note, makeMashTaps(note, mode, rhythm));
  }
  throw new Error(`Unsupported ending note type: ${note.type}`);
}

function countStats(results) {
  return results.reduce(
    (stats, entry) => {
      stats[entry.rank] += 1;
      return stats;
    },
    { perfect: 0, good: 0, bad: 0, miss: 0 },
  );
}

function countMissByType(results) {
  return results.reduce(
    (missByType, entry) => {
      if (entry.rank === "miss") missByType[entry.type] += 1;
      return missByType;
    },
    { tap: 0, hold: 0, mash: 0 },
  );
}

function simulateChart(chart, profileName, rhythm) {
  const profile = PROFILE_PATTERNS[profileName];
  const resolved = [];
  const samples = [];
  let combo = 0;
  let bestCombo = 0;
  let score = 0;
  let hits = 0;
  let misses = 0;

  for (const [index, note] of chart.entries()) {
    const result = simulateNote(note, index, profile, rhythm);
    if (result.rank === "miss") {
      combo = 0;
      misses += 1;
    } else {
      combo += 1;
      hits += 1;
      score += endingBonusScoreValue(result.rank, combo);
    }
    bestCombo = Math.max(bestCombo, combo);

    const entry = {
      rank: result.rank,
      noteId: note.id,
      type: note.type,
      noteTimeMs: note.timeMs,
      detail:
        note.type === "mash"
          ? `${result.count}/${result.targetCount}`
          : `${result.offsetMs}ms`,
    };
    resolved.push(entry);
    if (index < 3 || index >= chart.length - 3) samples.push(entry);
  }

  return {
    noteCount: chart.length,
    typeCounts: typeCounts(chart),
    stats: countStats(resolved),
    missByType: countMissByType(resolved),
    hits,
    misses,
    bestCombo,
    score,
    samples,
  };
}

function buildExpectedResults(payload) {
  const loops = {};
  for (const loop of LOOPS) {
    const profiles = {};
    for (const profile of PROFILE_ORDER) {
      profiles[profile] = {};
      for (const difficulty of DIFFICULTY_IDS) {
        profiles[profile][difficulty] = simulateChart(payload.loops[String(loop)].charts[difficulty], profile, payload.rhythm);
      }
    }
    loops[String(loop)] = { profiles };
  }

  return {
    source: {
      command: "npm run export:switch-ending-bonus",
      endingJson: "switch-port/ending/ending-bonus.stage.json",
      date: "2026-05-04",
    },
    ending: payload.ending,
    timing: {
      firstBeatMs: payload.ending.firstBeatMs,
      fallbackDurationMs: payload.ending.fallbackDurationMs,
      windowsMs: payload.rhythm.windowsMs,
      inputGraceMs: payload.rhythm.inputGraceMs,
      mashInputGraceMs: payload.rhythm.mashInputGraceMs,
      mashDedupMinGapMs: payload.rhythm.mashDedupMinGapMs,
    },
    loops,
  };
}

function writeOrCheck(path, content) {
  if (CHECK_ONLY) {
    if (!existsSync(path)) {
      throw new Error(`Missing ending export: ${path}`);
    }
    if (readFileSync(path, "utf8") !== content) {
      throw new Error(`Outdated ending export: ${path}`);
    }
    return;
  }
  writeFileSync(path, content);
}

mkdirSync(outputDir, { recursive: true });

const bonusExport = buildBonusExport();
const expectedResults = buildExpectedResults(bonusExport);

writeOrCheck(bonusOutputPath, `${JSON.stringify(bonusExport, null, 2)}\n`);
writeOrCheck(expectedOutputPath, `${JSON.stringify(expectedResults, null, 2)}\n`);

console.log(`switch ending bonus ${CHECK_ONLY ? "validated" : "ok"}: ${LOOPS.length} loops, ${DIFFICULTY_IDS.length} difficulties`);
