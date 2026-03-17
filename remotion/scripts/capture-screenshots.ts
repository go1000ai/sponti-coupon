/**
 * Playwright screenshot capture script for SpontiCoupon onboarding tutorial videos.
 *
 * Captures vendor dashboard page screenshots for use in Remotion compositions.
 *
 * Usage:
 *   VENDOR_TEST_PASSWORD=your_password npx tsx remotion/scripts/capture-screenshots.ts
 *
 * Prerequisites:
 *   - The app must be running at http://localhost:3000
 *   - You must set VENDOR_TEST_PASSWORD env var to the test vendor account password
 *   - Playwright browsers must be installed: npx playwright install chromium
 */

import { chromium, type Page } from 'playwright';
import path from 'path';
import fs from 'fs';

// ── Configuration ──────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000';
const VENDOR_EMAIL = 'apponlinefl@gmail.com';

// NOTE: Set VENDOR_TEST_PASSWORD env var before running this script.
// Example: VENDOR_TEST_PASSWORD=mypassword npx tsx remotion/scripts/capture-screenshots.ts
const VENDOR_PASSWORD = process.env.VENDOR_TEST_PASSWORD || 'changeme';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../public/screenshots');
const VIEWPORT = { width: 1920, height: 1080 };
const SETTLE_DELAY_MS = 2000; // Wait for animations to settle after page load

// Pages to capture (in order)
const PAGES_TO_CAPTURE: Array<{
  filename: string;
  path: string;
  description: string;
  beforeCapture?: (page: Page) => Promise<void>;
}> = [
  {
    filename: 'vendor-dashboard.png',
    path: '/vendor/dashboard',
    description: 'Main dashboard overview',
  },
  {
    filename: 'create-deal.png',
    path: '/vendor/deals/new',
    description: 'Create deal form',
  },
  {
    filename: 'from-website.png',
    path: '/vendor/deals/from-website',
    description: 'Website scraper/import',
  },
  {
    filename: 'deal-type-selection.png',
    path: '/vendor/deals/new',
    description: 'Deal type selector (Sponti vs Steady)',
    beforeCapture: async (page: Page) => {
      // Scroll to the deal type selector section using XPath-style text search
      await page.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const text = el.textContent?.trim() || '';
          if (text === 'Deal Type' || text === 'Sponti Coupon' || text === 'Steady Deal') {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            return;
          }
        }
        window.scrollBy(0, 400);
      });
      await new Promise((r) => setTimeout(r, 500));
    },
  },
  {
    filename: 'scan-redeem.png',
    path: '/vendor/scan',
    description: 'QR scan / redemption page',
  },
  {
    filename: 'payments.png',
    path: '/vendor/payments',
    description: 'Payment setup',
  },
  {
    filename: 'analytics.png',
    path: '/vendor/analytics',
    description: 'Analytics dashboard',
  },
  {
    filename: 'social.png',
    path: '/vendor/social',
    description: 'Social media connections',
  },
  {
    filename: 'loyalty.png',
    path: '/vendor/loyalty',
    description: 'Loyalty programs',
  },
  {
    filename: 'settings.png',
    path: '/vendor/settings',
    description: 'Account settings',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────────

async function dismissOverlays(page: Page): Promise<void> {
  // Dismiss cookie banner if present
  try {
    const cookieBanner = page.locator('button:has-text("Accept All")');
    if (await cookieBanner.isVisible({ timeout: 1000 })) {
      await cookieBanner.click();
      console.log('    -> Dismissed cookie banner');
      await new Promise((r) => setTimeout(r, 500));
    }
  } catch {
    // No cookie banner — fine
  }

  // Dismiss react-joyride tour tooltips if present
  try {
    const tooltip = page.locator('.react-joyride__tooltip');
    if (await tooltip.isVisible({ timeout: 1000 })) {
      const skipBtn = tooltip.locator('button:has-text("Skip")');
      const closeBtn = tooltip.locator('button:has-text("Close")');
      const xBtn = tooltip.locator('button[aria-label="Close"]');

      if (await skipBtn.isVisible({ timeout: 500 })) {
        await skipBtn.click();
        console.log('    -> Dismissed tour (Skip)');
      } else if (await closeBtn.isVisible({ timeout: 500 })) {
        await closeBtn.click();
        console.log('    -> Dismissed tour (Close)');
      } else if (await xBtn.isVisible({ timeout: 500 })) {
        await xBtn.click();
        console.log('    -> Dismissed tour (X)');
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  } catch {
    // No tour popup — fine
  }

  // Hide Olivia floating widget for clean screenshots
  try {
    await page.evaluate(() => {
      // Hide the Olivia chat widget bubble
      const widgets = document.querySelectorAll('[class*="olivia"], [class*="floating-widget"], [id*="olivia"]');
      widgets.forEach((el) => (el as HTMLElement).style.display = 'none');
      // Also hide any fixed-position chat bubbles in bottom-right
      const allFixed = document.querySelectorAll('*');
      allFixed.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && parseInt(style.bottom) < 60 && parseInt(style.right) < 60) {
          const tag = el.tagName.toLowerCase();
          if (tag !== 'div' || el.children.length < 3) {
            // Likely a floating button/widget
          }
        }
      });
    });
  } catch {
    // Fine if this fails
  }
}

