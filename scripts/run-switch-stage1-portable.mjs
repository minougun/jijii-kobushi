import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateStageScore,
  judgeHold,
  judgeMash,
  judgeTap,
  rankScore,
} from "../src/rhythm.js";

const DEFAULT_EXPORT_PATH = "docs/exports/switch-stage1-shotengai.stage.json";
const DIFFICULTIES = ["easy", "normal", "hard"];

const PROFILE_ORDER = [
  "perfect",
  "steady",
  "early",
  "late",
  "mash-weak",
  "mash-heavy",
];

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
  const target = note.targetCount;
  const minGap = rhythm.mashDedupMinGapMs;
  if (mode === "miss") {
    return [];
  }
  const count =
    mode === "perfect"
      ? target
      : mode === "good"
        ? Math.max(0, target - 1)
        : mode === "heavy"
          ? target + 3
          : Math.max(0, target - 3);
  const start = note.timeMs - rhythm.mashInputGraceMs + 10;
  const availableMs = note.durationMs + rhythm.mashInputGraceMs * 2 - 20;
  const safeGap = Math.max(minGap, Math.floor(availableMs / Math.max(1, count)));
  return Array.from({ length: count }, (_, index) =>
    start + index * safeGap,
  );
}

function simulateNote(note, noteIndex, profile, rhythm) {
  if (note.type === "tap") {
    const inputAtMs = note.timeMs + pick(profile.tapOffsets, noteIndex);
    return {
      kind: "tap",
      inputOffsetMs: inputAtMs - note.timeMs,
      inputAtMs,
      result: judgeTap(note, inputAtMs),
    };
  }

  if (note.type === "hold") {
    const downAtMs = note.timeMs + pick(profile.holdStartOffsets, noteIndex);
    const upAtMs =
      note.timeMs + note.durationMs + pick(profile.holdEndOffsets, noteIndex);
    return {
      kind: "hold",
      startOffsetMs: downAtMs - note.timeMs,
      endOffsetMs: upAtMs - (note.timeMs + note.durationMs),
      downAtMs,
      upAtMs,
      result: judgeHold(note, downAtMs, upAtMs),
    };
  }

  if (note.type === "mash") {
    const mode = pick(profile.mashModes, noteIndex);
    const tapTimesMs = makeMashTaps(note, mode, rhythm);
    return {
      kind: "mash",
      mode,
      tapTimesMs,
      inputCount: tapTimesMs.length,
      result: judgeMash(note, tapTimesMs),
    };
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
  const countInMs = payload.audio.timing.countInLeadSeconds * 1000;
  const resolved = [];
  const samples = [];
  let combo = 0;
  let maxCombo = 0;
  let hp = payload.player.maxHp;
  let hpDamageTaken = 0;

  for (const [index, note] of chart.entries()) {
    const simulated = simulateNote(note, index, profile, payload.rhythm);
    const rank = simulated.result.rank;
    if (rank === "miss" && note.type !== "mash") {
      const damage =
        payload.enemy.attackPower *
        payload.difficulty[difficulty].loop1.enemyAttackMultiplier;
      hp = Math.max(0, hp - damage);
      hpDamageTaken += damage;
    }
    if (rank === "miss") {
      combo = 0;
    } else {
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
    }
    const resolvedEntry = {
      rank,
      noteId: note.id,
      type: note.type,
      noteTimeMs: note.timeMs,
      timelineMs: countInMs + note.timeMs,
      detail:
        note.type === "mash"
          ? `${simulated.result.count}/${simulated.result.targetCount} mode=${simulated.mode}`
          : `${simulated.result.offsetMs}ms`,
    };
    resolved.push(resolvedEntry);
    if (index < 3 || index >= chart.length - 3) {
      samples.push(resolvedEntry);
    }
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
  const rank = rankScore(score);
  const last = chart.at(-1);
  const lastEndMs = last.timeMs + last.durationMs;
  const finishTimelineMs =
    countInMs + lastEndMs + payload.audio.timing.battleDurationPaddingMs;

  return {
    difficulty,
    profile: profileName,
    countInMs,
    chartStartTimelineMs: countInMs,
    finishTimelineMs,
    noteCount: chart.length,
    typeCounts: payload.difficulty[difficulty].chartSummary.typeCounts,
    stats,
    missByType,
    maxCombo,
    remainingHp: hp,
    hpDamageTaken,
    clear: hp > 0,
    score,
    rank,
    samples,
  };
}

function validateBoundaryExpectations(rhythm) {
  const note = { id: "boundary", type: "tap", timeMs: 1000 };
  assert.equal(judgeTap(note, note.timeMs - rhythm.windowsMs.bad).rank, "bad");
  assert.equal(judgeTap(note, note.timeMs - rhythm.windowsMs.bad - 1).rank, "miss");
  assert.equal(judgeTap(note, note.timeMs + rhythm.windowsMs.bad).rank, "bad");
  assert.equal(judgeTap(note, note.timeMs + rhythm.windowsMs.bad + 1).rank, "miss");
}

function validateRunnerExpectations(payload, results) {
  validateBoundaryExpectations(payload.rhythm);

  for (const difficulty of DIFFICULTIES) {
    const perfect = results.find(
      (result) => result.profile === "perfect" && result.difficulty === difficulty,
    );
    assert.ok(perfect, `missing perfect result for ${difficulty}`);
    assert.equal(perfect.rank, "S", `perfect ${difficulty} must rank S`);
    assert.equal(perfect.stats.miss, 0, `perfect ${difficulty} must have miss 0`);
    assert.equal(perfect.clear, true, `perfect ${difficulty} must clear`);

    for (const profile of ["early", "late"]) {
      const result = results.find(
        (entry) => entry.profile === profile && entry.difficulty === difficulty,
      );
      assert.ok(result, `missing ${profile} result for ${difficulty}`);
      assert.ok(
        result.stats.bad > 0,
        `${profile} ${difficulty} must include Bad judgments at the bad boundary`,
      );
      assert.ok(
        result.stats.miss > 0,
        `${profile} ${difficulty} must include Miss judgments beyond the bad boundary`,
      );
    }

    const mashWeak = results.find(
      (result) => result.profile === "mash-weak" && result.difficulty === difficulty,
    );
    assert.ok(mashWeak, `missing mash-weak result for ${difficulty}`);
    assert.equal(
      mashWeak.missByType.mash,
      payload.difficulty[difficulty].chartSummary.typeCounts.mash,
      `mash-weak ${difficulty} must miss every mash note`,
    );
    assert.equal(
      mashWeak.missByType.tap,
      0,
      `mash-weak ${difficulty} must not miss tap notes`,
    );
    assert.equal(
      mashWeak.missByType.hold,
      0,
      `mash-weak ${difficulty} must not miss hold notes`,
    );
  }
}

function printRun(payload, results) {
  console.log(
    `stage=${payload.stage.id} location=${payload.stage.locationName ?? ""} title=${payload.stage.title} bgm=${payload.audio.bgm.track} path=${payload.audio.bgm.assetSrc}`,
  );
  console.log(
    `countIn=${payload.audio.timing.countInLeadSeconds}s hp=${payload.player.maxHp} inputGrace=${payload.rhythm.inputGraceMs} windows=${JSON.stringify(payload.rhythm.windowsMs)}`,
  );
  for (const result of results) {
    console.log(
      [
        `profile=${result.profile}`,
        `difficulty=${result.difficulty}`,
        `clear=${result.clear}`,
        `notes=${result.noteCount}`,
        `types=${JSON.stringify(result.typeCounts)}`,
        `stats=${JSON.stringify(result.stats)}`,
        `missByType=${JSON.stringify(result.missByType)}`,
        `maxCombo=${result.maxCombo}`,
        `hp=${result.remainingHp}/${payload.player.maxHp}`,
        `hpDamageTaken=${result.hpDamageTaken}`,
        `score=${result.score}`,
        `rank=${result.rank}`,
        `finishTimelineMs=${result.finishTimelineMs}`,
      ].join(" "),
    );
    for (const sample of result.samples) {
      console.log(
        `  ${sample.noteId} t=${sample.timelineMs}ms ${sample.type} => ${sample.rank} ${sample.detail}`,
      );
    }
  }
}

const exportPath = process.argv[2] ?? DEFAULT_EXPORT_PATH;
const payload = readJson(exportPath);
const results = PROFILE_ORDER.flatMap((profile) =>
  DIFFICULTIES.map((difficulty) => simulateDifficulty(payload, difficulty, profile)),
);
validateRunnerExpectations(payload, results);
printRun(payload, results);
console.log("runnerExpectations=pass");
