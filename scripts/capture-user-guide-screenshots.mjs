import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "user-guide", "screenshots");
const BASE = "http://localhost:3000";
const EMAIL = "admin@alubondcrm.local";
const PASSWORD = "Admin@12345";

async function hideAdminOnlyUi(page) {
  await page.addStyleTag({
    content: `
      a[href="/users"],
      button[aria-label="Delete project"],
      [data-admin-only="true"] { display: none !important; }
    `,
  });
}

async function shot(page, name, options = {}) {
  await hideAdminOnlyUi(page);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true, ...options });
  console.log(`Saved ${file}`);
  return `screenshots/${name}.png`;
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 30000 });
  await page.waitForTimeout(1500);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const manifest = {};

  manifest.login = await shot(page, "01-login");
  await login(page);

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  manifest.dashboard = await shot(page, "02-dashboard");

  await page.goto(`${BASE}/pipeline`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  manifest.pipeline = await shot(page, "03-pipeline");

  const projectLink = page.locator('a[href^="/projects/"]').first();
  if (await projectLink.count()) {
    await projectLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    manifest.projectDetail = await shot(page, "04-project-detail");

    const logButton = page.getByRole("button", { name: /log activity|new activity|add activity/i }).first();
    if (await logButton.count()) {
      await logButton.click();
      await page.waitForTimeout(1000);
      manifest.logActivity = await shot(page, "05-log-activity");
    }
  }

  await page.goto(`${BASE}/follow-ups`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  manifest.followUps = await shot(page, "06-follow-ups");

  await page.goto(`${BASE}/map`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  manifest.map = await shot(page, "07-map");

  await page.goto(`${BASE}/team`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  manifest.team = await shot(page, "08-team");

  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  manifest.profile = await shot(page, "09-profile");

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await mobilePage.fill("#email", EMAIL);
  await mobilePage.fill("#password", PASSWORD);
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForURL(`${BASE}/`, { timeout: 30000 });
  await mobilePage.waitForTimeout(1500);
  manifest.mobileHome = await shot(mobilePage, "10-mobile-home");

  await mobilePage.goto(`${BASE}/pipeline`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1500);
  manifest.mobilePipeline = await shot(mobilePage, "11-mobile-pipeline");

  await writeFile(path.join(ROOT, "docs", "user-guide", "screenshots.json"), JSON.stringify(manifest, null, 2));
  await browser.close();
  console.log("Done.", manifest);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
