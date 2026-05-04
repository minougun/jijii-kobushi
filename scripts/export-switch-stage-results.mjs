import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateStageScore,
  judgeHold,
  judgeMash,
  judgeTap,
  rankScore,
} from "../src/rhythm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const inputDir = join(repoRoot, "switch-port", "stages");
const outputDir = inputDir;
const CHECK_ONLY = process.argv.includes("--check");

const DIFFICULTIES = ["easy", "normal", "hard"];
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

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function pick(pattern, index) {
  return pattern[index % pattern.length];
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
  throw new Error(`Unsupported note type: ${note.type}`);
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

function simulateDifficulty(payload, difficulty, profileName) {
  const chart = payload.charts[difficulty];
  const profile = PROFILE_PATTERNS[profileName];
  const resolved = [];
  let combo = 0;
  let maxCombo = 0;
  let hp = payload.player.maxHp;
  let hpDamageTaken = 0;

  for (const [index, note] of chart.entries()) {
    const result = simulateNote(note, index, profile, payload.rhythm);
    const rank = result.rank;
    if (rank === "miss" && note.type !== "mash") {
      const damage = payload.enemy.attackPower * payload.difficulty[difficulty].loop1.enemyAttackMultiplier;
      hp = Math.max(0, hp - damage);
      hpDamageTaken += damage;
    }
    if (rank === "miss") {
      combo = 0;
    } else {
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
    }
    resolved.push({ rank, type: note.type });
  }

  const stats = countStats(resolved);
  const missByType = countMissByType(resolved);
  const score = calculateStageScore({
    notes: resolved,
    totalNotes: chart.length,
    maxCombo,
    hp,
    maxHp: payload.player.maxHp,
  });

  return {
    clear: hp > 0,
    score,
    rank: rankScore(score),
    maxCombo,
    stats,
    missByType,
    hp: {
      remaining: hp,
      max: payload.player.maxHp,
    },
    hpDamageTaken,
  };
}

function buildExpected(payload, sourceFile) {
  const first = payload.charts.easy[0];
  const countInMs = Math.round(payload.audio.timing.countInLeadSeconds * 1000);
  const profiles = Object.fromEntries(
    PROFILE_ORDER.map((profile) => [
      profile,
      Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, simulateDifficulty(payload, difficulty, profile)])),
    ]),
  );

  return {
    source: {
      command: "npm run export:switch-stage-results",
      stageJson: `switch-port/stages/${sourceFile}`,
      date: "2026-05-04",
    },
    stage: {
      id: payload.stage.id,
      index: payload.stage.index,
      title: payload.stage.title,
      locationName: payload.stage.locationName,
    },
    timing: {
      countInMs,
      firstNoteBattleMs: first.timeMs,
      firstNoteVirtualMs: countInMs + first.timeMs,
      windowsMs: payload.rhythm.windowsMs,
      inputGraceMs: payload.rhythm.inputGraceMs,
      mashInputGraceMs: payload.rhythm.mashInputGraceMs,
      mashDedupMinGapMs: payload.rhythm.mashDedupMinGapMs,
    },
    profiles,
  };
}

mkdirSync(outputDir, { recursive: true });

const stageFiles = readdirSync(inputDir)
  .filter((file) => /^stage\d{2}-.*\.stage\.json$/.test(file))
  .sort();

if (!stageFiles.length) {
  throw new Error(`No stage exports found in ${inputDir}`);
}

for (const stageFile of stageFiles) {
  const payload = readJson(join(inputDir, stageFile));
  const outputFile = stageFile.replace(".stage.json", ".expected-results.json");
  const outputPath = join(outputDir, outputFile);
  const content = `${JSON.stringify(buildExpected(payload, stageFile), null, 2)}\n`;
  if (CHECK_ONLY) {
    if (!existsSync(outputPath)) {
      throw new Error(`Missing expected results: ${outputFile}`);
    }
    if (readFileSync(outputPath, "utf8") !== content) {
      throw new Error(`Outdated expected results: ${outputFile}`);
    }
  } else {
    writeFileSync(outputPath, content);
  }
  console.log(outputFile);
}

console.log(`switch stage expected results ${CHECK_ONLY ? "validated" : "ok"}: ${stageFiles.length} stages`);
