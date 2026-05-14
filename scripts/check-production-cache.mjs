import { execFileSync } from "node:child_process";

const DEFAULT_BASE_URL = "https://minougun.github.io/jijii-kobushi/";
const EXPECTED_MAIN_TOKEN = "20260514-cuetimeline2";
const EXPECTED_STYLE_TOKEN = "20260514-phoneinput1";
const EXPECTED_AUDIO_TOKEN = "20260514-cuetimeline2";
const EXPECTED_RENDERER_TOKEN = "20260514-cuetimeline1";
const EXPECTED_STAGE_TOKEN = "20260514-rhythmalign1";
const EXPECTED_RHYTHM_TOKEN = "20260513-mashoffset1";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function localHeadCommit() {
  return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

async function fetchText(url) {
  const response = await fetch(url, { cache: "no-store" });
  assert(response.ok, `${response.status} ${url}`);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  assert(response.ok, `${response.status} ${url}`);
  return response.json();
}

const baseUrl = process.argv[2] || process.env.JII_KOBUSHI_URL || DEFAULT_BASE_URL;
const expectedCommit = process.env.JII_KOBUSHI_EXPECT_COMMIT || localHeadCommit();
const version = await fetchJson(new URL("version.json", baseUrl));
assert(version.gameId === "jii-kobushi", `unexpected gameId: ${version.gameId}`);
assert(version.commit === expectedCommit, `production commit mismatch: expected ${expectedCommit}, got ${version.commit}`);

const indexHtml = await fetchText(baseUrl);
assert(indexHtml.includes(`src/main.js?v=${EXPECTED_MAIN_TOKEN}`), "index.html does not reference the expected main.js cache token");
assert(indexHtml.includes(`src/styles.css?v=${EXPECTED_STYLE_TOKEN}`), "index.html does not reference the expected styles.css cache token");

const stylesCss = await fetchText(new URL(`src/styles.css?v=${EXPECTED_STYLE_TOKEN}`, baseUrl));
assert(stylesCss.includes("mobileLandscapeDefault"), "styles.css mobile landscape default rules are missing");
assert(stylesCss.includes("transform: rotate(90deg) translateY(-100%)"), "styles.css mobile landscape rotation is missing");
assert(stylesCss.includes(".portraitHint:not([hidden])"), "styles.css portrait hint override is missing");

const mainUrl = new URL(`src/main.js?v=${EXPECTED_MAIN_TOKEN}`, baseUrl).toString();
const mainJs = await fetchText(mainUrl);
assert(mainJs.includes(`./audio.js?v=${EXPECTED_AUDIO_TOKEN}`), "main.js does not reference the expected audio.js cache token");
assert(mainJs.includes(`./renderer.js?v=${EXPECTED_RENDERER_TOKEN}`), "main.js does not reference the expected renderer.js cache token");
assert(mainJs.includes(`./stages.js?v=${EXPECTED_STAGE_TOKEN}`), "main.js does not reference the expected stages.js cache token");
assert(mainJs.includes(`./rhythm.js?v=${EXPECTED_RHYTHM_TOKEN}`), "main.js does not reference the expected rhythm.js cache token");
assert(mainJs.includes("__JII_KOBUSHI_DIAGNOSTICS__"), "main.js diagnostics hook is missing");
assert(mainJs.includes("battleToBgmMediaDeltaMs"), "main.js BGM media-position diagnostic is missing");
assert(mainJs.includes("fineHoverPrimary"), "main.js primary-input phone predicate is missing");
assert(!mainJs.includes("navigator.maxTouchPoints > 0"), "main.js still uses maxTouchPoints as a phone predicate OR condition");

const audioJs = await fetchText(new URL(`src/audio.js?v=${EXPECTED_AUDIO_TOKEN}`, baseUrl));
assert(audioJs.includes("bgmSyncStatus()"), "audio.js BGM sync status is missing");
assert(audioJs.includes('clockSource: "AudioContext"'), "audio.js AudioContext clock source diagnostic is missing");
assert(audioJs.includes("scheduledLeadMs"), "audio.js scheduled lead diagnostic is missing");
assert(audioJs.includes("chartMediaPositionMs"), "audio.js chart media position diagnostic is missing");
assert(audioJs.includes("now()"), "audio.js now() clock API is missing");

const stagesJs = await fetchText(new URL(`src/stages.js?v=${EXPECTED_STAGE_TOKEN}`, baseUrl));
assert(stagesJs.includes("function chartStepMsFor(stage)"), "stages.js BPM-derived step resolver is missing");
assert(stagesJs.includes("stepBeatRatio: 1.5"), "stages.js dotted step ratios are missing");

const rhythmJs = await fetchText(new URL(`src/rhythm.js?v=${EXPECTED_RHYTHM_TOKEN}`, baseUrl));
assert(rhythmJs.includes("judgeMash(note, tapTimesMs, inputOffsetMs = 0)"), "rhythm.js mash input offset support is missing");
assert(rhythmJs.includes("const adjustedAt = time + inputOffsetMs"), "rhythm.js mash offset application is missing");

console.log(`production cache ok: ${baseUrl} commit=${version.commit}`);
