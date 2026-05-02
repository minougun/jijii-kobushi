import pwPkg from "/home/minougun/maguromaru-note/node_modules/playwright/index.js";
const { chromium } = pwPkg;

const URL = process.env.JII_KOBUSHI_URL || "http://localhost:4188/";
const out = process.argv[2] || "stage1-current.png";
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
  if (/開始|タップで開始|挑戦|次へ|つぎ|始める/.test(text)) {
    await page.click("#primaryButton");
    await page.waitForTimeout(450);
  } else {
    break;
  }
}
await page.waitForTimeout(1800);

if (mode === "hero") {
  await page.screenshot({ path: out, fullPage: false, clip: { x: 200, y: 130, width: 360, height: 500 } });
} else if (mode === "head") {
  await page.screenshot({ path: out, fullPage: false, clip: { x: 280, y: 230, width: 180, height: 140 } });
} else if (mode === "chest") {
  await page.screenshot({ path: out, fullPage: false, clip: { x: 280, y: 320, width: 200, height: 180 } });
} else {
  await page.screenshot({ path: out, fullPage: false });
}
console.log("saved:", out);
await browser.close();
