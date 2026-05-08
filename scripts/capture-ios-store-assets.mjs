import { createReadStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(repoRoot, "ios", "store-assets", "screenshots");

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

async function openTitle(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#primaryButton").waitFor({ state: "visible" });
  if (await page.evaluate(() => document.documentElement.dataset.phase) === "opening") {
    await page.locator("#primaryButton").click();
    await page.locator("#openHelpButton").waitFor({ state: "visible" });
  }
}

async function clickIfVisible(page, selector) {
  const locator = page.locator(selector);
  const visible = await locator.evaluate((element) => !element.hidden && getComputedStyle(element).display !== "none").catch(() => false);
  if (!visible) return false;
  await locator.click();
  await page.waitForTimeout(160);
  return true;
}

async function advanceUntil(page, targetPhase) {
  for (let step = 0; step < 80; step += 1) {
    if (await page.evaluate(() => document.documentElement.dataset.phase) === targetPhase) return;
    if (await clickIfVisible(page, "#skipButton")) continue;
    if (await clickIfVisible(page, "#primaryButton")) continue;
    await page.waitForTimeout(160);
  }
  throw new Error(`Could not reach phase: ${targetPhase}`);
}

await mkdir(outDir, { recursive: true });
const local = await startStaticServer();
const browser = await chromium.launch();

try {
  const page = await browser.newPage({
    viewport: { width: 2796, height: 1290 },
    deviceScaleFactor: 1,
  });

  await openTitle(page, local.url);
  await page.screenshot({ path: path.join(outDir, "01-title-landscape.png"), fullPage: false });

  await page.locator("#openHelpButton").click();
  await page.waitForTimeout(240);
  await page.screenshot({ path: path.join(outDir, "02-help-landscape.png"), fullPage: false });

  await openTitle(page, local.url);
  await page.locator("#primaryButton").click();
  await advanceUntil(page, "battle");
  await page.waitForTimeout(3600);
  await page.screenshot({ path: path.join(outDir, "03-battle-landscape.png"), fullPage: false });

  await page.close();
  console.log(`iOS store screenshots captured: ${outDir}`);
} finally {
  await browser.close();
  await new Promise((resolve) => local.server.close(resolve));
}
