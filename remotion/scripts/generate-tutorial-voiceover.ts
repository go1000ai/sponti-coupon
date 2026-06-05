/**
 * Regenerate voiceover for the Customer Redemption + Loyalty Program tutorials
 * using ElevenLabs (Rachel — soft, warm female voice).
 *
 * Replaces the robotic macOS `say` audio from generate-voiceover-say.sh.
 *
 * Usage:
 *   npx tsx remotion/scripts/generate-tutorial-voiceover.ts customer
 *   npx tsx remotion/scripts/generate-tutorial-voiceover.ts loyalty
 *   npx tsx remotion/scripts/generate-tutorial-voiceover.ts all
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Load ELEVENLABS_API_KEY from .env.local if not already in env
function loadEnv() {
  if (process.env.ELEVENLABS_API_KEY) return;
  const envPath = path.join(__dirname, '..', '..', '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^ELEVENLABS_API_KEY=(.*)$/);
      if (m) process.env.ELEVENLABS_API_KEY = m[1].trim().replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
// Rachel — the voice used in the earlier SpontiCoupon videos (ExplainerVideo, etc.).
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

const CUSTOMER = [
  { name: 'intro', text: `How do customers actually pay and redeem deals on Spontee Coupon? Let's walk through the three flows, end to end.` },
  { name: 'redeem-how', text: `There are three quick ways to redeem a deal. One — on the home page, just tap Scan QR in the top menu. Two — open Scan and Redeem from your dashboard sidebar. Three — type the code right into Quick Redeem, on your dashboard home. Then it's simple. Scan the customer's QR code with your phone, or any device that has a camera. No camera? Just type their six-digit code. Either way, the deal opens up, and you're ready to confirm.` },
  { name: 'full-payment', text: `Scenario one. Full payment online. The customer taps Claim and Pay, and pays the full price through Stripe Checkout. The money goes straight into the vendor's connected Stripe account, and then to the vendor's bank. Spontee Coupon never touches it.` },
  { name: 'full-in-store', text: `At the store, the customer shows their QR code or a six digit code. The vendor scans it, sees Paid In Full, and just confirms the redemption. No payment needed at the counter.` },
  { name: 'deposit-intro', text: `Scenario two. Deposit at claim, balance owed in store. The customer pays a partial deposit through Stripe to lock in the deal.` },
  { name: 'deposit-scan', text: `When they arrive, the vendor scans their code and sees the remaining balance owed. The vendor now has two options.` },
  { name: 'deposit-options', text: `Option A. Send a Stripe payment link straight to the customer's phone — they pay on the spot. Option B. The customer pays cash, Venmo, Zelle, or swipes a card at the vendor's own terminal. The vendor just taps Collected In Person, and the deal is closed out.` },
  { name: 'in-person', text: `Scenario three. Pay In Person. Free deals or pay at location deals — no money moves online. The customer brings their code. The vendor scans, confirms, and handles payment at the store however they want. Cash, card, anything.` },
  { name: 'money-flow', text: `So here is the picture. Customer pays through Stripe. Money lands in the vendor's own Stripe Connect account. From there, it sweeps to the vendor's bank. Spontee Coupon sits on the side — we never hold your money.` },
  { name: 'recap', text: `Let's recap. There are three ways your customer can pay — and every one sends the money straight to you. One: full payment online, through Stripe. Two: a deposit online, then the balance settled with you. Three: no online charge at all — just a code. In a shop, they show the code and pay at the counter. For an online store, they enter the code on your own website to claim the discount. However they pay, Spontee Coupon never touches the money.` },
  { name: 'outro', text: `Three flows. Zero commissions. You keep one hundred percent of every dollar. Set up your Stripe Connect at Spontee Coupon dot com slash vendor slash payments.` },
];

// Customer-facing "How SpontiCoupon Works" explainer (vertical 9:16).
// "Spontee" spelling forces the correct pronunciation in ElevenLabs.
const HOWITWORKS = [
  { name: 'hook', text: `Love a good deal? Spontee Coupon gets you exclusive offers from local businesses — for free. Here's how it works.` },
  { name: 'browse', text: `Open the deals page and you'll see two kinds. Sponti Coupons are flash deals — limited time, limited spots, so grab them fast. Steady Deals stick around longer. Just search by category or distance to find what's near you.` },
  { name: 'claim', text: `Found one you like? Tap Claim Deal. Most deals are instant, and free. Some flash deals ask for a little more — either a small deposit to hold your spot, or the full price up front. Pay your deposit by card, Venmo, Zelle, or Cash App. Paying in full? That's by card. And any balance left over, you just pay at the business.` },
  { name: 'code', text: `The moment you claim, you get your redemption code — a six-digit number, and a QR code. Find them any time under My Deals.` },
  { name: 'redeem', text: `At the business, just show your code or QR to the staff. They scan it, it's verified instantly, and you're all set. Pay anything you still owe right there — directly to the business.` },
  { name: 'rewards', text: `The more you use Spontee Coupon, the more you earn — and there are two kinds of rewards. One is from the business itself: a punch card or points program, redeemable only at that shop. The other is Spontee Points — that's Spontee Coupon giving you money back, just for using the app. Earn points every time you redeem, turn them into credit, and spend it with any Sponti vendor. When something's ready to claim, you'll see the Reward Ready banner on your dashboard.` },
  { name: 'outro', text: `Real deals. Local businesses. Zero cost to you. Start saving with Spontee Coupon today.` },
];

const LOYALTY = [
  { name: 'hook', text: `Most deal sites are one and done. A customer grabs your offer, pays once, and you never see them again. We think that's backwards — so we built a loyalty program right into Spontee Coupon. It's automatic, it's digital, and it's tied to every claim. It turns first-time deal hunters into regulars who keep coming back.` },
  { name: 'two-types', text: `From your vendor loyalty page, you pick the program type that fits your business — a Punch Card, or a Points program. You can run either one. Switching is just a few clicks.` },
  { name: 'punch-card', text: `Punch Cards are simple, and they work for almost any small business. Buy ten coffees, get one free. Buy five car washes, get one free. Customers see their progress live on their phone, and every claim adds a punch automatically. No app to install, no plastic card to carry, no extra step for you at the counter.` },
  { name: 'points', text: `Points work better for higher ticket businesses — restaurants, salons, auto shops. The default is one point per dollar spent, and a hundred points unlocks ten dollars off. Customers earn on every dollar they spend with you, and they cash in when they hit the threshold you set. It's a real reason to come back.` },
  { name: 'reward-earned', text: `When a customer hits their reward threshold, you see a big Reward Earned badge right on the scan screen. No guessing, no looking it up. Honor the reward on the spot, and the customer walks out happy — and ready to come back again.` },
  { name: 'outro', text: `And it's included free on Pro and Business — no add on, no per customer fee. Because we're not just a place to post deals — we're your partner. When your customers keep coming back, you grow. And when you grow, so do we. Turn on loyalty at Spontee Coupon dot com slash vendor slash loyalty.` },
];

async function synth(text: string, outPath: string) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      // Soft & gentle delivery: higher stability = calmer/smoother, style 0 = no exaggeration.
      voice_settings: { stability: 0.6, similarity_boost: 0.85, style: 0.0, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const raw = outPath.replace(/\.mp3$/, '.raw.mp3');
  fs.writeFileSync(raw, buf);
  // Loudness-normalize to broadcast level so narration is clearly audible.
  execSync(
    `ffmpeg -y -i "${raw}" -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 44100 -ac 2 -b:a 192k "${outPath}"`,
    { stdio: 'ignore' }
  );
  fs.unlinkSync(raw);
  const dur = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outPath}"`
  ).toString().trim();
  console.log(`  ✓ ${path.basename(outPath)}  ${(buf.length / 1024).toFixed(0)} KB  ${dur}s`);
}

async function run(which: string) {
  const root = path.join(__dirname, '..', 'public', 'audio');
  const jobs: Array<{ dir: string; segs: typeof CUSTOMER }> = [];
  if (which === 'customer' || which === 'all') jobs.push({ dir: path.join(root, 'customer-redemption'), segs: CUSTOMER });
  if (which === 'howitworks' || which === 'all') jobs.push({ dir: path.join(root, 'customer-how-it-works'), segs: HOWITWORKS });
  if (which === 'loyalty' || which === 'all') jobs.push({ dir: path.join(root, 'loyalty-program'), segs: LOYALTY });
  for (const job of jobs) {
    fs.mkdirSync(job.dir, { recursive: true });
    console.log(`\n── ${path.basename(job.dir)} ──`);
    for (const s of job.segs) await synth(s.text, path.join(job.dir, `${s.name}.mp3`));
  }
}

const which = process.argv[2] || 'all';
if (!ELEVENLABS_API_KEY) { console.error('Missing ELEVENLABS_API_KEY'); process.exit(1); }
run(which).then(() => console.log('\nDone.')).catch((e) => { console.error(e); process.exit(1); });
