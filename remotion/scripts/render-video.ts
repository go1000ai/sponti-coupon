/**
 * Render a Remotion video to MP4.
 *
 * Usage:
 *   npx tsx remotion/scripts/render-video.ts ExplainerVideo
 *   npx tsx remotion/scripts/render-video.ts TutorialVideo
 *   npx tsx remotion/scripts/render-video.ts ExplainerVideo --avatar remotion/src/assets/heygen-explainer-avatar.mp4
 */

import { execSync } from 'child_process';
import path from 'path';

const compositionId = process.argv[2];
const avatarFlag = process.argv.indexOf('--avatar');
const avatarPath = avatarFlag !== -1 ? process.argv[avatarFlag + 1] : '';

if (!compositionId) {
  console.log('Usage: npx tsx remotion/scripts/render-video.ts <ExplainerVideo|TutorialVideo> [--avatar <path>]');
  process.exit(1);
}

const outDir = path.join(__dirname, '..', 'out');
const outFile = path.join(outDir, `${compositionId}.mp4`);

const props = avatarPath
  ? `--props='${JSON.stringify({ avatarVideoUrl: path.resolve(avatarPath) })}'`
  : '';

const cmd = [
  'npx remotion render',
  `remotion/src/index.ts`,
  compositionId,
  outFile,
  props,
  '--codec h264',
].filter(Boolean).join(' ');

console.log(`Rendering ${compositionId}...`);
console.log(`Command: ${cmd}\n`);

try {
  execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..', '..') });
  console.log(`\nOutput: ${outFile}`);
} catch (err) {
  console.error('Render failed');
  process.exit(1);
}
