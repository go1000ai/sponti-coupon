import { GoogleGenAI } from '@google/genai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DealForSocialPost, PlatformCaptions } from './types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

/**
 * Generate platform-specific social media captions using Gemini AI.
 * Falls back to templates if Gemini is unavailable.
 *
 * If `supabaseClient` and `dealId` are provided, the function checks
 * `deals.cached_captions` first and returns cached captions without calling
 * Gemini. On a cache miss the generated captions are stored back to the DB.
 */
export async function generateCaptions(
  deal: DealForSocialPost,
  tone?: string,
  supabaseClient?: SupabaseClient,
  dealId?: string,
): Promise<PlatformCaptions> {
  const claimUrl = `${APP_URL}/deals/${deal.slug || deal.id}`;
  const discount = Math.round(deal.discount_percentage);

  // --- Cache read ---
  if (supabaseClient && dealId) {
    const { data: cached } = await supabaseClient
      .from('deals')
      .select('cached_captions')
      .eq('id', dealId)
      .single();

    if (
      cached?.cached_captions &&
      cached.cached_captions.facebook &&
      cached.cached_captions.instagram &&
      cached.cached_captions.twitter &&
      cached.cached_captions.tiktok
    ) {
      console.log(`[Social Captions] Returning cached captions for deal ${dealId}`);
      return cached.cached_captions as PlatformCaptions;
    }
  }

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return templateCaptions(deal, claimUrl, discount);
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const hashtagSeeds = buildHashtagSeeds(deal);

    const prompt = `You are the head of social media for SpontiCoupon, a local deals marketplace. Write polished, professional, scroll-stopping captions that make people want to claim this deal. These captions are published on @sponticoupon's official Facebook and Instagram, so they represent both the business AND the SpontiCoupon brand — they must be flawless: no typos, no awkward phrasing, no spammy ALL-CAPS walls, no keyword stuffing.

Deal info:
- Title: ${deal.title}
- Business: ${deal.vendor.business_name}${deal.vendor.city ? ` in ${deal.vendor.city}, ${deal.vendor.state}` : ''}
- Category: ${deal.vendor.category || 'Local business'}
- Type: ${deal.deal_type === 'sponti_coupon' ? 'Sponti Deal (limited-time flash deal, countdown urgency!)' : 'Steady Deal (ongoing everyday value)'}
- Price: $${deal.deal_price} (was $${deal.original_price}, ${discount}% off)
- Description: ${deal.description || deal.title}
- Claim link: ${claimUrl}

Generate 4 platform-specific captions as a JSON object:
{
  "facebook": "...",
  "instagram": "...",
  "twitter": "...",
  "tiktok": "..."
}

Writing rules (professional quality + scroll-stopping engagement are the #1 priority):
- Follow this proven structure: HOOK → why-they-want-it → call to action.
- The first line is everything. It must stop the scroll in the first 1-2 seconds. Use one of: a bold/contrarian claim, a sharp question, a curiosity gap, a vivid sensory line, or the number/stakes (the % off or the savings). NEVER open with "Check out this deal" or "Don't miss out".
- Make the reader FEEL the want — sensory, specific, benefit-led language ("warm, fresh-pressed... " beats "great food"). Sound like a real local brand a customer already trusts.
- Trigger ONE emotion per caption: FOMO, craving/desire, relief, or the thrill of a steal.
- End with exactly ONE clear, confident call to action (claim it now / link in bio / tap to claim). Don't bury it.
- Use 1-3 tasteful, relevant emojis — never more, never decorative spam.
- Brand voice: ${tone ? `${tone}` : 'warm, confident, local-first, and professional'}.
- For Sponti deals: real urgency — limited time, going fast, "before it's gone" — without sounding desperate or fake.
- For Steady deals: emphasize dependable, everyday value and the smart-savings feeling.
- Never use purple/violet emojis. Never use fake countdowns or guarantees.

Per-platform:
- facebook: 150-350 chars. 1-2 tight sentences. Include the claim link URL inline. End with 2-3 hashtags.
- instagram: 150-300 chars. Punchy first-line hook. Then put the claim link URL on its OWN line preceded by "Copy & paste to claim 👉 " (Instagram captions aren't tappable, so make the link easy to copy). End with 6-9 hashtags on a new line.
- twitter: Under 240 chars (leave room for the link). Punchy and professional. Include the claim link. 1-2 hashtags.
- tiktok: 80-150 chars. Casual but clean. 3-5 hashtags.

Hashtag rules (this drives local discovery — make them count):
- Mix four kinds: (1) brand: #SpontiCoupon, (2) location-based, (3) category-based, (4) deal-type/intent.
- Use these as seeds and expand naturally — only include ones that read well: ${hashtagSeeds.join(' ')}.
- PascalCase multi-word tags (e.g. #SupportLocal, #MiamiEats). Never put a space inside a hashtag.
- Don't repeat the same hashtag twice in one caption.

Return ONLY the JSON object, no markdown fences.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Social Captions] Failed to parse AI response, using templates');
      return templateCaptions(deal, claimUrl, discount);
    }

    const captions: PlatformCaptions = JSON.parse(jsonMatch[0]);

    // Validate all fields exist
    if (!captions.facebook || !captions.instagram || !captions.twitter || !captions.tiktok) {
      return templateCaptions(deal, claimUrl, discount);
    }

    // Enforce twitter length limit
    if (captions.twitter.length > 280) {
      captions.twitter = captions.twitter.substring(0, 277) + '...';
    }

    // --- Cache write ---
    if (supabaseClient && dealId) {
      const { error: cacheError } = await supabaseClient
        .from('deals')
        .update({ cached_captions: captions })
        .eq('id', dealId);
      if (cacheError) {
        console.warn('[Social Captions] Failed to cache captions for deal', dealId, cacheError);
      } else {
        console.log(`[Social Captions] Cached captions for deal ${dealId}`);
      }
    }

    return captions;
  } catch (err) {
    console.error('[Social Captions] AI generation failed:', err);
    return templateCaptions(deal, claimUrl, discount);
  }
}

/**
 * Turn a free-text value into a single PascalCase hashtag (no spaces, no punctuation).
 * "New York" -> "#NewYork", "Coffee & Tea" -> "#CoffeeTea". Returns null for empty input.
 */
function toHashtag(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .split(/[^A-Za-z0-9À-ɏ]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return cleaned ? `#${cleaned}` : null;
}

