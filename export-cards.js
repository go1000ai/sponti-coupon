const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 6, // 6x = ultra-high resolution
  });
  const page = await context.newPage();

  // Set viewport large enough to fit the cards
  await page.setViewportSize({ width: 1600, height: 1400 });

  // Load the business card HTML — use file:// but serve logo via route
  const htmlPath = path.resolve(__dirname, 'public/business-card.html');
  await page.goto('file://' + htmlPath);

  // Wait for Google Fonts + QR canvas to fully render
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Export FRONT
  const front = await page.locator('.card-front').first();
  await front.screenshot({
    path: path.resolve(__dirname, 'public/business-card-front.png'),
    type: 'png',
  });
  console.log('✓ Saved: public/business-card-front.png');

  // Export BACK
  const back = await page.locator('.card-back').first();
  await back.screenshot({
    path: path.resolve(__dirname, 'public/business-card-back.png'),
    type: 'png',
  });
  console.log('✓ Saved: public/business-card-back.png');

  await browser.close();
  console.log('\nDone! Both PNGs saved to sponti-coupon/public/');
})();
