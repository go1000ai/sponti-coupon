import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';
import { rateLimit } from '@/lib/rate-limit';

interface AdvisorMessage {
  role: 'user' | 'assistant';
  content: string;
}

// POST /api/vendor/deal-advisor — AI deal pricing advisor (conversational)
export async function POST(request: NextRequest) {
  // Rate limit: 30 advisor requests per hour
  const limited = rateLimit(request, { maxRequests: 30, windowMs: 60 * 60 * 1000, identifier: 'ai-deal-advisor' });
  if (limited) return limited;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'vendor') {
    return NextResponse.json({ error: 'Only vendors can use the deal advisor' }, { status: 403 });
  }

  // Get vendor info
  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, category, city, state, subscription_tier, avg_rating')
    .eq('id', user.id)
    .single();

  const tier = (vendor?.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].ai_deal_assistant) {
    return NextResponse.json(
      { error: 'AI Deal Advisor requires a Business plan or higher.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { messages, deal_type, current_pricing } = body as {
    messages: AdvisorMessage[];
    deal_type: string;
    current_pricing?: {
      original_price?: number;
      deal_price?: number;
      deposit_amount?: number;
      title?: string;
    };
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
  }

  const anthropicKey = process.env.SPONTI_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({
      reply: "I'm having trouble connecting right now. Try again in a moment!",
    });
  }

  // Gather vendor context
  const businessName = vendor?.business_name || 'your business';
  const category = vendor?.category || 'general';
  const location = vendor?.city && vendor?.state ? `${vendor.city}, ${vendor.state}` : '';
  const isSponti = deal_type === 'sponti_coupon';

  // Fetch vendor's deal history for context
  const { data: recentDeals } = await supabase
    .from('deals')
    .select('title, deal_type, original_price, deal_price, discount_percentage, claims_count, status')
    .eq('vendor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch active Steady Deals
  const { data: steadyDeals } = await supabase
    .from('deals')
    .select('title, original_price, deal_price, discount_percentage')
    .eq('vendor_id', user.id)
    .eq('deal_type', 'regular')
    .eq('status', 'active')
    .gte('expires_at', new Date().toISOString())
    .limit(5);

  // Fetch redemption stats
  const { count: totalRedemptions } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', user.id)
    .eq('status', 'redeemed');

  const { count: totalClaims } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', user.id);

  const conversionRate = totalClaims && totalRedemptions
    ? Math.round((totalRedemptions / totalClaims) * 100)
    : null;

  // Build context strings
  let dealHistoryContext = '';
  if (recentDeals && recentDeals.length > 0) {
    dealHistoryContext = `\n\nRECENT DEAL HISTORY:
${recentDeals.map(d => `- "${d.title}" (${d.deal_type === 'sponti_coupon' ? 'Sponti' : 'Steady'}): $${d.original_price} → $${d.deal_price} (${d.discount_percentage}% off) — ${d.claims_count} claims, ${d.status}`).join('\n')}`;
  }

  let steadyContext = '';
  if (steadyDeals && steadyDeals.length > 0) {
    steadyContext = `\n\nACTIVE STEADY DEALS:
${steadyDeals.map(d => `- "${d.title}": $${d.original_price} → $${d.deal_price} (${d.discount_percentage}% off)`).join('\n')}`;
  }

  let pricingContext = '';
  if (current_pricing) {
    const parts = [];
    if (current_pricing.title) parts.push(`Title: "${current_pricing.title}"`);
    if (current_pricing.original_price) parts.push(`Original: $${current_pricing.original_price}`);
    if (current_pricing.deal_price) parts.push(`Deal: $${current_pricing.deal_price}`);
    if (current_pricing.deposit_amount) parts.push(`Deposit: $${current_pricing.deposit_amount}`);
    if (parts.length > 0) {
      pricingContext = `\n\nCURRENT DEAL FORM (what the vendor has entered so far):
${parts.join(', ')}`;
    }
  }

  const statsContext = conversionRate !== null
    ? `\n\nPERFORMANCE STATS: ${totalClaims} total claims, ${totalRedemptions} redemptions, ${conversionRate}% conversion rate.`
    : '';

  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const systemPrompt = `You are Ava, SpontiCoupon's AI Deal Strategist. You're a friendly, sharp marketing consultant who helps vendors price their deals for maximum results.

YOUR PERSONALITY:
- Warm but data-driven. You back up suggestions with reasoning.
- Confident and direct. Give clear recommendations, not wishy-washy options.
- Enthusiastic about great deals. When a vendor has good instincts, celebrate it.
- Brief. Keep responses to 2-4 sentences unless the vendor asks for detail. No bullet points or markdown.

YOUR JOB:
- Help vendors set optimal pricing for their deals (especially Sponti Deals).
- Consider the vendor's category, location, existing deals, time of day, day of week, and performance history.
- For Sponti Deals: these are impulse, time-limited (4-24 hours) deals. They should feel like a steal. Aggressive discounts drive more claims.
- For Steady Deals: these are longer-running. More moderate discounts work fine.

PRICING GUIDELINES:
- Sponti Deals work best at 30-60% off depending on category.
- If the vendor has active Steady Deals, Sponti should be at least 10 percentage points better to create urgency.
- Deposits of 10-20% of deal price reduce no-shows.
- Higher discounts = more claims, but vendor needs to stay profitable.
- Consider time of day: ${dayOfWeek} ${timeOfDay} deals should price accordingly.

WHEN SUGGESTING PRICING, use this format naturally in conversation:
- Mention the recommended original price, deal price, discount %, and deposit amount.
- If you suggest specific numbers, the vendor can click "Use Ava's Pricing" to auto-fill.

IMPORTANT: When you recommend specific pricing, include it as a JSON block at the END of your message (after your conversational text) in this exact format:
[PRICING]{"original_price":X,"deal_price":Y,"deposit_amount":Z}[/PRICING]
The JSON values should be numbers. This is parsed by the app — always include it when you have a concrete recommendation.

VENDOR CONTEXT:
Business: ${businessName}
Category: ${category}
Location: ${location}
Rating: ${vendor?.avg_rating ? `${vendor.avg_rating}/5` : 'N/A'}
Deal Type Being Created: ${isSponti ? 'Sponti Coupon (flash deal, 4-24 hours)' : 'Steady Deal (1-30 days)'}
Current Day/Time: ${dayOfWeek} ${timeOfDay}${dealHistoryContext}${steadyContext}${pricingContext}${statsContext}`;

  try {
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: 0.7,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const text = content.text.trim();

      // Extract pricing suggestion if present
      const pricingMatch = text.match(/\[PRICING\]([\s\S]*?)\[\/PRICING\]/);
      let suggestedPricing = null;
      let displayText = text;

      if (pricingMatch) {
        try {
          suggestedPricing = JSON.parse(pricingMatch[1]);
        } catch { /* ignore parse errors */ }
        // Remove the pricing tag from display text
        displayText = text.replace(/\[PRICING\][\s\S]*?\[\/PRICING\]/, '').trim();
      }

      return NextResponse.json({
        reply: displayText,
        suggested_pricing: suggestedPricing,
      });
    }

    return NextResponse.json({
      reply: "Let me think about that differently. What kind of deal are you creating?",
    });
  } catch (err) {
    console.error('[Deal Advisor] Error:', err);
    return NextResponse.json({
      reply: "I'm having a moment — try asking me again!",
    });
  }
}
