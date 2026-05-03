import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { BGM_TRACKS } from "../src/audio.js";
import {
  DIFFICULTIES,
  STAGES,
  damageScaleForDifficulty,
  getStageChart,
  loopEnemyAttackMultiplier,
  loopEnemyHpMultiplier,
  loopPlayerDamageMultiplier,
} from "../src/stages.js";
import {
  JUDGE_SCORE,
  MASH_INPUT_GRACE_MS,
  NOTE_TYPES,
  SPIRIT_FOCUS_DURATION_MS,
  SPIRIT_FOCUS_WINDOW_BONUS_MS,
  WINDOWS_MS,
  comboBonusDamage,
  finisherBonusDamage,
  mashStrikeMultiplier,
  noteDamage,
  noteSpirit,
  rankScore,
} from "../src/rhythm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const outputPath = join(
  repoRoot,
  "docs",
  "exports",
  "switch-stage1-shotengai.stage.json",
);

const EXPORT_TOOL_VERSION = 1;
const GAME_ID = "jii-kobushi";
const STAGE_ID = "shotengai";
const COUNT_IN_LEAD_SECONDS = 3.0;
const PLAYER_MAX_HP = 12;
const INPUT_GRACE_MS = WINDOWS_MS.bad + 60;
const MASH_DEDUP_MIN_GAP_MS = 70;
const BATTLE_DURATION_PADDING_MS = 1800;
const BGM_STOP_PADDING_MS = 900;
const EXPECTED_STAGE_INDEX = 0;

function gitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function gitDirtyFiles(files) {
  try {
    return execFileSync("git", ["status", "--short", "--", ...files], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function typeCounts(chart) {
  return chart.reduce((acc, note) => {
    acc[note.type] = (acc[note.type] ?? 0) + 1;
    return acc;
  }, {});
}

function normalizeNote(note, difficulty, index) {
  return {
    id: `${difficulty}-${String(index + 1).padStart(4, "0")}`,
    type: note.type,
    timeMs: note.timeMs,
    durationMs: note.durationMs ?? 0,
    targetCount: note.targetCount ?? 0,
    phraseLabel: note.phraseLabel ?? "",
    callText: note.callText ?? "",
    responseText: note.responseText ?? "",
    enemyCue: Boolean(note.enemyCue),
    phraseRole: note.phraseRole ?? "",
    phraseStep: note.phraseStep ?? index,
    finisher: Boolean(note.finisher),
  };
}

function chartSummary(chart) {
  const last = chart.at(-1);
  return {
    noteCount: chart.length,
    typeCounts: typeCounts(chart),
    firstMs: chart[0]?.timeMs ?? 0,
    lastEndMs: last ? last.timeMs + (last.durationMs ?? 0) : 0,
  };
}

function difficultyPayload(stage) {
  return Object.fromEntries(
    Object.entries(DIFFICULTIES).map(([difficulty, config]) => {
      const chart = getStageChart(stage, difficulty);
      return [
        difficulty,
        {
          id: config.id,
          label: config.label,
          description: config.description,
          density: config.density,
          damageFactor: config.damageFactor,
          burstTapGapMs: config.burstTapGapMs,
          tapRunEvery: config.tapRunEvery,
          tapRunGapMs: config.tapRunGapMs,
          damageScale: damageScaleForDifficulty(stage, difficulty),
          loop1: {
            enemyHpMultiplier: loopEnemyHpMultiplier(1, stage, difficulty),
            playerDamageMultiplier: loopPlayerDamageMultiplier(1, stage, difficulty),
            enemyAttackMultiplier: loopEnemyAttackMultiplier(1, stage, difficulty),
          },
          chartSummary: chartSummary(chart),
        },
      ];
    }),
  );
}

function chartPayload(stage) {
  return Object.fromEntries(
    Object.keys(DIFFICULTIES).map((difficulty) => [
      difficulty,
      getStageChart(stage, difficulty).map((note, index) =>
        normalizeNote(note, difficulty, index),
      ),
    ]),
  );
}

function scoringFixtures() {
  return {
    rankScoreThresholds: {
      S: 8400,
      A: 7000,
      B: 5400,
      C: 0,
    },
    sampleFunctionOutputs: {
      noteDamage: {
        perfect: noteDamage("perfect"),
        good: noteDamage("good"),
        bad: noteDamage("bad"),
        miss: noteDamage("miss"),
      },
      noteSpirit: {
        perfect: noteSpirit("perfect"),
        good: noteSpirit("good"),
        bad: noteSpirit("bad"),
        miss: noteSpirit("miss"),
      },
      comboBonusDamage: {
        combo4Base3: comboBonusDamage(4, 3),
        combo5Base3: comboBonusDamage(5, 3),
        combo10Base3: comboBonusDamage(10, 3),
        combo10Base1: comboBonusDamage(10, 1),
      },
      mashStrikeMultiplierPerfect6Of5: mashStrikeMultiplier("perfect", 6, 5),
      finisherBonusDamage: {
        perfect: finisherBonusDamage({ finisher: true }, "perfect"),
        good: finisherBonusDamage({ finisher: true }, "good"),
        bad: finisherBonusDamage({ finisher: true }, "bad"),
        miss: finisherBonusDamage({ finisher: true }, "miss"),
      },
      rankScore: {
        score8400: rankScore(8400),
        score8399: rankScore(8399),
        score7000: rankScore(7000),
        score5400: rankScore(5400),
        score3000: rankScore(3000),
      },
    },
  };
}

function buildExport() {
  const stage = STAGES[EXPECTED_STAGE_INDEX];
  if (!stage || stage.id !== STAGE_ID) {
    throw new Error(`Expected Stage 1 ${STAGE_ID}, got ${stage?.id ?? "missing"}`);
  }

  const bgmTrack = BGM_TRACKS[stage.bgm.track];
  if (!bgmTrack) {
    throw new Error(`Unknown BGM track: ${stage.bgm.track}`);
  }
  const sourceFiles = [
    "src/stages.js",
    "src/rhythm.js",
    "src/audio.js",
    "src/main.js",
  ];
  const sourceDirtyFiles = gitDirtyFiles(sourceFiles);

  return {
    schemaVersion: 1,
    gameId: GAME_ID,
    exportId: "switch-stage1-shotengai",
    exportToolVersion: EXPORT_TOOL_VERSION,
    generatedAt: new Date().toISOString(),
    sourceGitCommit: gitCommit(),
    sourceFiles,
    sourceWorktreeDirty: sourceDirtyFiles.length > 0,
    sourceDirtyFiles,
    stage: {
      id: stage.id,
      index: EXPECTED_STAGE_INDEX,
      title: stage.title,
      bpm: stage.bpm,
      travelMs: stage.travelMs,
      palette: stage.palette,
    },
    scenario: {
      introLines: stage.introLines,
      restLine: stage.restLine,
      clearLine: stage.clearLine,
    },
    enemy: stage.enemy,
    audio: {
      bgm: {
        ...stage.bgm,
        assetKey: `audio/${stage.bgm.track}`,
        assetSrc: bgmTrack.src,
        trackVolume: bgmTrack.volume,
      },
      timing: {
        countInLeadSeconds: COUNT_IN_LEAD_SECONDS,
        chartStartReference: "battle_clock_ms",
        battleDurationPaddingMs: BATTLE_DURATION_PADDING_MS,
        bgmStopPaddingMs: BGM_STOP_PADDING_MS,
        inputOffsetMsDefault: 0,
      },
    },
    rhythm: {
      noteTypes: [...NOTE_TYPES],
      windowsMs: WINDOWS_MS,
      inputGraceMs: INPUT_GRACE_MS,
      mashInputGraceMs: MASH_INPUT_GRACE_MS,
      mashDedupMinGapMs: MASH_DEDUP_MIN_GAP_MS,
      spiritFocusDurationMs: SPIRIT_FOCUS_DURATION_MS,
      spiritFocusWindowBonusMs: SPIRIT_FOCUS_WINDOW_BONUS_MS,
      judgeScore: JUDGE_SCORE,
      scoring: scoringFixtures(),
    },
    player: {
      maxHp: PLAYER_MAX_HP,
    },
    chartConfig: stage.chartConfig,
    difficulty: difficultyPayload(stage),
    charts: chartPayload(stage),
    saveSnapshotSchema: {
      schemaVersion: 1,
      kind: "stage1_vertical_slice",
      difficulty: "easy|normal|hard",
      loop: "integer >= 1",
      stageId: STAGE_ID,
      stageIndex: EXPECTED_STAGE_INDEX,
      hp: `integer 1-${PLAYER_MAX_HP}`,
      maxHp: PLAYER_MAX_HP,
      spirit: "integer 0-100",
      inputOffsetMs: "integer",
      bestResults: "record keyed by stage id",
    },
    excludedFromThisExport: [
      "nintendo_sdk",
      "unity_runtime_implementation",
      "switch_runtime_implementation",
      "canvas_renderer",
      "web_audio_runtime",
      "dom_localstorage_video",
      "stages_2_to_7",
      "ending_bonus",
      "external_application",
      "push",
      "deploy",
    ],
  };
}

const payload = buildExport();
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(outputPath);
