import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const playwright = await import("playwright");
const { chromium } = playwright.default ?? playwright;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    let requestedPath = "";
    try {
      const parsed = new URL(request.url ?? "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(parsed.pathname === "/" ? "/index.html" : parsed.pathname);
      requestedPath = path.resolve(repoRoot, `.${pathname}`);
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

function runLoops(loop) {
  return { easy: loop, normal: loop, hard: loop };
}

function savedRunFor(stageIndex, loop = 1) {
  return {
    version: 1,
    runLoop: loop,
    runLoops: runLoops(loop),
    runSaves: {
      firstLoop: {
        difficulty: "normal",
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
      audioEnabled: true,
      inputOffsetMs: -60,
      reducedMotionOverride: "on",
      difficulty: "normal",
      uiLang: "ja",
      portraitHintDismissed: true,
    },
  };
}

async function advanceToBattle(page) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const phase = await page.evaluate(() => document.documentElement.dataset.phase);
    if (phase === "battle") break;
    const skipVisible = await page.locator("#skipButton").evaluate((button) => !button.hidden && getComputedStyle(button).display !== "none").catch(() => false);
    if (skipVisible) await page.locator("#skipButton").click();
    else {
      const primaryVisible = await page.locator("#primaryButton").evaluate((button) => !button.hidden && getComputedStyle(button).display !== "none").catch(() => false);
      if (primaryVisible) await page.locator("#primaryButton").click();
    }
    await page.waitForTimeout(120);
  }
  await page.waitForFunction(() => document.documentElement.dataset.phase === "battle", null, { timeout: 10000 });
  await page.waitForFunction(() => window.__JII_KOBUSHI_DIAGNOSTICS__?.snapshot().battleClockReady, null, { timeout: 15000 });
}

async function openBattle(page, baseUrl, stageIndex = 0, loop = 1) {
  await page.addInitScript((payload) => {
    localStorage.setItem("jiiKobushi:v1", JSON.stringify(payload));
  }, savedRunFor(stageIndex, loop));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#primaryButton").waitFor({ state: "visible" });
  if ((await page.evaluate(() => document.documentElement.dataset.phase)) === "opening") {
    await page.locator("#primaryButton").click();
    await page.locator("#openSettingsButton").waitFor({ state: "visible" });
  }
  await page.locator("#loadFirstButton").click();
  await advanceToBattle(page);
}

const local = await startStaticServer();
const browser = await chromium.launch();

try {
  const summaries = [];
  for (const stageIndex of [0, 1, 2, 3, 4, 5, 6]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const pageErrors = [];
    const consoleErrors = [];
    const networkErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
    });
    await openBattle(page, local.url, stageIndex, stageIndex === 1 ? 2 : 1);
    const snapshots = [];
    for (let i = 0; i < 5; i += 1) {
      snapshots.push(await page.evaluate(() => window.__JII_KOBUSHI_DIAGNOSTICS__.snapshot()));
      await page.waitForTimeout(180);
    }

    for (const snapshot of snapshots) {
      assert(snapshot.phase === "battle", `unexpected phase: ${snapshot.phase}`);
      assert(snapshot.battleClockReady, "battle clock is not ready");
      assert(snapshot.bgmSync?.clockSource === "AudioContext", `unexpected clock source: ${snapshot.bgmSync?.clockSource}`);
      assert(snapshot.bgmSync?.driftMeasurement === "scheduled-buffer-source-position", `unexpected drift measurement: ${snapshot.bgmSync?.driftMeasurement}`);
      assert(snapshot.bgmSync?.correctionLocked === true, "BGM correction is not locked");
      assert(Math.abs(snapshot.bgmCorrectionMs) <= 1, `unexpected BGM correction: ${snapshot.bgmCorrectionMs}`);
      assert(Math.abs(snapshot.currentMs - snapshot.expectedCurrentMs) <= 6, `battle clock mismatch: ${snapshot.currentMs} vs ${snapshot.expectedCurrentMs}`);
      assert(Math.abs(snapshot.battleToBgmMediaDeltaMs) <= 3, `battle/BGM media position mismatch: ${snapshot.battleToBgmMediaDeltaMs}ms`);
      assert(snapshot.bgmSync.scheduledLeadMs >= 30, `BGM scheduled too close to current time: ${snapshot.bgmSync.scheduledLeadMs}ms`);
      assert(snapshot.noteCount > 0, "active chart is empty");
    }
    for (let i = 1; i < snapshots.length; i += 1) {
      assert(snapshots[i].currentMs > snapshots[i - 1].currentMs, "battle clock is not monotonic");
      assert(snapshots[i].bgmSync.chartMediaPositionMs > snapshots[i - 1].bgmSync.chartMediaPositionMs, "BGM media position is not monotonic");
    }
    assert(pageErrors.length === 0, `page errors:\n${pageErrors.join("\n")}`);
    assert(consoleErrors.length === 0, `console errors:\n${consoleErrors.join("\n")}`);
    assert(networkErrors.length === 0, `network errors:\n${networkErrors.join("\n")}`);
    summaries.push(`${snapshots[0].stageId}: delta=${snapshots.at(-1).battleToBgmMediaDeltaMs}ms loop=${snapshots[0].runLoop}`);
    await page.close();
  }
  console.log(`runtime audio clock ok: ${local.url} ${summaries.join(" | ")}`);
} finally {
  await browser.close().catch(() => {});
  await new Promise((resolve) => local.server.close(resolve));
}
