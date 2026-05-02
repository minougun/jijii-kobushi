import pwPkg from "/home/minougun/maguromaru-note/node_modules/playwright/index.js";
const { chromium } = pwPkg;

const URL = process.env.JII_KOBUSHI_URL || "http://localhost:4188/";
const out = process.argv[2] || "narration.png";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 760 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "domcontentloaded" });

await page.waitForSelector("#primaryButton:not([hidden])", { timeout: 10000 });

for (let i = 0; i < 10; i += 1) {
  const text = await page.$eval("#primaryButton", (el) => (el.textContent || "").trim());
  if (/開始|タップで開始|挑戦|始める/.test(text) && !/次へ|つぎ/.test(text)) {
    await page.click("#primaryButton");
    await page.waitForTimeout(450);
  } else {
    break;
  }
}
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: false });
console.log("saved:", out);
await browser.close();
