import { DIFFICULTIES, STAGES, validateStages } from "../src/stages.js";
import { chartCueTimelineFor } from "../src/audio.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const BGM_FILES = {
  koiwazurai: "koiwazurai.mp3",
  oboro: "oboro.mp3",
  hanagoyomi: "hanagoyomi2.mp3",
  shizima: "shizima4.mp3",
  taishoroman: "taishoroman-battle.mp3",
  amenoshita: "amenoshita3.mp3",
  epicbattle: "epicbattle-j.mp3",
};

const EXPECTED_ENKA_CORE_TRACKS = 6;
const BOSS_STAGE_ID = "finalhideout";
const BOSS_TRACK = "epicbattle";

const REQUIRED_IMAGE_FILES = [
  "kojiro-cutin.png",
  "stage-bg-shotengai-v1.webp",
  "stage-bg-warehouse-v1.webp",
  "stage-bg-riverside-v1.webp",
  "stage-bg-mountain-v1.webp",
  "stage-bg-garage-v1.webp",
  "stage-bg-redgate-v1.webp",
  "stage-bg-finalhideout-v1.webp",
];
const REQUIRED_FONT_FILES = ["NotoSansJP-JiiKobushi-subset.woff2"];
const REQUIRED_VIDEO_FILES = ["ending.mp4", "ending-loop2.mp4"];
const REQUIRED_RENDERER_DOM_SYNC_TOKENS = [
  "dom.hpMeter",
  "dom.enemyHpMeter",
  "dom.spiritMeter",
  "dom.playerHpValue",
  "dom.enemyHpValue",
  "dom.enemyNameLabel",
];
const REQUIRED_MAIN_UI_TOKENS = ['if (state.stageIndex === 0) return "語り";'];
const REQUIRED_AUDIO_CLOCK_TOKENS = ['ctx && ctx.state === "running" ? ctx.currentTime : performance.now() / 1000'];
const FORBIDDEN_AUDIO_NOTE_CUE_TOKENS = ["t - pickup", "countTick(t -"];
const CUE_TIME_EPSILON_SECONDS = 0.000001;

function gitObjectExists(filePath) {
  const repoPath = filePath.replaceAll("\\", "/");
  const result = spawnSync("git", ["cat-file", "-e", `HEAD:${repoPath}`], { stdio: "ignore" });
  return result.status === 0;
}

function assetExists(filePath) {
  return existsSync(filePath) || gitObjectExists(filePath);
}

const chartVariants = STAGES.flatMap((stage) =>
  Object.keys(DIFFICULTIES).flatMap((difficulty) => [
    {
      ...stage,
      id: `${stage.id}:${difficulty}`,
      chart: stage.chartsByDifficulty?.[difficulty] ?? [],
    },
    {
      ...stage,
      id: `${stage.id}:loopPlus:${difficulty}`,
      chart: stage.loopPlusChartsByDifficulty?.[difficulty] ?? [],
    },
  ]),
);

const errors = validateStages(chartVariants);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

const bgmErrors = [];
const usedTracks = new Set();
const enkaCoreTracks = new Set();
for (const stage of STAGES) {
  const track = stage.bgm?.track;
  usedTracks.add(track);
  if (stage.id !== BOSS_STAGE_ID) enkaCoreTracks.add(track);
  if (stage.id === BOSS_STAGE_ID && track !== BOSS_TRACK) {
    bgmErrors.push(`${stage.id}: expected boss exception track ${BOSS_TRACK}, got ${track}`);
  }
  if (stage.id !== BOSS_STAGE_ID && track === BOSS_TRACK) {
    bgmErrors.push(`${stage.id}: boss track may only be used by ${BOSS_STAGE_ID}`);
  }
  if (!BGM_FILES[track]) {
    bgmErrors.push(`${stage.id}: unknown bgm track ${track}`);
    continue;
  }
  const filePath = join("assets", "audio", BGM_FILES[track]);
  if (!assetExists(filePath)) bgmErrors.push(`${stage.id}: missing bgm asset ${filePath}`);
}
if (enkaCoreTracks.size !== EXPECTED_ENKA_CORE_TRACKS) {
  bgmErrors.push(`expected ${EXPECTED_ENKA_CORE_TRACKS} enka/kayo core tracks before boss stage, got ${enkaCoreTracks.size}`);
}
for (const fileName of REQUIRED_IMAGE_FILES) {
  const filePath = join("assets", "images", fileName);
  if (!assetExists(filePath)) bgmErrors.push(`missing image asset ${filePath}`);
}
for (const fileName of REQUIRED_FONT_FILES) {
  const filePath = join("assets", "fonts", fileName);
  if (!assetExists(filePath)) bgmErrors.push(`missing font asset ${filePath}`);
}
for (const fileName of REQUIRED_VIDEO_FILES) {
  const filePath = join("assets", "video", fileName);
  if (!assetExists(filePath)) bgmErrors.push(`missing video asset ${filePath}`);
}

