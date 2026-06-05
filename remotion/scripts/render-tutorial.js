/**
 * Direct Remotion render via API — bypasses the CLI in case it hangs.
 * Usage: node remotion/scripts/render-tutorial.js <compositionId> <outFile>
 */
const path = require('path');

async function main() {
  const compositionId = process.argv[2];
  const outFile = process.argv[3];
  if (!compositionId || !outFile) {
    console.error('Usage: node render-tutorial.js <compositionId> <outFile>');
    process.exit(1);
  }

  const bundler = require('@remotion/bundler');
  const renderer = require('@remotion/renderer');

  const entry = path.resolve(__dirname, '../src/index.ts');
  const publicDir = path.resolve(__dirname, '../public');
  console.log('[1/3] Bundling:', entry);
  const bundleLocation = await bundler.bundle({
    entryPoint: entry,
    publicDir,
    onProgress: (p) => {
      if (p % 10 === 0 || p === 100) console.log(`  bundling: ${p}%`);
    },
    webpackOverride: (c) => c,
  });
  console.log('[1/3] Bundle ready at', bundleLocation);

  console.log('[2/3] Selecting composition', compositionId);
  const composition = await renderer.selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
  });
  console.log('  duration:', composition.durationInFrames, 'frames @ ', composition.fps, 'fps');

  const fullOut = path.resolve(__dirname, '..', outFile);
  console.log('[3/3] Rendering →', fullOut);
  let last = -1;
  await renderer.renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: fullOut,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct !== last && pct % 5 === 0) {
        last = pct;
        console.log(`  render: ${pct}%`);
      }
    },
    chromiumOptions: {
      headless: true,
    },
  });
  console.log('DONE:', fullOut);
}

main().catch((err) => {
  console.error('RENDER_FAILED:', err);
  process.exit(1);
});
