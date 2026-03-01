import { GoogleGenAI } from '@google/genai';
import type { DealForSocialPost, PlatformCaptions } from './types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

/**
 * Generate platform-specific social media captions using Gemini AI.
 * Falls back to templates if Gemini is unavailable.
 */
export async function generateCaptions(deal: DealForSocialPost): Promise<PlatformCaptions> {
  const claimUrl = `${APP_URL}/deals/${deal.id}`;
  const discount = Math.round(deal.discount_percentage);

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return templateCaptions(deal, claimUrl, discount);
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = `You are a social media manager for SpontiCoupon, a local deals platform. Generate platform-specific captions for this new deal.

Deal info:
- Title: ${deal.title}
- Business: ${deal.vendor.business_name}${deal.vendor.city ? ` in ${deal.vendor.city}, ${deal.vendor.state}` : ''}
- Category: ${deal.vendor.category || 'Local business'}
- Type: ${deal.deal_type === 'sponti_coupon' ? 'Sponti Coupon (limited-time flash deal!)' : 'Steady Deal (ongoing value)'}
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

Rules:
- facebook: Engaging, 200-400 chars, include the claim link URL, use relevant emojis
- instagram: Visual focus, 200-300 chars, 5-8 relevant hashtags at the end, say "Link in bio to claim!", do NOT include the URL in the caption
- twitter: Under 240 chars (leave room for link), punchy and exciting, include the claim link, 1-2 hashtags
- tiktok: 100-200 chars, trendy/casual tone, 3-5 hashtags
- Brand voice: Friendly, excited, local-first
- For Sponti deals: emphasize urgency and limited time
- For Steady deals: emphasize consistent value and savings
- Use fire, money, and deal-related emojis. NEVER use purple/violet emojis
- Return ONLY the JSON object, no markdown fences`;

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

    return captions;
  } catch (err) {
    console.error('[Social Captions] AI generation failed:', err);
    return templateCaptions(deal, claimUrl, discount);
  }
}

function templateCaptions(
  deal: DealForSocialPost,
  claimUrl: string,
  discount: number
): PlatformCaptions {
  const bizName = deal.vendor.business_name;
  const location = deal.vendor.city ? ` in ${deal.vendor.city}` : '';
  const urgency = deal.deal_type === 'sponti_coupon' ? ' Limited time only!' : '';

  return {
    facebook: `${discount}% OFF: ${deal.title} at ${bizName}${location}!${urgency} Don't miss this deal. Claim yours now: ${claimUrl}`,
    instagram: `${discount}% OFF ${deal.title} at ${bizName}${location}!${urgency} Link in bio to claim! #SpontiCoupon #LocalDeals #Savings #DealOfTheDay #Support Local`,
    twitter: `${discount}% OFF: ${deal.title} at ${bizName}!${urgency} Claim now: ${claimUrl} #SpontiCoupon`,
    tiktok: `${discount}% OFF at ${bizName}${location}!${urgency} #SpontiCoupon #deals #savings #local`,
  };
}
