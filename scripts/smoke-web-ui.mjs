import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const playwright = await import("playwright");
const { chromium } = playwright.default ?? playwright;
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
  const networkErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
  });
  await test(page, { pageErrors, consoleErrors, networkErrors });
  await page.close();
  if (pageErrors.length || consoleErrors.length || networkErrors.length) {
    throw new Error([
      "browser errors:",
      `page=${pageErrors.join("\n") || "none"}`,
      `console=${consoleErrors.join("\n") || "none"}`,
      `network=${networkErrors.join("\n") || "none"}`,
    ].join("\n"));
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function localHeadCommit() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

async function assertProductionVersion(url) {
  if (!url.includes("minougun.github.io/jijii-kobushi")) return;
  const versionUrl = new URL("version.json", url).toString();
  const response = await fetch(versionUrl, { cache: "no-store" });
  assert(response.ok, `production version metadata missing: ${response.status} ${versionUrl}`);
  const payload = await response.json();
  assert(payload.gameId === "jii-kobushi", `unexpected production gameId: ${payload.gameId}`);
  assert(/^[0-9a-f]{40}$/i.test(payload.commit ?? ""), `invalid production commit: ${payload.commit}`);
  const expected = process.env.JII_KOBUSHI_EXPECT_COMMIT || localHeadCommit();
  if (expected) {
    assert(payload.commit === expected, `production commit mismatch: expected ${expected}, got ${payload.commit}`);
  }
}

async function openTitle(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#primaryButton").waitFor({ state: "visible" });
  const phase = await page.evaluate(() => document.documentElement.dataset.phase);
  if (phase === "opening") {
    await page.locator("#primaryButton").click();
    await page.locator("#openSettingsButton").waitFor({ state: "visible" });
  }
}

async function reachPausedBattle(page) {
  await openTitle(page);
  await page.locator("#primaryButton").click();
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const phase = await page.evaluate(() => document.documentElement.dataset.phase);
    if (phase === "battle") break;
    const skipVisible = await page.locator("#skipButton").evaluate((button) => !button.hidden && getComputedStyle(button).display !== "none").catch(() => false);
    if (skipVisible) {
      await page.locator("#skipButton").click();
    } else {
      const primaryVisible = await page.locator("#primaryButton").evaluate((button) => !button.hidden && getComputedStyle(button).display !== "none").catch(() => false);
      if (primaryVisible) await page.locator("#primaryButton").click();
    }
    await page.waitForTimeout(140);
  }
  await page.waitForFunction(() => document.documentElement.dataset.phase === "battle", null, { timeout: 10000 });
  await page.keyboard.press("Escape");
  await page.locator("#pauseMenu").waitFor({ state: "visible" });
}

async function assertStorageFailureAnnounced(page, expected = "保存できませんでした") {
  await page.waitForFunction((text) => document.querySelector("#srJudgeStatus")?.textContent?.includes(text), expected, { timeout: 2500 });
}

