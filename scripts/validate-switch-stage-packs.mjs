import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
} from "../src/rhythm.js";

const GAME_ID = "jii-kobushi";
const MAIN_SOURCE = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const INPUT_GRACE_EXTRA_MS = 60;
const MASH_DEDUP_MIN_GAP_MS = 70;

const forbiddenKeys = new Set([
  "document",
  "window",
  "localStorage",
  "canvas",
  "ctx",
  "video",
  "pointerEvent",
  "keyboardEvent",
]);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function mainNumberConstant(name) {
  const match = MAIN_SOURCE.match(new RegExp(`const\\s+${name}\\s*=\\s*([0-9.]+);`));
  assert.ok(match, `missing main.js constant: ${name}`);
  return Number(match[1]);
}

function mainInputGraceMs() {
  const match = MAIN_SOURCE.match(
    /const\s+INPUT_GRACE_MS\s*=\s*WINDOWS_MS\.bad\s*\+\s*([0-9.]+);/,
  );
  assert.ok(match, "missing main.js INPUT_GRACE_MS formula");
  return WINDOWS_MS.bad + Number(match[1]);
}

function typeCounts(chart) {
  return chart.reduce((acc, note) => {
    acc[note.type] = (acc[note.type] ?? 0) + 1;
    return acc;
  }, {});
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

function normalizeSourceNote(note, difficulty, index) {
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

function assertNoForbiddenKeys(value, path = "$") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenKeys(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    assert.ok(!forbiddenKeys.has(key), `forbidden browser/runtime key at ${path}.${key}`);
    assertNoForbiddenKeys(entry, `${path}.${key}`);
  }
}

function assertChart(difficulty, chart, sourceChart, label = difficulty) {
  const summary = chartSummary(sourceChart);
  assert.ok(Array.isArray(chart), `${label}: chart must be an array`);
  assert.equal(chart.length, summary.noteCount, `${label}: note count`);
  assert.equal(chart[0]?.timeMs, summary.firstMs, `${label}: first note time`);

  const last = chart.at(-1);
  assert.equal(last.timeMs + (last.durationMs ?? 0), summary.lastEndMs, `${label}: last end`);

  const seenIds = new Set();
  const actualTypeCounts = chart.reduce((acc, note, index) => {
    assert.match(note.id, new RegExp(`^${difficulty}-\\d{4}$`), `${label}:${index}: stable id`);
    assert.equal(seenIds.has(note.id), false, `${label}:${index}: duplicate note id`);
    seenIds.add(note.id);
    assert.ok(["tap", "hold", "mash"].includes(note.type), `${label}:${index}: type`);
    assert.equal(Number.isInteger(note.timeMs), true, `${label}:${index}: integer timeMs`);
    if (index > 0) {
      assert.ok(note.timeMs > chart[index - 1].timeMs, `${label}:${index}: increasing timeMs`);
    }
    if (note.type === "hold" || note.type === "mash") {
      assert.ok(note.durationMs > 0, `${label}:${index}: duration required`);
    }
    if (note.type === "mash") {
      assert.ok(note.targetCount > 0, `${label}:${index}: targetCount required`);
    }
    assert.deepEqual(
      note,
      normalizeSourceNote(sourceChart[index], difficulty, index),
      `${label}:${index}: note payload must match src/stages.js`,
    );
    acc[note.type] = (acc[note.type] ?? 0) + 1;
    return acc;
  }, {});

  assert.deepEqual(actualTypeCounts, summary.typeCounts, `${label}: type counts`);
}

function assertDifficultyEntry(entry, stage, difficulty, loop, sourceChart, label) {
  const summary = chartSummary(sourceChart);
  assert.equal(entry?.chartSummary?.noteCount, summary.noteCount, `${label}: note count`);
  assert.equal(entry?.chartSummary?.lastEndMs, summary.lastEndMs, `${label}: last end`);
  assert.deepEqual(entry?.chartSummary?.typeCounts, summary.typeCounts, `${label}: type counts`);
  assert.equal(entry?.damageScale, damageScaleForDifficulty(stage, difficulty, loop), `${label}: damage scale`);
  assert.equal(entry?.loop?.enemyHpMultiplier, loopEnemyHpMultiplier(loop, stage, difficulty), `${label}: loop enemy hp`);
  assert.equal(entry?.loop?.playerDamageMultiplier, loopPlayerDamageMultiplier(loop, stage, difficulty), `${label}: loop player damage`);
  assert.equal(entry?.loop?.enemyAttackMultiplier, loopEnemyAttackMultiplier(loop, stage, difficulty), `${label}: loop enemy attack`);
  assert.deepEqual(entry?.loop1, entry?.loop, `${label}: loop1 compatibility alias`);
}

function assertLoopPayload(payload, stage, loop) {
  const loopKey = String(loop);
  const loopPayload = payload.loops?.[loopKey];
  assert.ok(loopPayload, `loop ${loopKey}: payload`);
  assert.equal(loopPayload.label, loop === 1 ? "1周目" : "2周目以降", `loop ${loopKey}: label`);

  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const sourceChart = getStageChart(stage, difficulty, loop);
    const label = `loop ${loopKey} ${difficulty}`;
    assertDifficultyEntry(loopPayload.difficulty?.[difficulty], stage, difficulty, loop, sourceChart, label);
    assertChart(difficulty, loopPayload.charts?.[difficulty], sourceChart, label);
  }

  assert.deepEqual(Object.keys(loopPayload.charts).sort(), ["easy", "hard", "normal"], `loop ${loopKey}: charts`);
  assert.deepEqual(Object.keys(loopPayload.difficulty).sort(), ["easy", "hard", "normal"], `loop ${loopKey}: difficulty`);
}