/**
 * Build location/category/deal-type hashtag seeds for a deal. These are fed to the
 * AI as starting points and reused by the template fallback so every post gets
 * locally-relevant tags that actually drive discovery.
 */
function buildHashtagSeeds(deal: DealForSocialPost): string[] {
  const city = deal.vendor.city?.trim() || null;
  const category = deal.vendor.category?.trim() || null;
  const seeds: (string | null)[] = ['#SpontiCoupon'];

  if (city) {
    seeds.push(toHashtag(city));
    seeds.push(toHashtag(`${city} Deals`));
    if (category) seeds.push(toHashtag(`${city} ${category}`));
  }
  if (category) {
    seeds.push(toHashtag(category));
    seeds.push(toHashtag(`${category} Deals`));
  }
  seeds.push(deal.deal_type === 'sponti_coupon' ? '#FlashDeal' : '#DealOfTheDay');
  seeds.push('#SupportLocal');

  // Dedupe (case-insensitive), drop nulls, cap at 9.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of seeds) {
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.slice(0, 9);
}

function templateCaptions(
  deal: DealForSocialPost,
  claimUrl: string,
  discount: number
): PlatformCaptions {
  const bizName = deal.vendor.business_name;
  const location = deal.vendor.city ? ` in ${deal.vendor.city}` : '';
  const isSponti = deal.deal_type === 'sponti_coupon';
  const tags = buildHashtagSeeds(deal);

  const hook = isSponti
    ? `Blink and you'll miss it: ${discount}% off ${deal.title} at ${bizName}${location}.`
    : `Smart savings, every day: ${discount}% off ${deal.title} at ${bizName}${location}.`;
  const urgency = isSponti ? ' This one is going fast.' : '';

  return {
    facebook: `${hook}${urgency} Tap to claim it before it's gone 👉 ${claimUrl} ${tags.slice(0, 3).join(' ')}`,
    instagram: `${hook}${urgency}\n\nCopy & paste to claim 👉 ${claimUrl}\n\n${tags.join(' ')}`,
    twitter: `${hook}${urgency} Claim it 👉 ${claimUrl} ${tags.slice(0, 2).join(' ')}`,
    tiktok: `${discount}% off ${deal.title} at ${bizName}${location} 🤑${urgency} ${tags.slice(0, 4).join(' ')}`,
  };
}