if (options.pagesStrict && !explicitUrl) assertNoDeletedTrackedFiles();
const local = explicitUrl ? null : await startStaticServer({ allowHeadAssetFallback: options.allowHeadAssetFallback });
const baseUrl = explicitUrl || local.url;
if (explicitUrl) await assertProductionVersion(baseUrl);
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
    await openTitle(page);
    await page.locator("#openSettingsButton").click();
    await page.locator("#offsetRange").evaluate((input) => {
      input.value = "80";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(100);
    assert(observed.pageErrors.length === 0, `storage failure leaked pageerror: ${observed.pageErrors.join("\n")}`);
    await assertStorageFailureAnnounced(page);
  });

  await withPage(browser, { width: 1280, height: 720 }, async (page) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("forced save failure", "QuotaExceededError");
      };
    });
    await reachPausedBattle(page);
    await page.locator("#saveRunButton").click();
    await assertStorageFailureAnnounced(page);
    const firstDisabled = await page.locator("#pauseLoadFirstButton").evaluate((button) => button.disabled);
    assert(firstDisabled, "failed persistent save should not enable first-loop load slot");
  });

  await withPage(browser, { width: 1280, height: 720 }, async (page) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("forced quick save failure", "QuotaExceededError");
      };
    });
    await reachPausedBattle(page);
    await page.locator("#quickSaveButton").click();
    await assertStorageFailureAnnounced(page);
    const label = await page.locator("#quickSaveButton").textContent();
    assert(!label.includes("保存済み"), `quick save failure showed success label: ${label}`);
  });

  await withPage(browser, { width: 390, height: 844 }, async (page) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("forced portrait save failure", "QuotaExceededError");
      };
    });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.locator("#portraitDismiss").click();
    await assertStorageFailureAnnounced(page);
  });

  await withPage(browser, { width: 1280, height: 720 }, async (page) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("forced language save failure", "QuotaExceededError");
      };
    });
    await openTitle(page);
    await page.locator("#openSettingsButton").click();
    await page.locator("#langEnButton").click();
    await page.waitForFunction(() => document.querySelector("#srJudgeStatus")?.textContent?.includes("Could not save"), null, { timeout: 2500 });
  });

  await withPage(browser, { width: 1280, height: 720 }, async (page) => {
    await page.addInitScript(() => {
      Storage.prototype.removeItem = () => {
        throw new DOMException("forced remove failure", "QuotaExceededError");
      };
    });
    page.on("dialog", (dialog) => dialog.accept());
    await openTitle(page);
    await page.locator("#openSettingsButton").click();
    await page.locator("#resetButton").click();
    await page.waitForFunction(() => document.querySelector("#srJudgeStatus")?.textContent?.includes("記録を削除できませんでした"), null, { timeout: 2500 });
  });

  await withPage(browser, { width: 1280, height: 720 }, async (page) => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new DOMException("forced load failure", "SecurityError");
      };
    });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.locator("#primaryButton").waitFor({ state: "visible" });
  });

  await withPage(browser, { width: 1280, height: 720 }, async (page) => {
    await page.addInitScript(() => {
      localStorage.setItem("jiiKobushi:v1", "{broken-json");
    });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.locator("#primaryButton").waitFor({ state: "visible" });
  });

  await withPage(browser, { width: 1280, height: 720 }, async (page) => {
    await reachPausedBattle(page);
    await page.locator("#pauseOffsetButton").click();
    await page.locator("#settingsRoot, .settings").first().waitFor({ state: "visible" });
    const settingsHidden = await page.locator(".settings").evaluate((element) => element.getAttribute("aria-hidden"));
    assert(settingsHidden !== "true", "open settings popout is aria-hidden");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.documentElement.classList.contains("show-settings-popout"));
    await page.waitForFunction(() => document.activeElement?.id === "pauseOffsetButton", null, { timeout: 1500 });
    const activeAfterSettings = await page.evaluate(() => document.activeElement?.id);
    assert(activeAfterSettings === "pauseOffsetButton", `focus did not return to pause offset button: ${activeAfterSettings}`);

    await page.locator("#pauseHelpButton").click();
    const helpHidden = await page.locator("#helpGuide").evaluate((element) => element.getAttribute("aria-hidden"));
    assert(helpHidden !== "true", "open help popout is aria-hidden");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.documentElement.classList.contains("show-help-popout"));
    await page.waitForFunction(() => document.activeElement?.id === "pauseHelpButton", null, { timeout: 1500 });
    const activeAfterHelp = await page.evaluate(() => document.activeElement?.id);
    assert(activeAfterHelp === "pauseHelpButton", `focus did not return to pause help button: ${activeAfterHelp}`);

    await page.locator("#pauseSettingsButton").click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.documentElement.classList.contains("show-settings-popout"));
    await page.waitForFunction(() => document.activeElement?.id === "pauseSettingsButton", null, { timeout: 1500 });
    const activeAfterSettingsButton = await page.evaluate(() => document.activeElement?.id);
    assert(activeAfterSettingsButton === "pauseSettingsButton", `focus did not return to pause settings button: ${activeAfterSettingsButton}`);
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
