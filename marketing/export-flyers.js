const puppeteer = require('puppeteer');
const path = require('path');

const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true });

  // Front
  const frontPage = await browser.newPage();
  await frontPage.setViewport({ width: 2550, height: 3750, deviceScaleFactor: 2 });
  await frontPage.goto('file://' + path.resolve(__dirname, 'flyer-front.html'), { waitUntil: 'networkidle0' });
  await delay(3000);
  const frontEl = await frontPage.$('.flyer-page');
  await frontEl.screenshot({
    path: path.resolve(__dirname, 'flyer-front.jpg'),
    type: 'jpeg',
    quality: 100,
  });
  console.log('✓ Saved flyer-front.jpg');

  // Back
  const backPage = await browser.newPage();
  await backPage.setViewport({ width: 2550, height: 3750, deviceScaleFactor: 2 });
  await backPage.goto('file://' + path.resolve(__dirname, 'flyer-back.html'), { waitUntil: 'networkidle0' });
  await delay(3000);
  const backEl = await backPage.$('.flyer-page');
  await backEl.screenshot({
    path: path.resolve(__dirname, 'flyer-back.jpg'),
    type: 'jpeg',
    quality: 100,
  });
  console.log('✓ Saved flyer-back.jpg');

  await browser.close();
  console.log('\nDone! Files saved to marketing/flyer-front.jpg and marketing/flyer-back.jpg');
})();
