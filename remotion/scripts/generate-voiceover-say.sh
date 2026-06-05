#!/usr/bin/env bash
# Generate voiceover MP3s for SpontiCoupon tutorial videos using macOS `say` + ffmpeg.
# Voice: Samantha (en_US). Rate set per-segment for natural-feeling pacing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_C="$ROOT/public/audio/customer-redemption"
OUT_L="$ROOT/public/audio/loyalty-program"
mkdir -p "$OUT_C" "$OUT_L"

VOICE="Samantha"
RATE=180   # words per minute — slightly above default 175 for tighter narration

synth () {
  local text="$1"
  local out="$2"
  local tmp="$(mktemp -t spontiaudio).aiff"
  say -v "$VOICE" -r "$RATE" -o "$tmp" "$text"
  ffmpeg -y -i "$tmp" -ac 2 -ar 44100 -b:a 128k "$out" >/dev/null 2>&1
  rm -f "$tmp"
  # Print duration in seconds
  ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$out"
}

echo "── Video 1: Customer Redemption Tutorial ──"
echo -n "intro:          "; synth "How do customers actually pay and redeem deals on SpontiCoupon? Let's walk through the three flows, end to end." "$OUT_C/intro.mp3"
echo -n "fullPayment:    "; synth "Scenario one. Full payment online. The customer taps Claim and Pay, and pays the full price through Stripe Checkout. The money goes straight into the vendor's connected Stripe account, and then to the vendor's bank. SpontiCoupon never touches it." "$OUT_C/full-payment.mp3"
echo -n "fullInStore:    "; synth "At the store, the customer shows their QR code or a six digit code. The vendor scans it, sees Paid In Full, and just confirms the redemption. No payment needed at the counter." "$OUT_C/full-in-store.mp3"
echo -n "depositIntro:   "; synth "Scenario two. Deposit at claim, balance owed in store. The customer pays a partial deposit through Stripe to lock in the deal." "$OUT_C/deposit-intro.mp3"
echo -n "depositScan:    "; synth "When they arrive, the vendor scans their code and sees the remaining balance owed. The vendor now has two options." "$OUT_C/deposit-scan.mp3"
echo -n "depositOptions:"; synth "Option A. Send a Stripe payment link straight to the customer's phone — they pay on the spot. Option B. The customer pays cash, Venmo, Zelle, or swipes a card at the vendor's own terminal. The vendor just taps Collected In Person, and the deal is closed out." "$OUT_C/deposit-options.mp3"
echo -n "inPerson:       "; synth "Scenario three. Pay In Person. Free deals or pay at location deals — no money moves online. The customer brings their code. The vendor scans, confirms, and handles payment at the store however they want. Cash, card, anything." "$OUT_C/in-person.mp3"
echo -n "moneyFlow:      "; synth "So here is the picture. Customer pays through Stripe. Money lands in the vendor's own Stripe Connect account. From there, it sweeps to the vendor's bank. SpontiCoupon sits on the side — we never hold your money." "$OUT_C/money-flow.mp3"
echo -n "outro:          "; synth "Three flows. Zero commissions. You keep one hundred percent of every dollar. Set up your Stripe Connect at sponticoupon dot com slash vendor slash payments." "$OUT_C/outro.mp3"

echo ""
echo "── Video 2: Loyalty Program Tutorial ──"
echo -n "hook:           "; synth "Paper punch cards get lost. Customers forget them in a coat pocket, or leave them at home. With SpontiCoupon, your loyalty program is built in — automatic, digital, and tied to every claim and every redemption." "$OUT_L/hook.mp3"
echo -n "twoTypes:       "; synth "From your vendor loyalty page, you pick the program type that fits your business — a Punch Card, or a Points program. You can run either one. Switching is just a few clicks." "$OUT_L/two-types.mp3"
echo -n "punchCard:      "; synth "Punch Cards are simple, and they work for almost any small business. Buy ten coffees, get one free. Buy five car washes, get one free. Customers see their progress live on their phone, and every claim adds a punch automatically. No app to install, no plastic card to carry, no extra step for you at the counter." "$OUT_L/punch-card.mp3"
echo -n "points:         "; synth "Points work better for higher ticket businesses — restaurants, salons, auto shops. The default is one point per dollar spent, and a hundred points unlocks ten dollars off. Customers earn on every dollar they spend with you, and they cash in when they hit the threshold you set. It's a real reason to come back." "$OUT_L/points.mp3"
echo -n "rewardEarned:   "; synth "When a customer hits their reward threshold, you see a big Reward Earned badge right on the scan screen. No guessing, no looking it up. Honor the reward on the spot, and the customer walks out happy — and ready to come back again." "$OUT_L/reward-earned.mp3"
echo -n "outro:          "; synth "Loyalty is included on the Pro and Business plans — no extra cost, no add on, no per customer fee. Turn it on right now at sponticoupon dot com slash vendor slash loyalty." "$OUT_L/outro.mp3"

echo ""
echo "Done."
