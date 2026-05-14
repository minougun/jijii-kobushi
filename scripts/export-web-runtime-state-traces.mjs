import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { DIFFICULTIES, STAGES } from "../src/stages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "switch-port", "runtime-traces", "web-runtime-state-traces.json");
const CHECK_ONLY = process.argv.includes("--check");
const STORAGE_KEY = "jiiKobushi:v1";
const sourceFiles = [
  "src/main.js",
  "src/rhythm.js",
  "src/stages.js",
  "src/audio.js",
  "scripts/export-web-runtime-state-traces.mjs",
];

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".mp3", "audio/mpeg"],
  [".mp4", "video/mp4"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function git(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitCommit() {
  return git(["rev-parse", "HEAD"]);
}

function gitFileAtCommit(commit, relativePath) {
  try {
    return execFileSync("git", ["show", `${commit}:${relativePath}`], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 80 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function workingFile(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function sourceMatchesCommit(commit, files) {
  if (!commit) return false;
  return files.every((file) => {
    const committed = gitFileAtCommit(commit, file);
    return committed !== null && committed === workingFile(file);
  });
}

function gitDirtyFiles(files) {
  return git(["status", "--short", "--", ...files])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function assertCleanSource(dirtyFiles) {
  if (process.env.REQUIRE_CLEAN_WEB_TRACES !== "1") return;
  if (dirtyFiles.length > 0) {
    throw new Error(`Refusing Web runtime trace export from dirty source:\n${dirtyFiles.join("\n")}`);
  }
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const parsed = new URL(request.url ?? "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(parsed.pathname === "/" ? "/index.html" : parsed.pathname);
      const requestedPath = path.resolve(repoRoot, `.${pathname}`);
      if (!requestedPath.startsWith(`${repoRoot}${path.sep}`) && requestedPath !== repoRoot) {
        response.writeHead(403);
        response.end("forbidden");
        return;
      }
      const fileStat = await stat(requestedPath);
      if (!fileStat.isFile()) {
        response.writeHead(404);
        response.end("not found");
        return;
      }
      response.writeHead(200, {
        "content-type": mimeTypes.get(path.extname(requestedPath).toLowerCase()) ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      createReadStream(requestedPath).pipe(response);
    } catch {
      response.writeHead(404);
      response.end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}/` };
}

function savedRunFor(stageIndex, difficulty, loop) {
  return {
    version: 1,
    runLoop: loop,
    runLoops: { easy: loop, normal: loop, hard: loop },
    runSaves: {
      firstLoop: {
        difficulty,
        runLoop: loop,
        stageIndex,
        hp: 12,
        maxHp: 12,
        spirit: 0,
        totalScore: 0,
        stageScores: [],
      },
      loopPlus: null,
    },
    clearedStages: [],
    bestScores: {},
    settings: {
      audioEnabled: false,
      inputOffsetMs: 0,
      reducedMotionOverride: "on",
      difficulty,
      uiLang: "ja",
      portraitHintDismissed: true,
    },
  };
}

async function clickIfVisible(page, selector) {
  const locator = page.locator(selector);
  const visible = await locator.evaluate((element) => !element.hidden && getComputedStyle(element).display !== "none").catch(() => false);
  if (!visible) return false;
  await locator.click();
  await page.waitForTimeout(80);
  return true;
}

async function advanceToBattle(page) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const phase = await page.evaluate(() => document.documentElement.dataset.phase);
    if (phase === "battle") return;
    if (await clickIfVisible(page, "#skipButton")) continue;
    if (await clickIfVisible(page, "#primaryButton")) continue;
    await page.waitForTimeout(100);
  }
  throw new Error("could not advance to battle");
}

async function openBattle(page, baseUrl, stageIndex, difficulty, loop) {
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: STORAGE_KEY, value: savedRunFor(stageIndex, difficulty, loop) });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#primaryButton").waitFor({ state: "visible" });
  if ((await page.evaluate(() => document.documentElement.dataset.phase)) === "opening") {
    await page.locator("#primaryButton").click();
    await page.locator("#loadFirstButton").waitFor({ state: "visible" });
  }
  await page.locator("#loadFirstButton").click();
  await advanceToBattle(page);
}

async function captureRuntimeTrace(page, baseUrl, stageIndex, difficulty, loop) {
  await openBattle(page, baseUrl, stageIndex, difficulty, loop);
  await page.waitForFunction(() => window.__JII_KOBUSHI_DIAGNOSTICS__?.runtimeState, null, { timeout: 10000 });
  const before = await page.evaluate(() => window.__JII_KOBUSHI_DIAGNOSTICS__.runtimeState());
  const events = [];
  for (let step = 0; step < before.noteCount + 20; step += 1) {
    const event = await page.evaluate(() => window.__JII_KOBUSHI_DIAGNOSTICS__.resolveNextPerfect());
    events.push(event);
    if (event.phase !== "battle" || event.done) break;
  }
  const after = await page.evaluate(() => window.__JII_KOBUSHI_DIAGNOSTICS__.runtimeState());
  assert(after.phase !== "defeat", `${before.stageId}/${difficulty}/loop${loop}: runtime trace reached defeat`);
  assert(after.resolvedNoteCount > 0, `${before.stageId}/${difficulty}/loop${loop}: no notes resolved`);
  assert(after.result?.score > 0, `${before.stageId}/${difficulty}/loop${loop}: missing runtime result`);
  return {
    stageId: before.stageId,
    difficulty,
    loop,
    before,
    events,
    after,
  };
}

function checkOnlySourceCommit() {
  if (!CHECK_ONLY || !existsSync(outputPath)) return null;
  const existing = JSON.parse(readFileSync(outputPath, "utf8"));
  if (sourceMatchesCommit(existing.sourceGitCommit, sourceFiles)) {
    return existing.sourceGitCommit;
  }
  return null;
}

async function buildPayload(sourceGitCommit = gitCommit()) {
  const dirtyFiles = gitDirtyFiles(sourceFiles);
  assertCleanSource(dirtyFiles);
  const local = await startStaticServer();
  const browser = await chromium.launch();
  try {
    const traces = [];
    for (const [stageIndex, stage] of STAGES.entries()) {
      for (const difficulty of Object.keys(DIFFICULTIES)) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
        const pageErrors = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        const trace = await captureRuntimeTrace(page, local.url, stageIndex, difficulty, stageIndex === 1 ? 2 : 1);
        assert(pageErrors.length === 0, `${stage.id}/${difficulty}: page errors:\n${pageErrors.join("\n")}`);
        traces.push(trace);
        await page.close();
      }
    }
    return {
      schemaVersion: 1,
      gameId: "jii-kobushi",
      exportId: "web-runtime-state-traces",
      sourceGitCommit,
      sourceFiles,
      sourceWorktreeDirty: dirtyFiles.length > 0,
      sourceDirtyFiles: dirtyFiles,
      capture: {
        browser: "chromium",
        traceType: "live-web-runtime-state",
        controlPath: "window.__JII_KOBUSHI_DIAGNOSTICS__.resolveNextPerfect",
      },
      traces,
    };
  } finally {
    await browser.close().catch(() => {});
    await new Promise((resolve) => local.server.close(resolve));
  }
}

const payload = await buildPayload(checkOnlySourceCommit() ?? gitCommit());
const content = `${JSON.stringify(payload, null, 2)}\n`;

if (CHECK_ONLY) {
  if (!existsSync(outputPath)) throw new Error(`Missing Web runtime trace output: ${outputPath}`);
  const existing = readFileSync(outputPath, "utf8");
  if (existing !== content) throw new Error(`Outdated Web runtime trace output: ${outputPath}`);
} else {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content);
}

console.log(`web runtime state traces ${CHECK_ONLY ? "validated" : "ok"}: ${payload.traces.length} traces`);
