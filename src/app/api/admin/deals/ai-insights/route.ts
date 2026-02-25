import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

// POST /api/admin/deals/ai-insights — AI analysis of all deals
export async function POST() {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();

  try {
    // Fetch all active/paused deals with vendor info
    const { data: deals } = await serviceClient
      .from('deals')
      .select('id, title, deal_type, status, original_price, deal_price, discount_percentage, deposit_amount, max_claims, claims_count, starts_at, expires_at, created_at, category_id, vendor:vendors(business_name, category)')
      .in('status', ['active', 'paused', 'draft'])
      .order('claims_count', { ascending: false });

    if (!deals || deals.length === 0) {
      return NextResponse.json({
        top_performers: [],
        underperformers: [],
        trends: [],
        recommendations: [],
      });
    }

    // Fetch redemption counts per deal
    const dealIds = deals.map((d) => d.id);
    const { data: redemptionsData } = await serviceClient
      .from('redemptions')
      .select('deal_id')
      .in('deal_id', dealIds);

    const redemptionsByDeal: Record<string, number> = {};
    (redemptionsData || []).forEach((r) => {
      redemptionsByDeal[r.deal_id] = (redemptionsByDeal[r.deal_id] || 0) + 1;
    });

    // Fetch view counts per deal
    const { data: viewsData } = await serviceClient
      .from('deal_views')
      .select('deal_id')
      .in('deal_id', dealIds);

    const viewsByDeal: Record<string, number> = {};
    (viewsData || []).forEach((v) => {
      viewsByDeal[v.deal_id] = (viewsByDeal[v.deal_id] || 0) + 1;
    });

    // Build deal summaries for AI
    const dealSummaries = deals.map((d) => {
      const vendorRaw = d.vendor as unknown;
      const vendor = (Array.isArray(vendorRaw) ? vendorRaw[0] : vendorRaw) as { business_name: string; category: string } | null;
      const redemptions = redemptionsByDeal[d.id] || 0;
      const views = viewsByDeal[d.id] || 0;
      const conversionRate = d.claims_count > 0 ? Math.round((redemptions / d.claims_count) * 100) : 0;
      const fillRate = d.max_claims ? Math.round((d.claims_count / d.max_claims) * 100) : null;

      return {
        title: d.title,
        vendor: vendor?.business_name || 'Unknown',
        category: vendor?.category || 'Unknown',
        type: d.deal_type === 'sponti_coupon' ? 'Sponti' : 'Steady',
        status: d.status,
        original_price: d.original_price,
        deal_price: d.deal_price,
        discount: `${d.discount_percentage}%`,
        claims: d.claims_count,
        max_claims: d.max_claims || 'unlimited',
        fill_rate: fillRate ? `${fillRate}%` : 'N/A',
        redemptions,
        conversion_rate: `${conversionRate}%`,
        views,
        days_active: Math.floor((Date.now() - new Date(d.starts_at).getTime()) / (1000 * 60 * 60 * 24)),
        expires: d.expires_at,
      };
    });

    const apiKey = process.env.SPONTI_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        top_performers: [],
        underperformers: [],
        trends: ['AI analysis unavailable — no API key configured.'],
        recommendations: ['Configure SPONTI_ANTHROPIC_KEY or ANTHROPIC_API_KEY in environment variables.'],
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are a deal performance analyst for SpontiCoupon, a local deals marketplace. Analyze the following deal data and provide actionable insights for the platform admin. Be specific — reference actual deal titles, numbers, and percentages. Be concise and direct.

Return your analysis as valid JSON with exactly this structure:
{
  "top_performers": [{ "title": "Deal Title", "reason": "Why it's performing well (1-2 sentences)" }],
  "underperformers": [{ "title": "Deal Title", "reason": "Why it needs attention (1-2 sentences)" }],
  "trends": ["Trend insight 1", "Trend insight 2"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"]
}

Provide 3-5 items in top_performers, 2-3 in underperformers, 2-3 trends, and 3-4 recommendations. Only return valid JSON, nothing else.`,
      messages: [
        {
          role: 'user',
          content: `Here are all the current deals on SpontiCoupon:\n\n${JSON.stringify(dealSummaries, null, 2)}\n\nAnalyze these deals and tell me which are performing best, which need attention, what trends you see, and what I should do next.`,
        },
      ],
    });

    // Parse AI response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    if (!parsed) {
      return NextResponse.json({
        top_performers: [],
        underperformers: [],
        trends: [responseText.slice(0, 500)],
        recommendations: [],
      });
    }

    return NextResponse.json({
      top_performers: parsed.top_performers || [],
      underperformers: parsed.underperformers || [],
      trends: parsed.trends || [],
      recommendations: parsed.recommendations || [],
    });
  } catch (error) {
    console.error('[POST /api/admin/deals/ai-insights] Error:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
