/**
 * Playwright screenshot capture for the two new tutorial videos:
 *   1) customer-redemption-tutorial — payment + redemption flows
 *   2) loyalty-program-tutorial     — loyalty program enrollment + earning
 *
 * Capture targets are best-effort: missing data on the test vendor is fine,
 * the Remotion compositions degrade gracefully to in-video mockups.
 *
 * Usage: npx tsx remotion/scripts/capture-tutorial-shots.ts
 */
import { chromium, type Page } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const VENDOR_EMAIL = 'apponlinefl@gmail.com';
const VENDOR_PASSWORD = process.env.TEST_VENDOR_PASSWORD || 'normi330';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../public/screenshots');
const VIEWPORT = { width: 1920, height: 1080 };

const TARGETS: Array<{
  filename: string;
  pagePath: string;
  description: string;
  before?: (page: Page) => Promise<void>;
}> = [
  // Video 1 — payment / redemption
  {
    filename: 'vendor-loyalty-fresh.png',
    pagePath: '/vendor/loyalty',
    description: 'Vendor loyalty page (whichever state it is in)',
  },
  {
    filename: 'vendor-deal-form.png',
    pagePath: '/vendor/deals/new',
    description: 'Vendor deal-creation form',
  },
  {
    filename: 'scan-input.png',
    pagePath: '/vendor/scan',
    description: 'Vendor scan page — code-input state',
  },
  {
    filename: 'vendor-payments.png',
    pagePath: '/vendor/payments',
    description: 'Vendor payments / Stripe Connect setup page',
  },
  {
    filename: 'my-deals.png',
    pagePath: '/dashboard/my-deals',
    description: 'Customer-side claimed deals list',
  },
  {
    filename: 'deals-public.png',
    pagePath: '/deals',
    description: 'Public deals listing (customer view)',
  },
];

async function dismissOverlays(page: Page) {
  try {
    const banner = page.locator('button:has-text("Accept All")');
    if (await banner.isVisible({ timeout: 800 })) await banner.click();
  } catch {}
  try {
    const tip = page.locator('.react-joyride__tooltip');
    if (await tip.isVisible({ timeout: 800 })) {
      const skip = tip.locator('button:has-text("Skip")');
      if (await skip.isVisible({ timeout: 300 })) await skip.click();
    }
  } catch {}
  // Best-effort: hide the floating Olivia widget
  try {
    await page.evaluate(() => {
      document
        .querySelectorAll(
          '[class*="olivia" i], [class*="floating-widget" i], [id*="olivia" i]'
        )
        .forEach((el) => ((el as HTMLElement).style.display = 'none'));
    });
  } catch {}
}

async function waitReady(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
}

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  console.log('[1/2] Logging in as vendor:', VENDOR_EMAIL);
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await new Promise((r) => setTimeout(r, 3500));
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.locator('input[type="email"]').fill(VENDOR_EMAIL);
  const passInput = page.locator('input').nth(1);
  await passInput.fill(VENDOR_PASSWORD);

  await Promise.all([
    page.waitForURL('**/vendor/**', { timeout: 30000 }).catch(() => {}),
    page.locator('button[type="submit"]').click(),
  ]);

  await new Promise((r) => setTimeout(r, 2500));
  await dismissOverlays(page);

  await page.evaluate(() => {
    [
      'sponti_tour_vendor-dashboard_done',
      'sponti_tour_social_done',
      'sponti_tour_customer-dashboard_done',
      'sponti_tour_scan_done',
      'sponti_tour_loyalty_done',
    ].forEach((k) => localStorage.setItem(k, 'true'));
    localStorage.setItem('sponti_tour_auto_start', 'false');
    localStorage.setItem('cookie_consent', 'all');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 1500));

  console.log('[2/2] Capturing pages...\n');
  for (let i = 0; i < TARGETS.length; i++) {
    const t = TARGETS[i];
    const num = `[${i + 1}/${TARGETS.length}]`;
    try {
      console.log(`${num} ${t.description} (${t.pagePath})`);
      await page.goto(`${BASE_URL}${t.pagePath}`, { waitUntil: 'domcontentloaded' });
      await waitReady(page);
      await dismissOverlays(page);
      if (t.before) await t.before(page);
      const out = path.join(SCREENSHOTS_DIR, t.filename);
      await page.screenshot({ path: out, fullPage: false });
      console.log(`    -> ${t.filename}`);
    } catch (err) {
      console.warn(`    !! Failed to capture ${t.filename}:`, (err as Error).message);
    }
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
