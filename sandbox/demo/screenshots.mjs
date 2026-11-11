// Captures the README screenshots from the running sandbox (yarn serve):
//   node sandbox/demo/screenshots.mjs <playwright index.mjs> <chromium executable> <output dir>
import fs from "node:fs";
import path from "node:path";

const [playwrightPath, executablePath, outDir] = process.argv.slice(2);
const { chromium } = await import(playwrightPath);

const BASE = "http://localhost:3310/apps/sandbox/";
const VIEWPORT = { width: 1440, height: 810 };
const HIDE_DEV_CHROME = ".vc-environment-banner, .vc-notification { display: none !important; }";

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath });

const setup = await browser.newContext({ viewport: VIEWPORT });
const setupPage = await setup.newPage();
await setupPage.goto(BASE);
await setupPage.waitForSelector("text=Products");
await setupPage.evaluate(() => localStorage.removeItem("guided-tours-sandbox:state"));
const storageState = await setup.storageState();
await setup.close();

const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, storageState });
const page = await context.newPage();
const popover = page.locator(".driver-popover");
const next = page.locator(".driver-popover-next-btn");
const rows = "[data-tour='sample.table'] .vc-data-table__rows-container";

async function capture(hint, name) {
  await popover.filter({ hasText: hint }).waitFor();
  await page.addStyleTag({ content: HIDE_DEV_CHROME });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
}

await page.goto(BASE + "#/sample-list");
await popover.filter({ hasText: "New in Products" }).waitFor();
await next.click();

await capture("Find it fast", "action-step");
await page.locator("[data-tour='sample.table'] .vc-input input").first().fill("desk");

await popover.filter({ hasText: "Pick several" }).waitFor();
await page.locator(`${rows} .vc-checkbox`).nth(0).click();
await page.locator(`${rows} .vc-checkbox`).nth(1).click();

await capture("Bulk actions", "bulk-actions");

await browser.close();
