import { DIFFICULTIES, STAGES, validateStages } from "../src/stages.js";
import { existsSync } from "node:fs";
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

function gitObjectExists(filePath) {
  const repoPath = filePath.replaceAll("\\", "/");
  const result = spawnSync("git", ["cat-file", "-e", `HEAD:${repoPath}`], { stdio: "ignore" });
  return result.status === 0;
}

function assetExists(filePath) {
  return existsSync(filePath) || gitObjectExists(filePath);
}

const chartVariants = STAGES.flatMap((stage) =>
  Object.keys(DIFFICULTIES).map((difficulty) => ({
    ...stage,
    id: `${stage.id}:${difficulty}`,
    chart: stage.chartsByDifficulty?.[difficulty] ?? [],
  })),
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

console.log(`stage integrity ok: ${STAGES.length} stages`);
