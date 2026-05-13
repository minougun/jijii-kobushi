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

async function openBattle(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#primaryButton").waitFor({ state: "visible" });
  if ((await page.evaluate(() => document.documentElement.dataset.phase)) === "opening") {
    await page.locator("#primaryButton").click();
    await page.locator("#openSettingsButton").waitFor({ state: "visible" });
  }
  await page.locator("#primaryButton").click();
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

const local = await startStaticServer();
const browser = await chromium.launch();
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

try {
  await openBattle(page, local.url);
  const snapshots = [];
  for (let i = 0; i < 5; i += 1) {
    snapshots.push(await page.evaluate(() => window.__JII_KOBUSHI_DIAGNOSTICS__.snapshot()));
    await page.waitForTimeout(180);
  }

  for (const snapshot of snapshots) {
    assert(snapshot.phase === "battle", `unexpected phase: ${snapshot.phase}`);
    assert(snapshot.battleClockReady, "battle clock is not ready");
    assert(snapshot.bgmSync?.clockSource === "AudioContext", `unexpected clock source: ${snapshot.bgmSync?.clockSource}`);
    assert(snapshot.bgmSync?.correctionLocked === true, "BGM correction is not locked");
    assert(Math.abs(snapshot.bgmCorrectionMs) <= 1, `unexpected BGM correction: ${snapshot.bgmCorrectionMs}`);
    assert(Math.abs(snapshot.bgmDriftMs) <= 1, `unexpected BGM drift: ${snapshot.bgmDriftMs}`);
    assert(Math.abs(snapshot.currentMs - snapshot.expectedCurrentMs) <= 2, `battle clock mismatch: ${snapshot.currentMs} vs ${snapshot.expectedCurrentMs}`);
    assert(snapshot.bgmSync.scheduledLeadMs >= 30, `BGM scheduled too close to current time: ${snapshot.bgmSync.scheduledLeadMs}ms`);
    assert(snapshot.noteCount > 0, "active chart is empty");
  }
  for (let i = 1; i < snapshots.length; i += 1) {
    assert(snapshots[i].currentMs > snapshots[i - 1].currentMs, "battle clock is not monotonic");
  }
  assert(pageErrors.length === 0, `page errors:\n${pageErrors.join("\n")}`);
  assert(consoleErrors.length === 0, `console errors:\n${consoleErrors.join("\n")}`);
  assert(networkErrors.length === 0, `network errors:\n${networkErrors.join("\n")}`);
  console.log(`runtime audio clock ok: ${local.url}`);
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  await new Promise((resolve) => local.server.close(resolve));
}
