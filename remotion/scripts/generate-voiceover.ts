/**
 * Generate voiceover audio via ElevenLabs for Remotion compositions.
 *
 * Usage:
 *   npx tsx remotion/scripts/generate-voiceover.ts explainer
 *   npx tsx remotion/scripts/generate-voiceover.ts tutorial
 */

import fs from 'fs';
import path from 'path';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam — professional male voice

// Each segment maps to a scene in the Remotion composition
const EXPLAINER_SEGMENTS = [
  {
    name: 'intro',
    text: `Hey, I'm Heriberto — founder of SpontiCoupon. The smartest way to fill empty seats at your local business.`,
  },
  {
    name: 'problem',
    text: `Let me ask you something. How many times this week did your business have empty tables, open chairs, or unsold slots? Every empty seat is money left on the table. Traditional advertising is expensive and slow. By the time customers see your ad, the moment has passed.`,
  },
  {
    name: 'solution',
    text: `That's exactly why I built SpontiCoupon. You get two powerful deal types. Sponti Deals are flash offers that expire in hours — perfect for filling today's empty spots and creating real urgency. Steady Deals are ongoing offers that bring consistent foot traffic, day after day.`,
  },
  {
    name: 'how-it-works',
    text: `Here's how it works. You create a deal in minutes — set your offer, price, and time window. Customers in your area see your deal, claim it, and pay the deposit directly to your account through Stripe or PayPal. When they show up, you scan their QR code, collect any remaining balance, and you're done.`,
  },
  {
    name: 'difference',
    text: `What makes us different? Simple. We never touch your money. Zero commissions. Zero middleman fees. Your customers pay you directly. Deposits on Sponti deals protect you from no-shows. And we work with Stripe, PayPal, Venmo, Zelle, and Cash App.`,
  },
  {
    name: 'cta',
    text: `Ready to turn those empty seats into paying customers? Visit sponticoupon dot com and get started today. Join hundreds of local businesses already growing with SpontiCoupon. Your first deal could be live in five minutes.`,
  },
];

const TUTORIAL_SEGMENTS = [
  {
    name: 'intro',
    text: `Welcome to SpontiCoupon! I'm going to walk you through your vendor dashboard so you can start creating deals right away.`,
  },
  {
    name: 'step1',
    text: `Step one — creating your first deal. From your dashboard, click Create New Deal. Choose between a Sponti deal — that's a flash offer lasting four to twenty-four hours — or a Steady deal for longer-running offers. Set your discount, add a description, upload a photo, and hit publish. It's that easy.`,
  },
  {
    name: 'step2',
    text: `Step two — setting up payments. Go to your Get Paid page. Connect Stripe or PayPal so customers can pay deposits online, directly to your account. You can also add Venmo, Zelle, or Cash App for in-person payments at your location.`,
  },
  {
    name: 'step3',
    text: `Step three — when a customer claims your deal, they'll pay the deposit through your connected payment processor. You'll get a notification. The money goes straight to your Stripe or PayPal account — we never hold it.`,
  },
  {
    name: 'step4',
    text: `Step four — scanning and redeeming. When the customer arrives at your business, open the Scan page. They'll show you their QR code or give you their six-digit code. Enter it, verify the deal, and collect any remaining balance. Transaction complete.`,
  },
  {
    name: 'step5',
    text: `Step five — tracking your results. Your dashboard shows everything — active deals, total claims, redemptions, revenue, and customer reviews. Use these insights to fine-tune your offers and keep customers coming back.`,
  },
  {
    name: 'outro',
    text: `That's it! Five simple steps to start growing your business. If you need help, our support team is always here. Now go create your first deal and start filling those seats!`,
  },
];

async function generateSegment(text: string, name: string, outDir: string): Promise<string> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error for "${name}": ${res.status} ${err}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(outDir, `${name}.mp3`);
  fs.writeFileSync(outPath, buffer);
  console.log(`  ✓ ${name}.mp3 (${(buffer.length / 1024).toFixed(0)} KB)`);
  return outPath;
}

async function main() {
  const type = process.argv[2];

  if (!type || !['explainer', 'tutorial'].includes(type)) {
    console.log('Usage: npx tsx remotion/scripts/generate-voiceover.ts <explainer|tutorial>');
    process.exit(1);
  }

  if (!ELEVENLABS_API_KEY) {
    console.error('Missing ELEVENLABS_API_KEY in environment');
    process.exit(1);
  }

  const segments = type === 'explainer' ? EXPLAINER_SEGMENTS : TUTORIAL_SEGMENTS;
  const outDir = path.join(__dirname, '..', 'src', 'assets', 'audio', type);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Generating ${segments.length} audio segments for ${type} video...\n`);

  for (const seg of segments) {
    await generateSegment(seg.text, seg.name, outDir);
  }

  // Also generate a single combined file
  console.log('\nGenerating full combined voiceover...');
  const fullText = segments.map((s) => s.text).join('\n\n');
  await generateSegment(fullText, `${type}-full`, path.join(__dirname, '..', 'src', 'assets', 'audio'));

  console.log(`\nDone! Audio files saved to remotion/src/assets/audio/${type}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
