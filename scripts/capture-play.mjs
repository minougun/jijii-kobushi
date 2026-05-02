import pwPkg from "/home/minougun/maguromaru-note/node_modules/playwright/index.js";
const { chromium } = pwPkg;

const URL = process.env.JII_KOBUSHI_URL || "http://localhost:4188/";
const out = process.argv[2] || "stage1-play.png";
const mode = process.argv[3] || "full";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 760 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "domcontentloaded" });

await page.waitForSelector("#primaryButton:not([hidden])", { timeout: 10000 });

for (let i = 0; i < 30; i += 1) {
  const text = await page.$eval("#primaryButton", (el) => (el.textContent || "").trim());
  if (text.length === 0) break;
  await page.click("#primaryButton");
  await page.waitForTimeout(300);
  const stillVisible = await page.$eval("#primaryButton", (el) => !el.hidden && el.offsetParent !== null).catch(() => false);
  if (!stillVisible) break;
}

await page.waitForTimeout(1500);

if (mode === "hero") {
  await page.screenshot({
    path: out,
    fullPage: false,
    clip: { x: 220, y: 200, width: 280, height: 360 },
  });
} else {
  await page.screenshot({ path: out, fullPage: false });
}
console.log("saved:", out);
await browser.close();
