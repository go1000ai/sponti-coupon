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
// Voice options:
// Adam (male, professional): pNInz6obpgDQGcFmaJgB
// Rachel (female, soft, warm): 21m00Tcm4TlvDq8ikWAM
// Bella (female, soft): EXAVITQu4vr4xnSDxMaL
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel — soft female voice

// Each segment maps to a scene in the Remotion composition
const EXPLAINER_SEGMENTS = [
  {
    name: 'intro',
    text: `Welcome to SpontiCoupon — the easiest way to attract new customers, build loyalty, and grow your local business.`,
  },
  {
    name: 'problem',
    text: `You want more customers walking through your door — and you want them coming back. But creating deals and running promotions takes time. And most platforms take a cut of every sale. There has to be a better way.`,
  },
  {
    name: 'solution',
    text: `With SpontiCoupon, you can create a professional deal in under five minutes. Just paste your website URL and our AI extracts your services, pricing, and images — then generates ready-to-publish deals for you. Or describe your offer to Ava, our AI assistant, and she writes everything — title, description, terms, and even generates an image. You review, publish, and you're live.`,
  },
  {
    name: 'how-it-works',
    text: `You get two powerful deal types. Sponti Deals are flash offers that last hours — perfect for creating urgency and attracting new customers fast. Steady Deals run for days, bringing consistent traffic. Customers claim your deal, show up, and you verify them with a quick QR scan. Simple, fast, and professional.`,
  },
  {
    name: 'difference',
    text: `Here's what makes us different. Zero commissions — you keep one hundred percent of every dollar. Plus, built-in loyalty programs that keep customers coming back. Set up a punch card or points system, and customers are automatically enrolled when they redeem. First-time visitors become loyal regulars — without you lifting a finger.`,
  },
  {
    name: 'cta',
    text: `More customers. More loyalty. More revenue. Your first deal could be live in five minutes. Visit sponticoupon dot com and get started today.`,
  },
];

const TUTORIAL_SEGMENTS = [
  {
    name: 'intro',
    text: `Welcome to SpontiCoupon! I'm going to walk you through everything you need to know to start creating deals, attracting customers, and growing your business.`,
  },
  {
    name: 'dashboard',
    text: `This is your vendor dashboard — your home base. You can see all your active deals, claims, and redemptions at a glance. Create a new deal or redeem a customer right from here. Your revenue and conversion rates update in real time.`,
  },
  {
    name: 'from-website',
    text: `Let me show you the fastest way to get started. Go to Import from Website and paste your website URL — that's all you need. Our AI will scrape your website, pull out your services, pricing, descriptions, and even images. It then generates ready-to-publish deals for you automatically. Just review each deal, tweak anything if needed, and publish with one click. You can go from zero to a full deal catalog in under two minutes.`,
  },
  {
    name: 'ava-ai',
    text: `Now meet Ava — your AI deal strategist. When you create a deal from scratch, just describe your offer idea in plain English. Ava generates the title, description, terms, and discount for you. She'll even suggest the best deal type based on your goals. Need an image? Ava generates a professional deal photo automatically. Review it, adjust if you'd like, and publish. Your deal can be live in minutes.`,
  },
  {
    name: 'deal-types',
    text: `You have two powerful deal types. Sponti Deals are flash offers lasting four to twenty-four hours — they create urgency and drive new customers fast. Steady Deals run one to thirty days for consistent, everyday traffic. We recommend using both to maximize your reach and revenue.`,
  },
  {
    name: 'payments',
    text: `Next, set up how you get paid. Connect Stripe or PayPal so customer deposits go straight to your account. You can also add Venmo, Zelle, or Cash App for in-person payments. And the best part — zero commissions. Every dollar goes directly to you.`,
  },
  {
    name: 'scan-redeem',
    text: `When a customer arrives to redeem, open the Scan page. They'll show you their QR code or give you a six-digit code. Enter it, verify the deal, and collect any remaining balance — either in person or through a Stripe payment link. Quick, simple, and professional.`,
  },
  {
    name: 'analytics',
    text: `Your analytics dashboard is where you see what's working. Track claims, redemptions, and conversion rates in real time. See the total revenue each deal generates. Compare how your Sponti deals perform versus your Steady deals. Use these insights to identify your best-performing offers and double down on what works.`,
  },
  {
    name: 'social',
    text: `Coming soon — social media auto-posting. You'll be able to connect Facebook, Instagram, X, and TikTok directly to your account. When you publish a deal, it will automatically post to all your social channels with AI-generated captions optimized for each platform. More visibility across every channel, with zero extra work from you.`,
  },
  {
    name: 'loyalty',
    text: `Build repeat business with loyalty programs. Set up punch cards or points-based rewards. Customers are automatically enrolled when they redeem a deal — turning first-time visitors into loyal regulars.`,
  },
  {
    name: 'outro',
    text: `You're all set! Create your first deal and start bringing in customers today. If you need anything, our support team is always here to help. Let's grow your business together!`,
  },
];

