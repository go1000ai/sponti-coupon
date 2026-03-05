import { GoogleGenAI } from '@google/genai';
import type { GeneratedContent, MarketingRunType } from './types';

interface DealInfo {
  title: string;
  description: string | null;
  deal_type: string;
  original_price: number;
  deal_price: number;
  end_date: string | null;
  category: string | null;
  image_url: string | null;
  vendor_name: string;
  vendor_city: string | null;
  vendor_state: string | null;
}

/**
 * Generates marketing-angle captions for promoting an existing deal.
 * Different from the auto-post caption generator — this uses promotional angles.
 */
export async function generateDealPromotion(
  deal: DealInfo,
  promotionReason: string,
  runType: MarketingRunType
): Promise<GeneratedContent> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return fallbackDealContent(deal);

  const discount = deal.original_price > 0
    ? Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100)
    : 0;

  const location = [deal.vendor_city, deal.vendor_state].filter(Boolean).join(', ');
  const claimUrl = `https://sponticoupon.com/deals`;

  const angleMap: Record<string, string> = {
    expiring_soon: 'URGENCY — This deal expires soon. Use countdown language, FOMO, "last chance", "ending today".',
    top_performer: 'SOCIAL PROOF — This is the most popular deal. Use "everyone\'s claiming", "trending", "don\'t miss what others love".',
    new_deal: 'FRESHNESS — This deal just dropped. Use "just launched", "new on SpontiCoupon", "be the first".',
    underperforming: 'HIDDEN GEM — This is an undiscovered deal. Use "hidden gem", "have you tried this?", "secret find".',
  };

  const timeAngle: Record<string, string> = {
    morning: 'Start the day with savings. Morning energy, coffee vibes.',
    afternoon: 'Perfect for a lunch break discovery or afternoon treat.',
    evening: 'Evening plans? Weekend plans? Nightlife and dining angle.',
    manual: 'General promotional tone.',
  };

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const prompt = `You are a senior social media strategist for SpontiCoupon, a local deals platform in Puerto Rico.

Create a promotional post for this deal:
- Title: ${deal.title}
- Description: ${deal.description || 'N/A'}
- Business: ${deal.vendor_name}
- Location: ${location || 'Puerto Rico'}
- Category: ${deal.category || 'Local Business'}
- Type: ${deal.deal_type === 'sponti_coupon' ? 'Sponti Deal (time-limited!)' : 'Steady Deal (ongoing)'}
- Discount: ${discount}% off (was $${deal.original_price}, now $${deal.deal_price})
${deal.end_date ? `- Expires: ${new Date(deal.end_date).toLocaleDateString()}` : ''}
- Claim URL: ${claimUrl}

PROMOTION ANGLE: ${angleMap[promotionReason] || angleMap.new_deal}
TIME CONTEXT: ${timeAngle[runType] || timeAngle.manual}

PLATFORM RULES:
- Facebook: 200-400 chars, include the claim URL, engaging emojis, call to action
- Instagram: 200-300 chars, 5-8 hashtags at end, say "Link in bio to claim!", NO URL in caption

BILINGUAL: Write the main message in English, then a Spanish translation below (Puerto Rican Spanish, natural tone).

BRAND VOICE: Friendly, excited, local-first. Celebrate local businesses. NEVER use purple/violet emojis.

Return ONLY valid JSON:
{
  "facebook": "...",
  "instagram": "...",
  "hashtags": ["...", "..."],
  "imagePrompt": "A description for a promotional image (1080x1080, vibrant, no text)",
  "reasoning": "Brief explanation of your strategy",
  "targetAudience": "Who this targets",
  "contentScore": 0.85
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackDealContent(deal);

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      facebook: parsed.facebook || fallbackDealContent(deal).facebook,
      instagram: parsed.instagram || fallbackDealContent(deal).instagram,
      hashtags: parsed.hashtags || ['#SpontiCoupon', '#LocalDeals', '#PuertoRico'],
      imagePrompt: parsed.imagePrompt || '',
      reasoning: parsed.reasoning || `Promoting ${deal.title} (${promotionReason})`,
      targetAudience: parsed.targetAudience || 'Local deal seekers',
      contentScore: parsed.contentScore || 0.7,
    };
  } catch (err) {
    console.error('[Marketing] Deal promotion generation error:', err);
    return fallbackDealContent(deal);
  }
}

function fallbackDealContent(deal: DealInfo): GeneratedContent {
  const discount = deal.original_price > 0
    ? Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100)
    : 0;

  return {
    facebook: `🔥 ${discount}% OFF — ${deal.title} at ${deal.vendor_name}! Was $${deal.original_price}, now just $${deal.deal_price}. Claim yours → https://sponticoupon.com/deals\n\n🔥 ${discount}% DE DESCUENTO — ${deal.title} en ${deal.vendor_name}! Era $${deal.original_price}, ahora solo $${deal.deal_price}. ¡Reclama el tuyo!`,
    instagram: `🔥 ${discount}% OFF — ${deal.title} at ${deal.vendor_name}! Was $${deal.original_price}, now $${deal.deal_price}. Link in bio to claim!\n\n🔥 ${discount}% DE DESCUENTO en ${deal.vendor_name}! ¡Link en bio!`,
    hashtags: ['#SpontiCoupon', '#LocalDeals', '#PuertoRico', '#Savings', '#Deals'],
    imagePrompt: '',
    reasoning: 'Fallback template — AI generation unavailable',
    targetAudience: 'Local deal seekers',
    contentScore: 0.5,
  };
}
