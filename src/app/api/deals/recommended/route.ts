import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/deals/recommended — Personalized deals based on purchase history
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();
  const now = new Date().toISOString();

  // 1. Get the customer's claim history with vendor categories
  const { data: claims } = await serviceClient
    .from('claims')
    .select('deal:deals(vendor:vendors(category))')
    .eq('customer_id', user.id);

  // 2. Count how many claims per vendor category
  const categoryCounts: Record<string, number> = {};
  let totalCategorizedClaims = 0;

  if (claims) {
    for (const claim of claims) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deal = claim.deal as any;
      const category = deal?.vendor?.category as string | null;
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        totalCategorizedClaims++;
      }
    }
  }

  // 3. Sort categories by frequency (most purchased first)
  const rankedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  // 4. Get the customer's currently claimed deal IDs (to exclude from recommendations)
  const { data: activeClaims } = await serviceClient
    .from('claims')
    .select('deal_id')
    .eq('customer_id', user.id)
    .eq('redeemed', false)
    .gte('expires_at', now);

  const claimedDealIds = new Set((activeClaims || []).map(c => c.deal_id));

  // 5. Fetch all active deals with vendor info
  const { data: allDeals } = await serviceClient
    .from('deals')
    .select('*, vendor:vendors(*)')
    .eq('status', 'active')
    .gte('expires_at', now)
    .order('created_at', { ascending: false });

  if (!allDeals || allDeals.length === 0) {
    return NextResponse.json({ recommended: [], categories: rankedCategories });
  }

  // 6. Filter out deals the customer already has active claims on
  const availableDeals = allDeals.filter(d => !claimedDealIds.has(d.id));

  // 7. Score each deal based on category affinity
  const scoredDeals = availableDeals.map(deal => {
    const vendorCategory = deal.vendor?.category;
    let score = 0;

    if (vendorCategory && rankedCategories.length > 0) {
      const categoryIndex = rankedCategories.indexOf(vendorCategory);
      if (categoryIndex !== -1) {
        // Higher score for more frequently purchased categories
        // Category rank 0 (most purchased) gets highest boost
        score = (rankedCategories.length - categoryIndex) * 10;
        // Bonus for number of purchases in this category
        score += (categoryCounts[vendorCategory] || 0) * 5;
      }
    }

    // Small boost for trending deals (high claims count)
    score += Math.min((deal.claims_count || 0) * 0.1, 5);

    // Small boost for higher discounts
    score += (deal.discount_percentage || 0) * 0.1;

    return { ...deal, recommendation_score: score };
  });

  // 8. Sort by score (highest first), then by newest
  scoredDeals.sort((a, b) => {
    if (b.recommendation_score !== a.recommendation_score) {
      return b.recommendation_score - a.recommendation_score;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // 9. Return top 6 recommended deals
  const recommended = scoredDeals.slice(0, 6);

  return NextResponse.json({
    recommended,
    categories: rankedCategories,
    has_history: totalCategorizedClaims > 0,
  });
}