if (bgmErrors.length) {
  for (const error of bgmErrors) console.error(error);
  process.exit(1);
}

const rendererSource = readFileSync("src/renderer.js", "utf8");
const rendererErrors = REQUIRED_RENDERER_DOM_SYNC_TOKENS
  .filter((token) => !rendererSource.includes(token))
  .map((token) => `renderer HUD sync missing ${token}`);
if (rendererErrors.length) {
  for (const error of rendererErrors) console.error(error);
  process.exit(1);
}

const mainSource = readFileSync("src/main.js", "utf8");
const mainErrors = REQUIRED_MAIN_UI_TOKENS
  .filter((token) => !mainSource.includes(token))
  .map((token) => `main UI behavior missing ${token}`);
if (mainErrors.length) {
  for (const error of mainErrors) console.error(error);
  process.exit(1);
}

const audioSource = readFileSync("src/audio.js", "utf8");
const audioErrors = REQUIRED_AUDIO_CLOCK_TOKENS
  .filter((token) => !audioSource.includes(token))
  .map((token) => `audio clock fallback missing ${token}`);
for (const token of FORBIDDEN_AUDIO_NOTE_CUE_TOKENS) {
  if (audioSource.includes(token)) audioErrors.push(`audio note cues must land on the hit line, found ${token}`);
}
if (audioErrors.length) {
  for (const error of audioErrors) console.error(error);
  process.exit(1);
}

const cueTimelineErrors = [];
for (const chart of chartVariants) {
  const cuesByNoteIndex = new Map();
  for (const cue of chartCueTimelineFor(chart.chart, 0)) {
    if (!cuesByNoteIndex.has(cue.noteIndex)) cuesByNoteIndex.set(cue.noteIndex, []);
    cuesByNoteIndex.get(cue.noteIndex).push(cue);
  }
  for (const [noteIndex, note] of chart.chart.entries()) {
    const hitTime = note.timeMs / 1000;
    const endTime = hitTime + (note.durationMs ?? 0) / 1000;
    const cues = cuesByNoteIndex.get(noteIndex) ?? [];
    if (!cues.length) {
      cueTimelineErrors.push(`${chart.id}: ${note.type} note at ${note.timeMs}ms has no cue`);
      continue;
    }
    for (const cue of cues) {
      if (cue.noteType !== note.type || cue.noteTimeMs !== note.timeMs || cue.noteDurationMs !== (note.durationMs ?? 0)) {
        cueTimelineErrors.push(`${chart.id}: cue metadata drifted from note at ${note.timeMs}ms`);
      }
    }
    if (note.type === "tap") {
      const offHit = cues.filter((cue) => Math.abs(cue.time - hitTime) > CUE_TIME_EPSILON_SECONDS);
      if (offHit.length) cueTimelineErrors.push(`${chart.id}: tap cue is not on hit line at ${note.timeMs}ms`);
    } else if (note.type === "hold") {
      const hasStartCue = cues.some((cue) => cue.role === "holdStart" && Math.abs(cue.time - hitTime) <= CUE_TIME_EPSILON_SECONDS);
      const hasReleaseCue = cues.some((cue) => cue.role === "holdRelease" && Math.abs(cue.time - endTime) <= CUE_TIME_EPSILON_SECONDS);
      if (!hasStartCue) cueTimelineErrors.push(`${chart.id}: hold start cue is not on hit line at ${note.timeMs}ms`);
      if (!hasReleaseCue) cueTimelineErrors.push(`${chart.id}: hold release cue is not on release line at ${note.timeMs}ms`);
      for (const cue of cues) {
        if (cue.time < hitTime - CUE_TIME_EPSILON_SECONDS || cue.time > endTime + CUE_TIME_EPSILON_SECONDS) {
          cueTimelineErrors.push(`${chart.id}: hold cue is outside hit/release window at ${note.timeMs}ms`);
        }
      }
    } else if (note.type === "mash") {
      const outsideWindow = cues.filter(
        (cue) => cue.time < hitTime - CUE_TIME_EPSILON_SECONDS || cue.time > endTime + CUE_TIME_EPSILON_SECONDS,
      );
      if (outsideWindow.length) cueTimelineErrors.push(`${chart.id}: mash cue is outside mash window at ${note.timeMs}ms`);
    }
  }
}
if (cueTimelineErrors.length) {
  for (const error of cueTimelineErrors) console.error(error);
  process.exit(1);
}

console.log(`stage integrity ok: ${STAGES.length} stages`);
