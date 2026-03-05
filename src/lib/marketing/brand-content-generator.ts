import { GoogleGenAI } from '@google/genai';
import type { MarketingContentType, GeneratedContent } from './types';

/**
 * Weekly content calendar mapping day of week to preferred content type.
 */
const WEEKLY_CALENDAR: Record<number, MarketingContentType> = {
  1: 'brand_awareness',   // Monday: motivation / brand story
  2: 'vendor_spotlight',  // Tuesday: highlight a vendor
  3: 'local_tip',         // Wednesday: local Puerto Rico tip
  4: 'engagement',        // Thursday: question / poll
  5: 'deal_roundup',      // Friday: weekend deals roundup
  6: 'trending_topic',    // Saturday: trending / seasonal
  0: 'testimonial',       // Sunday: social proof
};

/**
 * Get the suggested content type based on day of week.
 */
export function getSuggestedContentType(): MarketingContentType {
  const day = new Date().getDay();
  return WEEKLY_CALENDAR[day] || 'brand_awareness';
}

interface BrandContentContext {
  contentType: MarketingContentType;
  dayOfWeek: string;
  timeSlot: string;
  activeDealsCount: number;
  topCategories: string[];
  recentPostTypes: string[];
  vendorName?: string;
  vendorDescription?: string;
}

/**
 * Generates original brand content (not deal-specific) via Gemini.
 */
export async function generateBrandContent(
  context: BrandContentContext
): Promise<GeneratedContent> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return fallbackBrandContent(context.contentType);

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const contentTypeDescriptions: Record<string, string> = {
      brand_awareness: 'Explain what SpontiCoupon does, how it helps local businesses, why people should use it. Storytelling, NOT salesy.',
      engagement: 'Ask a question that sparks comments. Example: "What\'s your favorite local restaurant?" or "Sponti or Steady deals — which do you prefer?" Make it fun and conversational.',
      local_tip: 'Share a genuine local tip about Puerto Rico. Food spots, hidden beaches, cultural events, local customs. Position SpontiCoupon as a local insider who knows the island.',
      trending_topic: 'Connect to a current event, holiday, or seasonal topic relevant to Puerto Rico. Tie it back to supporting local businesses and finding deals.',
      vendor_spotlight: context.vendorName
        ? `Highlight ${context.vendorName}: ${context.vendorDescription || 'A great local business'}. Tell their story, what makes them special, why people should visit.`
        : 'Highlight the amazing local businesses on SpontiCoupon. Tell a generic vendor success story.',
      testimonial: 'Create a social proof post. A stat, a quote-format, or a "did you know" format. Example: "Over X deals claimed this month!" or "Local businesses are saving Y with SpontiCoupon."',
      deal_roundup: `Create a "Top deals this week" or "Weekend deals" roundup post. We have ${context.activeDealsCount} active deals across categories like ${context.topCategories.join(', ')}. Tease what\'s available without naming specific deals.`,
    };

    const prompt = `You are a senior social media strategist creating original content for SpontiCoupon's brand accounts.

SpontiCoupon is a local deals platform launching in Puerto Rico. We connect customers with local businesses offering great deals. Think Groupon but local-first.

CONTENT TYPE: ${context.contentType}
DESCRIPTION: ${contentTypeDescriptions[context.contentType] || 'General brand content'}
DAY: ${context.dayOfWeek}
TIME: ${context.timeSlot}
ACTIVE DEALS: ${context.activeDealsCount}
TOP CATEGORIES: ${context.topCategories.join(', ') || 'Food & Drink, Entertainment, Services'}
RECENT POSTS (avoid repeating): ${context.recentPostTypes.join(', ') || 'none'}

PLATFORM RULES:
- Facebook: 200-400 chars, can include link to https://sponticoupon.com, engaging emojis
- Instagram: 200-300 chars, 5-8 hashtags at end, "Link in bio!", NO URL in caption

BILINGUAL: Write in both English and Spanish (Puerto Rican Spanish, natural tuteo). Main message in English first, then Spanish below separated by a line break.

BRAND VOICE: Friendly, excited, local-first, community-oriented. We celebrate local businesses.
EMOJIS: Use freely but NEVER use purple/violet emojis.
HASHTAGS: Include #SpontiCoupon #PuertoRico #LocalDeals plus 3-5 contextual ones.

Return ONLY valid JSON:
{
  "facebook": "...",
  "instagram": "...",
  "hashtags": ["...", "..."],
  "imagePrompt": "A description for a brand image (1080x1080, vibrant colors orange/blue, no text overlay needed)",
  "reasoning": "Brief explanation of why this content works for this time/day",
  "targetAudience": "Who this targets",
  "contentScore": 0.85
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackBrandContent(context.contentType);

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      facebook: parsed.facebook || fallbackBrandContent(context.contentType).facebook,
      instagram: parsed.instagram || fallbackBrandContent(context.contentType).instagram,
      hashtags: parsed.hashtags || ['#SpontiCoupon', '#PuertoRico', '#LocalDeals'],
      imagePrompt: parsed.imagePrompt || '',
      reasoning: parsed.reasoning || `${context.contentType} for ${context.dayOfWeek} ${context.timeSlot}`,
      targetAudience: parsed.targetAudience || 'Local community',
      contentScore: parsed.contentScore || 0.7,
    };
  } catch (err) {
    console.error('[Marketing] Brand content generation error:', err);
    return fallbackBrandContent(context.contentType);
  }
}

function fallbackBrandContent(contentType: MarketingContentType): GeneratedContent {
  const templates: Record<string, { fb: string; ig: string }> = {
    brand_awareness: {
      fb: '🧡 SpontiCoupon connects you with the best local deals in Puerto Rico. Support local businesses while saving big! Explore deals → https://sponticoupon.com\n\n🧡 SpontiCoupon te conecta con las mejores ofertas locales en Puerto Rico. ¡Apoya negocios locales mientras ahorras!',
      ig: '🧡 SpontiCoupon connects you with the best local deals in Puerto Rico. Support local businesses while saving big! Link in bio!\n\n🧡 ¡Apoya negocios locales mientras ahorras! Link en bio!',
    },
    engagement: {
      fb: '🤔 What\'s YOUR favorite local spot? Drop it in the comments! We might feature a deal from them soon 👀\n\n🤔 ¿Cuál es tu lugar local favorito? ¡Cuéntanos en los comentarios!',
      ig: '🤔 What\'s YOUR favorite local spot? Drop it below! 👇\n\n🤔 ¿Cuál es tu lugar local favorito? ¡Cuéntanos! 👇',
    },
    local_tip: {
      fb: '🌴 Pro tip: The best coffee in PR isn\'t at a chain — it\'s at your local café. Support local, taste the difference! ☕\n\n🌴 Tip: El mejor café de PR no está en una cadena — está en tu café local. ¡Apoya lo local!',
      ig: '🌴 The best coffee in PR isn\'t at a chain — it\'s at your local café! ☕ Support local!\n\n🌴 ¡El mejor café está en tu café local! ☕',
    },
  };

  const t = templates[contentType] || templates.brand_awareness;
  return {
    facebook: t.fb,
    instagram: t.ig,
    hashtags: ['#SpontiCoupon', '#PuertoRico', '#LocalDeals', '#SupportLocal'],
    imagePrompt: '',
    reasoning: 'Fallback template — AI generation unavailable',
    targetAudience: 'Local community',
    contentScore: 0.4,
  };
}
