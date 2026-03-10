/**
 * Generate a HeyGen avatar video clip for use in Remotion compositions.
 *
 * Usage:
 *   npx tsx remotion/scripts/generate-heygen-clip.ts explainer
 *   npx tsx remotion/scripts/generate-heygen-clip.ts tutorial
 *
 * Downloads the finished MP4 to remotion/src/assets/
 */

import fs from 'fs';
import path from 'path';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY!;
const AVATAR_ID = '3f2122a6dfb748cfa800909dd51844d9'; // Heriberto Santiago
const VOICE_ID = '02b9f7bdf1db4c318c2907115854622d'; // Heriberto Santiago voice

// --- Scripts ---

const EXPLAINER_SCRIPT = `Hey, I'm Heriberto — founder of SpontiCoupon.

Let me ask you something. How many times this week did your business have empty tables, open chairs, or unsold slots? Every empty seat is money left on the table.

That's exactly why I built SpontiCoupon. We help local businesses like yours fill those gaps — fast.

Here's how it works. You create a deal in minutes. Pick a Sponti Deal for flash offers that expire in hours — perfect for filling today's empty spots. Or create a Steady Deal for ongoing offers that bring consistent foot traffic.

Customers in your area see your deal, claim it, and pay a deposit directly to YOUR account — through Stripe or PayPal. We never touch your money. Zero commissions. Zero middleman fees.

When the customer shows up, you scan their QR code, collect any remaining balance, and you're done.

What makes us different? Simple. Other platforms take a cut of every sale. We don't. Your customers pay you directly. Our only charge is a flat monthly subscription — that's it.

Deposits on Sponti deals also protect you from no-shows. If someone claims your deal but doesn't show up, you keep the deposit. Your time is valuable.

Ready to turn those empty seats into paying customers? Visit sponticoupon dot com and get started today. Your first deal could be live in five minutes.`;

const TUTORIAL_SCRIPT = `Welcome to SpontiCoupon! I'm going to walk you through your vendor dashboard so you can start creating deals right away.

Step one — creating your first deal. From your dashboard, click Create New Deal. Choose between a Sponti deal — that's a flash offer lasting four to twenty-four hours — or a Steady deal for longer-running offers. Set your discount, add a description, upload a photo, and hit publish. It's that easy.

Step two — setting up payments. Go to your Get Paid page. Connect Stripe or PayPal so customers can pay deposits online, directly to your account. You can also add Venmo, Zelle, or Cash App for in-person payments at your location.

Step three — when a customer claims your deal. They'll see your offer on SpontiCoupon, claim it, and pay the deposit. You'll get a notification. The money goes straight to your Stripe or PayPal account — we never hold it.

Step four — scanning and redeeming. When the customer arrives at your business, open the Scan page. They'll show you their QR code or give you their six-digit code. Enter it, verify the deal, and collect any remaining balance. Transaction complete.

Step five — tracking your results. Your dashboard shows everything — active deals, total claims, redemptions, revenue, and customer reviews. Use these insights to fine-tune your offers and keep customers coming back.

That's it! Five simple steps. If you need help, our support team is always here. Now go create your first deal and start filling those seats!`;

// --- HeyGen API ---

async function createVideo(script: string, title: string): Promise<string> {
  console.log(`Creating HeyGen video: "${title}"...`);

  const res = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: {
      'X-Api-Key': HEYGEN_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: AVATAR_ID,
            scale: 1,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            voice_id: VOICE_ID,
            input_text: script,
            speed: 1.0,
          },
          background: {
            type: 'color',
            value: '#00FF00', // Green screen for compositing in Remotion
          },
        },
      ],
      dimension: {
        width: 720,
        height: 720, // Square for PIP overlay
      },
      title,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen create error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const videoId = data.data.video_id;
  console.log(`Video ID: ${videoId}`);
  return videoId;
}

async function pollVideoStatus(videoId: string): Promise<string> {
  console.log('Waiting for video to render...');

  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000)); // Poll every 5s

    const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
      headers: { 'X-Api-Key': HEYGEN_API_KEY },
    });

    const data = await res.json();
    const status = data.data?.status;

    if (status === 'completed') {
      const url = data.data.video_url;
      console.log(`Video ready: ${url}`);
      return url;
    } else if (status === 'failed') {
      throw new Error(`HeyGen render failed: ${JSON.stringify(data.data.error)}`);
    }

    process.stdout.write(`.`);
  }

  throw new Error('HeyGen render timed out after 10 minutes');
}

async function downloadVideo(url: string, filename: string): Promise<string> {
  const outDir = path.join(__dirname, '..', 'src', 'assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, filename);
  console.log(`Downloading to ${outPath}...`);

  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buffer);

  console.log(`Saved: ${outPath} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
  return outPath;
}

// --- Main ---

async function main() {
  const type = process.argv[2];

  if (!type || !['explainer', 'tutorial'].includes(type)) {
    console.log('Usage: npx tsx remotion/scripts/generate-heygen-clip.ts <explainer|tutorial>');
    process.exit(1);
  }

  if (!HEYGEN_API_KEY) {
    console.error('Missing HEYGEN_API_KEY in environment');
    process.exit(1);
  }

  const script = type === 'explainer' ? EXPLAINER_SCRIPT : TUTORIAL_SCRIPT;
  const title = type === 'explainer'
    ? 'SpontiCoupon Explainer - Heriberto'
    : 'SpontiCoupon Tutorial - Heriberto';
  const filename = type === 'explainer'
    ? 'heygen-explainer-avatar.mp4'
    : 'heygen-tutorial-avatar.mp4';

  const videoId = await createVideo(script, title);
  const videoUrl = await pollVideoStatus(videoId);
  await downloadVideo(videoUrl, filename);

  console.log(`\nDone! Use this in your Remotion composition:`);
  console.log(`  avatarVideoUrl: require('./assets/${filename}')`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
