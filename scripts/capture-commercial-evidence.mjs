import { createReadStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { STAGES, getStageChart } from "../src/stages.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(repoRoot, "docs", "commercial-review-evidence-2026-05-07");
const STORAGE_KEY = "jiiKobushi:v1";

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

async function startStaticServer() {
  const server = createServer((request, response) => {
    const parsed = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(parsed.pathname === "/" ? "/index.html" : parsed.pathname);
    const requestedPath = path.resolve(repoRoot, `.${pathname}`);
    if (!requestedPath.startsWith(`${repoRoot}${path.sep}`) && requestedPath !== repoRoot) {
      response.writeHead(403);
      response.end("forbidden");
      return;
    }
    response.writeHead(200, {
      "content-type": mimeTypes.get(path.extname(requestedPath).toLowerCase()) ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(requestedPath)
      .on("error", () => {
        if (!response.headersSent) response.writeHead(404);
        response.end("not found");
      })
      .pipe(response);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}/` };
}

function commercialSaveData({ difficulty = "normal", loop = 1 } = {}) {
  const clearedStages = [];
  const bestScores = {};
  for (const [index, stage] of STAGES.entries()) {
    const key = `${difficulty}:loop${loop}:${stage.id}`;
    const chartLength = getStageChart(stage, difficulty, loop).length;
    clearedStages.push(key);
    bestScores[key] = {
      stageId: stage.id,
      title: stage.title,
      score: 9000 - index * 120,
      rank: index < 5 ? "S" : "A",
      stats: { perfect: Math.max(1, chartLength - 8), good: 5, bad: 2, miss: 1 },
      maxCombo: Math.max(8, chartLength - 6),
      comboBonusDamage: 12,
      hp: 12,
      maxHp: 12,
      loop,
      inputOffsetMs: 0,
      spiritFocusCount: 1,
      spiritGuardUsedCount: 0,
      phraseGrade: "商業レビュー用スモーク",
      stageClearedByHp: true,
      notesTotal: chartLength,
      notesResolved: chartLength,
    };
  }
  return {
    version: 1,
    runLoop: loop,
    runLoops: { easy: 1, normal: loop, hard: 1 },
    runSaves: {},
    clearedStages,
    bestScores,
    settings: {
      audioEnabled: false,
      inputOffsetMs: 0,
      reducedMotionOverride: "off",
      difficulty,
      uiLang: "ja",
      portraitHintDismissed: true,
    },
  };
}

async function openTitle(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#primaryButton").waitFor({ state: "visible" });
  if (await page.evaluate(() => document.documentElement.dataset.phase) === "opening") {
    await page.locator("#primaryButton").click();
    await page.locator("#openHelpButton").waitFor({ state: "visible" });
  }
}

async function clickVisible(page, selector) {
  const locator = page.locator(selector);
  const visible = await locator.evaluate((element) => !element.hidden && getComputedStyle(element).display !== "none").catch(() => false);
  if (visible) {
    await locator.click();
    await page.waitForTimeout(180);
    return true;
  }
  return false;
}

async function advanceUntil(page, targetPhases, maxSteps = 80) {
  const targets = new Set(Array.isArray(targetPhases) ? targetPhases : [targetPhases]);
  for (let step = 0; step < maxSteps; step += 1) {
    const phase = await page.evaluate(() => document.documentElement.dataset.phase);
    if (targets.has(phase)) return phase;
    if (await clickVisible(page, "#skipButton")) continue;
    if (await clickVisible(page, "#primaryButton")) continue;
    await page.waitForTimeout(180);
  }
  throw new Error(`could not reach phases: ${Array.from(targets).join(", ")}`);
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
}

function pageOptionsFor(optionsOrViewport) {
  if (optionsOrViewport?.viewport) return optionsOrViewport;
  return { viewport: optionsOrViewport, deviceScaleFactor: 1 };
}

async function withPage(browser, optionsOrViewport, run) {
  const page = await browser.newPage(pageOptionsFor(optionsOrViewport));
  await run(page);
  await page.close();
}

await mkdir(outDir, { recursive: true });
const local = await startStaticServer();
const baseUrl = process.env.JII_KOBUSHI_URL || local.url;
const browser = await chromium.launch();

try {
  await withPage(browser, { width: 1280, height: 720 }, async (page) => {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await screenshot(page, "01-op-desktop.png");
    await openTitle(page);
    await screenshot(page, "02-title-desktop.png");
    await page.locator("#openHelpButton").click();
    await page.waitForTimeout(200);
    await screenshot(page, "03-help-desktop.png");
  });

  await withPage(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, async (page) => {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.classList.contains("mobileLandscapeDefault"));
    await screenshot(page, "04-mobile-portrait-landscape-default.png");
  });

  await withPage(browser, { width: 844, height: 390 }, async (page) => {
    await openTitle(page);
    await screenshot(page, "05-mobile-landscape-title.png");
  });

  await withPage(browser, { width: 1280, height: 720 }, async (page) => {
    await page.addInitScript((payload) => {
      localStorage.setItem("jiiKobushi:v1", JSON.stringify(payload));
    }, commercialSaveData());
    await openTitle(page);
    await page.locator("#primaryButton").click();
    await advanceUntil(page, "battle");
    await page.waitForTimeout(400);
    await screenshot(page, "06-battle-desktop.png");
    await page.keyboard.press("Escape");
    await page.locator("#pauseMenu").waitFor({ state: "visible" });
    await page.locator("#pauseHelpButton").click();
    await page.waitForTimeout(250);
    await screenshot(page, "07-pause-help-popout-desktop.png");
  });

  await withPage(browser, { width: 1280, height: 720 }, async (page) => {
    await page.addInitScript((payload) => {
      localStorage.setItem("jiiKobushi:v1", JSON.stringify(payload));
    }, commercialSaveData());
    await openTitle(page);
    await page.locator("#primaryButton").click();
    await advanceUntil(page, "ending");
    await screenshot(page, "08-ending-overlay-desktop.png");
    await page.locator("#primaryButton").click();
    await page.waitForFunction(() => ["endingVideo", "results"].includes(document.documentElement.dataset.phase), null, { timeout: 6000 });
    if (await page.evaluate(() => document.documentElement.dataset.phase) === "endingVideo") {
      await page.waitForTimeout(800);
      await screenshot(page, "09-ed-bonus-desktop.png");
      await page.locator("#endingVideoSkip").dispatchEvent("click");
    }
    await page.waitForFunction(() => document.documentElement.dataset.phase === "results", null, { timeout: 6000 });
    await screenshot(page, "10-results-desktop.png");
    await page.locator("#primaryButton").click();
    await advanceUntil(page, "battle");
    await page.waitForTimeout(400);
    await screenshot(page, "11-loop2-doodle-battle-desktop.png");
  });

  console.log(`commercial evidence captured: ${outDir}`);
} finally {
  await browser.close();
  await new Promise((resolve) => local.server.close(resolve));
}
