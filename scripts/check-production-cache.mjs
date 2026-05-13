import { execFileSync } from "node:child_process";

const DEFAULT_BASE_URL = "https://minougun.github.io/jijii-kobushi/";
const EXPECTED_MAIN_TOKEN = "20260513-timingqa1";
const EXPECTED_STAGE_TOKEN = "20260513-rhythmstrict1";
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

const mainUrl = new URL(`src/main.js?v=${EXPECTED_MAIN_TOKEN}`, baseUrl).toString();
const mainJs = await fetchText(mainUrl);
assert(mainJs.includes(`./stages.js?v=${EXPECTED_STAGE_TOKEN}`), "main.js does not reference the expected stages.js cache token");
assert(mainJs.includes(`./rhythm.js?v=${EXPECTED_RHYTHM_TOKEN}`), "main.js does not reference the expected rhythm.js cache token");
assert(mainJs.includes("__JII_KOBUSHI_DIAGNOSTICS__"), "main.js diagnostics hook is missing");

const stagesJs = await fetchText(new URL(`src/stages.js?v=${EXPECTED_STAGE_TOKEN}`, baseUrl));
assert(stagesJs.includes("function chartStepMsFor(stage)"), "stages.js BPM-derived step resolver is missing");
assert(stagesJs.includes("stepBeatRatio: 1.5"), "stages.js dotted step ratios are missing");

const rhythmJs = await fetchText(new URL(`src/rhythm.js?v=${EXPECTED_RHYTHM_TOKEN}`, baseUrl));
assert(rhythmJs.includes("judgeMash(note, tapTimesMs, inputOffsetMs = 0)"), "rhythm.js mash input offset support is missing");
assert(rhythmJs.includes("const adjustedAt = time + inputOffsetMs"), "rhythm.js mash offset application is missing");

console.log(`production cache ok: ${baseUrl} commit=${version.commit}`);