const ONBOARDING_SEGMENTS = [
  {
    name: 'intro',
    text: `Thank you for joining SpontiCoupon — we're so excited to have you! We built this platform to help businesses like yours attract more customers, build loyalty, and grow revenue. Let me show you how to get the most out of it.`,
  },
  {
    name: 'dashboard',
    text: `This is your dashboard — everything you need in one place. You can see your active deals, claims, redemptions, and revenue at a glance. You'll also find quick actions to create a new deal or redeem a customer right from here.`,
  },
  {
    name: 'from-website',
    text: `Here's one of the most powerful features. Paste your website URL and our AI will automatically extract your services, pricing, and images — then generate ready-to-publish deals for you in seconds. No typing, no guessing. It does the work so you don't have to.`,
  },
  {
    name: 'create-deal',
    text: `You can also create deals from scratch. Just describe your deal idea, and Ava — our AI assistant — will write the title, description, discount terms, and even suggest images. You review it, make any changes you'd like, and publish. Your deal can be live in minutes.`,
  },
  {
    name: 'deal-types',
    text: `You have two deal types to work with. Sponti deals are flash offers that last four to twenty-four hours — they create urgency and drive new customers quickly. Steady deals run one to thirty days for consistent everyday business. We recommend using both to get the best results.`,
  },
  {
    name: 'payments',
    text: `Next, set up how you get paid. Connect Stripe or PayPal and customers will pay you directly — deposits go straight to your account. You can also add Venmo, Zelle, or Cash App for in-person payments. The best part? Zero commissions. Every dollar your customer pays goes to you.`,
  },
  {
    name: 'scan-redeem',
    text: `When a customer comes in to redeem, just open the Scan page. They'll show you their QR code or give you a six-digit code. Enter it, verify the deal, and collect any remaining balance. Quick, simple, and professional.`,
  },
  {
    name: 'analytics',
    text: `Your analytics dashboard shows you what's working. Track claims, redemptions, conversion rates, and revenue in real time. Use these insights to fine-tune your deals and see what brings in the most business.`,
  },
  {
    name: 'social',
    text: `Coming soon — you'll be able to connect your Facebook, Instagram, X, and TikTok accounts. When you publish a deal, it will automatically post to your social media with AI-generated captions. More exposure for your business, zero extra effort.`,
  },
  {
    name: 'loyalty',
    text: `Build lasting relationships with loyalty programs. Create a punch card like buy ten get one free, or set up a points system. Customers are automatically enrolled when they redeem, making it effortless to turn first-time visitors into loyal regulars.`,
  },
  {
    name: 'outro',
    text: `That's everything you need to get started. We're here to help you succeed — if you ever need anything, our support team is just a click away. Welcome to SpontiCoupon. Let's grow your business together!`,
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

  if (!type || !['explainer', 'tutorial', 'onboarding'].includes(type)) {
    console.log('Usage: npx tsx remotion/scripts/generate-voiceover.ts <explainer|tutorial|onboarding>');
    process.exit(1);
  }

  if (!ELEVENLABS_API_KEY) {
    console.error('Missing ELEVENLABS_API_KEY in environment');
    process.exit(1);
  }

  const segments = type === 'explainer' ? EXPLAINER_SEGMENTS : type === 'onboarding' ? ONBOARDING_SEGMENTS : TUTORIAL_SEGMENTS;
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
