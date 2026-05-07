import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

async function loadPlaywright() {
  try {
    const module = await import("playwright");
    return module.default ?? module;
  } catch {
    const module = await import("/home/minougun/maguromaru-note/node_modules/playwright/index.js");
    return module.default ?? module;
  }
}

const { chromium } = await loadPlaywright();
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = {
    allowHeadAssetFallback: false,
    baseUrl: process.env.JII_KOBUSHI_URL || "",
    pagesStrict: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--allow-head-asset-fallback") {
      options.allowHeadAssetFallback = true;
    } else if (arg === "--pages-strict") {
      options.pagesStrict = true;
    } else if (arg === "--base-url") {
      options.baseUrl = argv[index + 1] || "";
      index += 1;
    } else if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
    }
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const explicitUrl = options.baseUrl.trim();

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

function assertNoDeletedTrackedFiles() {
  const result = spawnSync("git", ["ls-files", "--deleted"], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error("failed to inspect deleted tracked files");
  const deleted = result.stdout.trim();
  if (deleted) throw new Error(`tracked files are missing from the worktree:\n${deleted}`);
}

async function startStaticServer({ allowHeadAssetFallback = false } = {}) {
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
      if (allowHeadAssetFallback) {
        const relPath = path.relative(repoRoot, requestedPath).replaceAll(path.sep, "/");
        const gitShow = relPath && !relPath.startsWith("..")
          ? spawnSync("git", ["show", `HEAD:${relPath}`], { cwd: repoRoot, encoding: "buffer", maxBuffer: 80 * 1024 * 1024 })
          : null;
        if (gitShow?.status === 0 && gitShow.stdout?.length) {
          response.writeHead(200, {
            "content-type": mimeTypes.get(path.extname(requestedPath).toLowerCase()) ?? "application/octet-stream",
            "cache-control": "no-store",
          });
          response.end(gitShow.stdout);
          return;
        }
      }
      response.writeHead(404);
      response.end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}/` };
}

async function withPage(browser, viewport, test) {
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await test(page, { pageErrors, consoleErrors });
  await page.close();
  if (pageErrors.length || consoleErrors.length) {
    throw new Error(`browser errors:\npage=${pageErrors.join("\n") || "none"}\nconsole=${consoleErrors.join("\n") || "none"}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

if (options.pagesStrict && !explicitUrl) assertNoDeletedTrackedFiles();
const local = explicitUrl ? null : await startStaticServer({ allowHeadAssetFallback: options.allowHeadAssetFallback });
const baseUrl = explicitUrl || local.url;
const browser = await chromium.launch();

try {
  await withPage(browser, { width: 1280, height: 720 }, async (page) => {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.locator("#primaryButton").waitFor({ state: "visible" });
    assert(await page.locator('meta[property="og:title"]').count() === 1, "missing og:title");
    assert(await page.locator("#difficultySelect[role='radiogroup']").count() === 1, "difficulty radiogroup missing");
    assert(await page.locator("#srGameNarration").count() === 1, "sr narration region missing");
    assert(await page.locator("#srJudgeStatus").count() === 1, "sr judge region missing");
  });

  await withPage(browser, { width: 390, height: 844 }, async (page) => {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const hint = page.locator("#portraitHint");
    await hint.waitFor({ state: "visible" });
    const display = await hint.evaluate((element) => getComputedStyle(element).display);
    assert(display !== "none", "portrait hint is hidden by CSS");
  });

  await withPage(browser, { width: 844, height: 390 }, async (page) => {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.dataset.phase = "battle";
    });
    const box = await page.locator("#mobileTapPad").boundingBox();
    assert(box && box.width >= 80 && box.height >= 80, `mobile tap pad too small: ${JSON.stringify(box)}`);
  });

  await withPage(browser, { width: 1280, height: 720 }, async (page, observed) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("forced quota failure", "QuotaExceededError");
      };
    });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.locator("#primaryButton").click();
    await page.locator("#openSettingsButton").waitFor({ state: "visible" });
    await page.locator("#openSettingsButton").click();
    await page.locator("#offsetRange").evaluate((input) => {
      input.value = "80";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(100);
    assert(observed.pageErrors.length === 0, `storage failure leaked pageerror: ${observed.pageErrors.join("\n")}`);
    const judgeText = await page.locator("#srJudgeStatus").textContent();
    assert(judgeText.includes("保存できませんでした"), `storage failure was not announced: ${judgeText}`);
  });

  await withPage(browser, { width: 1280, height: 720 }, async (page) => {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
  });

  console.log(`web ui smoke ok: ${baseUrl}`);
} finally {
  await browser.close();
  await new Promise((resolve) => local?.server.close(resolve) ?? resolve());
}