async function waitForPageReady(page: Page): Promise<void> {
  // Wait for network to be mostly idle
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
    // networkidle can sometimes time out on pages with polling; continue anyway
  });
  // Additional settle delay for CSS animations, skeleton loaders, etc.
  await new Promise((r) => setTimeout(r, SETTLE_DELAY_MS));
}

// ── Main ────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== SpontiCoupon Screenshot Capture ===\n');

  if (VENDOR_PASSWORD === 'changeme') {
    console.warn(
      '⚠  WARNING: VENDOR_TEST_PASSWORD is not set. Using default "changeme".\n' +
        '   Set it via: VENDOR_TEST_PASSWORD=your_password npx tsx remotion/scripts/capture-screenshots.ts\n'
    );
  }

  // Ensure screenshots directory exists
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  console.log(`Screenshots will be saved to: ${SCREENSHOTS_DIR}\n`);

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    // ── Step 1: Login ───────────────────────────────────────────────────────
    console.log('[1/2] Logging in as vendor...');
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await new Promise((r) => setTimeout(r, 5000)); // Wait for client hydration

    // Fill login form
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.locator('input[type="email"]').fill(VENDOR_EMAIL);
    await page.waitForSelector('input[type="password"], input.input-field', { timeout: 5000 });
    // Password field may be type="text" if show/hide toggle is active
    const passwordInput = page.locator('input').nth(1);
    await passwordInput.fill(VENDOR_PASSWORD);

    // Submit and wait for navigation to vendor dashboard
    await Promise.all([
      page.waitForURL('**/vendor/**', { timeout: 30000 }),
      page.locator('button[type="submit"]').click(),
    ]);

    // Dismiss cookie banner on first page after login
    await new Promise((r) => setTimeout(r, 2000));
    await dismissOverlays(page);

    // Disable tours and cookies via localStorage, then reload to take effect
    await page.evaluate(() => {
      localStorage.setItem('sponti_tour_vendor-dashboard_done', 'true');
      localStorage.setItem('sponti_tour_social_done', 'true');
      localStorage.setItem('sponti_tour_customer-dashboard_done', 'true');
      localStorage.setItem('sponti_tour_auto_start', 'false');
      localStorage.setItem('cookie_consent', 'all');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await new Promise((r) => setTimeout(r, 2000));

    console.log('[2/2] Login successful! Starting screenshot capture...\n');

    // ── Step 2: Capture each page ───────────────────────────────────────────
    for (let i = 0; i < PAGES_TO_CAPTURE.length; i++) {
      const { filename, path: pagePath, description, beforeCapture } = PAGES_TO_CAPTURE[i];
      const num = `[${i + 1}/${PAGES_TO_CAPTURE.length}]`;

      console.log(`${num} Capturing: ${description} (${pagePath})`);

      await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'domcontentloaded' });
      await waitForPageReady(page);
      await dismissOverlays(page);

      // Run any page-specific setup (e.g., scrolling)
      if (beforeCapture) {
        await beforeCapture(page);
      }

      const filepath = path.join(SCREENSHOTS_DIR, filename);
      await page.screenshot({ path: filepath, fullPage: false });
      console.log(`    -> Saved: ${filename}`);
    }

    console.log(`\nDone! ${PAGES_TO_CAPTURE.length} screenshots captured.`);
    console.log(`Output directory: ${SCREENSHOTS_DIR}`);
  } catch (err) {
    console.error('\nScreenshot capture failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
