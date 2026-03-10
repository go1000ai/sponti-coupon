/**
 * Export business card as print-ready 300 DPI PNG images.
 *
 * Usage:
 *   npx tsx scripts/export-business-card.ts
 *
 * Output:
 *   public/business-card-front.png  (1050x600 — 3.5" x 2" at 300dpi)
 *   public/business-card-back.png   (1050x600 — 3.5" x 2" at 300dpi)
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  const htmlPath = path.join(__dirname, '..', 'public', 'business-card.html');
  const outDir = path.join(__dirname, '..', 'public');

  if (!fs.existsSync(htmlPath)) {
    console.error('business-card.html not found at', htmlPath);
    process.exit(1);
  }

  console.log('Launching browser...');
  const browser = await chromium.launch();

  // 300 DPI: 3.5" x 2" = 1050 x 600px
  // The HTML card is 700x400. Device scale factor 1.5 → 1050x600 output.
  const context = await browser.newContext({
    deviceScaleFactor: 1.5,
    viewport: { width: 1200, height: 1600 },
  });

  const page = await context.newPage();

  // Serve static files by navigating to the HTML with a file server
  // We need the logo to load, so start a simple local server
  const http = await import('http');
  const server = http.createServer((req, res) => {
    let filePath = path.join(outDir, req.url === '/' ? 'business-card.html' : req.url!);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.js': 'application/javascript',
      '.css': 'text/css',
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise<void>((resolve) => server.listen(9876, resolve));
  console.log('Local server on port 9876');

  await page.goto('http://localhost:9876/business-card.html', { waitUntil: 'networkidle' });

  // Wait for fonts + QR code to render
  await page.waitForTimeout(2000);

  // Screenshot the front card
  const frontCard = page.locator('.card-front');
  await frontCard.screenshot({
    path: path.join(outDir, 'business-card-front.png'),
    type: 'png',
  });
  console.log('✓ business-card-front.png (1050x600 @ 300dpi)');

  // Screenshot the back card
  const backCard = page.locator('.card-back');
  await backCard.screenshot({
    path: path.join(outDir, 'business-card-back.png'),
    type: 'png',
  });
  console.log('✓ business-card-back.png (1050x600 @ 300dpi)');

  await browser.close();
  server.close();

  console.log(`\nDone! Files saved to:\n  ${outDir}/business-card-front.png\n  ${outDir}/business-card-back.png`);
  console.log('\nThese are 300 DPI print-ready images. Upload directly to:');
  console.log('  - Canva (upload as image, place on 3.5" x 2" canvas)');
  console.log('  - VistaPrint, MOO, or any print shop');
  console.log('  - Local Orlando print shop for same-day pickup');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