function assertPayload(payload, stage, index) {
  const bgmTrack = BGM_TRACKS[stage.bgm.track];
  assert.ok(bgmTrack, `missing BGM track source: ${stage.bgm.track}`);
  const countInLeadSeconds = mainNumberConstant("COUNT_IN_LEAD_SECONDS");
  const playerMaxHp = mainNumberConstant("PLAYER_MAX_HP");
  const inputGraceMs = mainInputGraceMs();
  assert.equal(inputGraceMs, WINDOWS_MS.bad + INPUT_GRACE_EXTRA_MS);

  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.gameId, GAME_ID);
  assert.equal(payload.exportId, `switch-stage${index + 1}-${stage.id}`);
  assert.equal(payload.stage?.id, stage.id);
  assert.equal(payload.stage?.index, index);
  assert.equal(payload.stage?.title, stage.title);
  assert.equal(payload.stage?.locationName, stage.locationName ?? "");
  assert.equal(payload.stage?.bpm, stage.bpm);
  assert.equal(payload.stage?.travelMs, stage.travelMs);
  assert.deepEqual(payload.stage?.palette, stage.palette);
  assert.deepEqual(payload.scenario?.introLines, stage.introLines);
  assert.equal(payload.scenario?.restLine, stage.restLine);
  assert.equal(payload.scenario?.clearLine, stage.clearLine);
  assert.deepEqual(payload.scenario?.finalRevealLines, stage.finalRevealLines ?? []);
  assert.deepEqual(payload.enemy, stage.enemy);
  assert.equal(payload.player?.maxHp, playerMaxHp);
  assert.equal(payload.audio?.bgm?.cue, stage.bgm.cue);
  assert.equal(payload.audio?.bgm?.track, stage.bgm.track);
  assert.equal(payload.audio?.bgm?.assetSrc, bgmTrack.src);
  assert.equal(payload.audio?.bgm?.gain, stage.bgm.gain);
  assert.equal(payload.audio?.bgm?.trackVolume, bgmTrack.volume);
  assert.equal(payload.audio?.bgm?.lead, stage.bgm.lead);
  assert.equal(payload.audio?.bgm?.overlay, stage.bgm.overlay);
  assert.equal(payload.audio?.bgm?.tone, stage.bgm.tone);
  assert.equal(payload.audio?.bgm?.variation, stage.bgm.variation);
  assert.equal(payload.audio?.timing?.countInLeadSeconds, countInLeadSeconds);
  assert.equal(payload.rhythm?.inputGraceMs, inputGraceMs);
  assert.equal(payload.rhythm?.mashInputGraceMs, MASH_INPUT_GRACE_MS);
  assert.equal(payload.rhythm?.mashDedupMinGapMs, MASH_DEDUP_MIN_GAP_MS);
  assert.deepEqual(payload.rhythm?.windowsMs, WINDOWS_MS);
  assert.deepEqual(payload.rhythm?.noteTypes, [...NOTE_TYPES]);
  assert.deepEqual(payload.rhythm?.judgeScore, JUDGE_SCORE);
  assert.equal(payload.rhythm?.spiritFocusDurationMs, SPIRIT_FOCUS_DURATION_MS);
  assert.equal(payload.rhythm?.spiritFocusWindowBonusMs, SPIRIT_FOCUS_WINDOW_BONUS_MS);
  assert.equal(payload.rhythm?.scoring?.sampleFunctionOutputs?.noteDamage?.perfect, 3);
  assert.equal(payload.rhythm?.scoring?.sampleFunctionOutputs?.noteSpirit?.miss, -10);
  assert.equal(payload.rhythm?.scoring?.sampleFunctionOutputs?.comboBonusDamage?.combo10Base3, 18);
  assert.equal(payload.rhythm?.scoring?.sampleFunctionOutputs?.finisherBonusDamage?.perfect, 8);
  assert.equal(payload.rhythm?.scoring?.sampleFunctionOutputs?.rankScore?.score8400, "S");
  assert.deepEqual(payload.chartConfig, stage.chartConfig);

  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const sourceChart = getStageChart(stage, difficulty, 1);
    assertDifficultyEntry(payload.difficulty?.[difficulty], stage, difficulty, 1, sourceChart, difficulty);
    assertChart(difficulty, payload.charts?.[difficulty], sourceChart);
    assert.deepEqual(payload.difficulty?.[difficulty], payload.loops?.["1"]?.difficulty?.[difficulty], `${difficulty}: root difficulty loop1 alias`);
    assert.deepEqual(payload.charts?.[difficulty], payload.loops?.["1"]?.charts?.[difficulty], `${difficulty}: root chart loop1 alias`);
  }

  assert.deepEqual(Object.keys(payload.charts).sort(), ["easy", "hard", "normal"]);
  assertLoopPayload(payload, stage, 1);
  assertLoopPayload(payload, stage, 2);
  assert.ok(payload.excludedFromThisExport.includes("nintendo_sdk"));
  assert.ok(payload.excludedFromThisExport.includes("push"));
  assert.ok(payload.excludedFromThisExport.includes("deploy"));
  assertNoForbiddenKeys(payload);
}

const directory = process.argv[2] ?? "switch-port/stages";
const files = readdirSync(directory)
  .filter((file) => file.endsWith(".stage.json"))
  .sort();

assert.equal(files.length, STAGES.length, `stage pack count in ${directory}`);

for (const [index, stage] of STAGES.entries()) {
  const expectedFile = `stage${String(index + 1).padStart(2, "0")}-${stage.id}.stage.json`;
  assert.equal(files[index], expectedFile, `stage file order ${index + 1}`);
  assertPayload(readJson(join(directory, expectedFile)), stage, index);
}

console.log(`switch stage packs ok: ${files.length} stages`);
