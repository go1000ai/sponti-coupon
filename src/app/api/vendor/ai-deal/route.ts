import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

// POST /api/vendor/ai-deal — AI-assisted deal creation using Claude
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify vendor role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'vendor') {
    return NextResponse.json({ error: 'Only vendors can use AI deal assist' }, { status: 403 });
  }

  // Get vendor info for context
  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, category, city, state, subscription_tier')
    .eq('id', user.id)
    .single();

  // Check tier access for AI deal assistant
  const tier = (vendor?.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].ai_deal_assistant) {
    return NextResponse.json(
      { error: 'AI Deal Assistant requires a Business plan or higher. Upgrade at /vendor/subscription.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { deal_type, prompt, category_override } = body;

  const businessName = vendor?.business_name || 'My Business';
  const category = category_override || vendor?.category || 'restaurant';
  const location = vendor?.city && vendor?.state ? `${vendor.city}, ${vendor.state}` : '';
  const isSponti = deal_type === 'sponti_coupon';

  // Fetch active Steady Deals to inform AI pricing for Sponti deals
  let steadyDealContext = '';
  if (isSponti) {
    const { data: steadyDeals } = await supabase
      .from('deals')
      .select('title, original_price, deal_price, discount_percentage')
      .eq('vendor_id', user.id)
      .eq('deal_type', 'regular')
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (steadyDeals && steadyDeals.length > 0) {
      steadyDealContext = `\n\nVENDOR'S ACTIVE STEADY DEALS (use these to inform Sponti pricing — aim for at least 10 percentage points better discount than these):
${steadyDeals.map(d => `- "${d.title}": $${d.original_price} → $${d.deal_price} (${d.discount_percentage}% off)`).join('\n')}`;
    }
  }

  // Try Anthropic Claude first, fall back to smart templates
  const anthropicKey = process.env.SPONTI_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;

  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });

      const systemPrompt = `You are an expert marketing copywriter helping local businesses create irresistible deal listings for a coupon/deal app called SpontiCoupon.

Your #1 goal is to generate a COMPLETE, READY-TO-PUBLISH deal listing with every field filled in, so the vendor just reviews and hits publish.

CRITICAL RULES:
- Write SPECIFIC, VIVID descriptions — mention actual items, services, or experiences
- Add sensory language (e.g., "hand-tossed", "freshly brewed", "stone-fired")
- Create urgency with a call-to-action
- Do NOT use generic filler — be SPECIFIC about what makes this deal great
- For the title: punchy, specific, under 60 characters

IMPORTANT: Return ONLY valid JSON with these exact fields (no markdown, no code blocks, just raw JSON):
{
  "title": "Short catchy title (max 60 chars)",
  "description": "3-5 vivid sentences describing the deal experience",
  "original_price": number,
  "deal_price": number,
  "suggested_deposit": number or null (10-20% of deal price for sponti deals, null for regular),
  "max_claims": number (20-100),
  "terms_and_conditions": "Clear terms: what's included, exclusions, validity period, one per customer, etc.",
  "how_it_works": "Step-by-step: 1. Claim this deal on SpontiCoupon 2. Show your QR code at the business 3. Enjoy your discount",
  "highlights": ["highlight 1", "highlight 2", "highlight 3", "highlight 4"],
  "amenities": ["amenity 1", "amenity 2", "amenity 3"],
  "fine_print": "Brief legal: not combinable with other offers, subject to availability, etc."
}

For highlights: 3-5 short bullet points about what makes this deal special (e.g., "Fresh ingredients daily", "Award-winning chef", "Free parking").
For amenities: 3-6 relevant amenities for the business type (e.g., "Free Wi-Fi", "Outdoor seating", "Wheelchair accessible", "Live music").
For terms_and_conditions: Write clear, professional terms covering the deal scope, restrictions, and validity.
For how_it_works: Always start with claiming on SpontiCoupon, then showing QR code, then enjoying the deal.
For fine_print: Brief, standard disclaimers.`;

      const userPrompt = `Business: ${businessName}
Category: ${category}
Location: ${location}
Deal Type: ${isSponti ? 'Sponti Coupon (flash deal, 4-24 hours, needs deposit)' : 'Steady Deal (steady savings, 1-30 days)'}${steadyDealContext}
${prompt ? `\nVENDOR'S DEAL IDEA (THIS IS THE MOST IMPORTANT INPUT — base the title, description, pricing, and all details on this):\n"${prompt}"` : ''}

Generate a specific, compelling deal based on the vendor's idea above. The description must be detailed and vivid — describe what the customer will actually experience, taste, or receive. Do NOT write generic marketing fluff.${isSponti ? ' For Sponti deals, price aggressively — these are time-limited impulse deals that should feel like an amazing, can\'t-miss opportunity.' : ''}`;

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          { role: 'user', content: userPrompt },
        ],
        system: systemPrompt,
        temperature: 0.8,
      });

      const content = message.content[0];
      if (content.type === 'text') {
        // Parse JSON from response (handle potential markdown code blocks)
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ suggestion: parsed, source: 'ai' });
        }
      }
    } catch (err) {
      console.error('Anthropic API error, falling back to templates:', err);
    }
  }

  // Smart template fallback (no API key needed)
  const suggestion = generateTemplateSuggestion(businessName, category, isSponti);
  return NextResponse.json({ suggestion, source: 'template' });
}

function generateTemplateSuggestion(
  businessName: string,
  category: string,
  isSponti: boolean,
) {
  const templates: Record<string, { titles: string[]; descriptions: string[]; priceRange: [number, number]; discountRange: [number, number] }> = {
    restaurant: {
      titles: [
        `${businessName} — ${isSponti ? 'Sponti' : 'Half Price'} Dining`,
        `${isSponti ? 'Tonight Only!' : 'This Week:'} ${businessName} Feast`,
        `${businessName} — BOGO Entrees ${isSponti ? 'Sponti' : 'Special'}`,
      ],
      descriptions: [
        `Enjoy an incredible dining experience at ${businessName}! Our chef has prepared a special menu just for this deal. Don't miss out on these amazing savings.`,
        `${businessName} is offering an exclusive deal you won't find anywhere else. Fresh ingredients, amazing flavors, and unbeatable prices. Grab this deal before it's gone!`,
        `Treat yourself to the best of ${businessName}. Whether it's date night or a family dinner, this deal makes it easy to enjoy great food without breaking the bank.`,
      ],
      priceRange: [25, 60],
      discountRange: [30, 55],
    },
    cafe: {
      titles: [
        `${businessName} — ${isSponti ? 'Sponti' : 'Weekly'} Café Special`,
        `${isSponti ? 'Now!' : 'Save:'} ${businessName} Brunch Deal`,
      ],
      descriptions: [
        `Start your day right with ${businessName}! Artisan coffee, freshly baked pastries, and a cozy atmosphere. This deal is the perfect excuse to treat yourself.`,
        `Whether you need your morning pick-me-up or an afternoon treat, ${businessName} has you covered with this amazing deal on our signature drinks and baked goods.`,
      ],
      priceRange: [12, 30],
      discountRange: [25, 50],
    },
    retail: {
      titles: [
        `${businessName} — ${isSponti ? 'Sponti Sale!' : 'Mega Savings'}`,
        `${isSponti ? 'Limited:' : 'Shop:'} ${businessName} Exclusive`,
      ],
      descriptions: [
        `Shop the best deals at ${businessName}! Quality products at prices you won't believe. This exclusive deal is only available to SpontiCoupon users.`,
        `${businessName} is having an incredible sale! Grab trending products and everyday essentials at a fraction of the regular price.`,
      ],
      priceRange: [30, 100],
      discountRange: [25, 50],
    },
    beauty: {
      titles: [
        `${businessName} — ${isSponti ? 'Sponti' : 'Beauty'} Special`,
        `${isSponti ? 'Today:' : 'Save:'} ${businessName} Pamper Package`,
      ],
      descriptions: [
        `Treat yourself to a luxurious experience at ${businessName}! Professional beauty services at an unbeatable price. You deserve to look and feel your best.`,
        `${businessName} is offering an exclusive beauty deal! Enjoy premium services without the premium price tag.`,
      ],
      priceRange: [40, 120],
      discountRange: [30, 50],
    },
    fitness: {
      titles: [
        `${businessName} — ${isSponti ? 'Sponti' : 'Monthly'} Fitness Pass`,
        `${isSponti ? 'Now!' : 'Join:'} ${businessName} Special`,
      ],
      descriptions: [
        `Get fit for less with ${businessName}! This deal gives you access to our best classes and equipment at an incredible price.`,
        `${businessName} wants to help you crush your fitness goals! Take advantage of this limited-time offer.`,
      ],
      priceRange: [30, 80],
      discountRange: [30, 60],
    },
  };

  const template = templates[category.toLowerCase()] || templates.restaurant;

  const titleIndex = Math.floor(Math.random() * template.titles.length);
  const descIndex = Math.floor(Math.random() * template.descriptions.length);

  const [minPrice, maxPrice] = template.priceRange;
  const originalPrice = Math.round((minPrice + Math.random() * (maxPrice - minPrice)) / 5) * 5;

  const [minDisc, maxDisc] = template.discountRange;
  const discountPct = Math.round(minDisc + Math.random() * (maxDisc - minDisc));
  const dealPrice = Math.round(originalPrice * (1 - discountPct / 100) * 100) / 100;

  let title = template.titles[titleIndex];
  if (title.length > 60) {
    title = title.slice(0, 57) + '...';
  }

  return {
    title,
    description: template.descriptions[descIndex],
    original_price: originalPrice,
    deal_price: dealPrice,
    suggested_deposit: isSponti ? Math.round(dealPrice * 0.15 * 100) / 100 : null,
    max_claims: isSponti ? Math.floor(20 + Math.random() * 30) : Math.floor(50 + Math.random() * 50),
    terms_and_conditions: `Valid for dine-in and takeout. One deal per customer per visit. Cannot be combined with other offers or promotions. Must present QR code at time of purchase. Deal is non-transferable. ${businessName} reserves the right to modify or cancel this offer.`,
    how_it_works: `1. Claim this deal on SpontiCoupon\n2. Visit ${businessName} during business hours\n3. Show your QR code to the staff\n4. Enjoy your discount!`,
    highlights: ['Great value for money', 'Premium quality guaranteed', 'Perfect for any occasion', 'Limited availability'],
    amenities: ['Free Wi-Fi', 'Parking available', 'Wheelchair accessible'],
    fine_print: `Subject to availability. Not valid on holidays or special events. ${businessName} reserves the right to limit quantities. Gratuity not included.`,
  };
}
