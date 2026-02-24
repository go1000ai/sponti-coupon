import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get vendor info
  const { data: vendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  // Check tier access for AI insights
  const tier = (vendor.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].ai_insights) {
    return NextResponse.json(
      { error: 'AI Insights requires a Pro plan or higher. Upgrade at /vendor/subscription.' },
      { status: 403 }
    );
  }

  const includeCompetitorData = SUBSCRIPTION_TIERS[tier].competitor_data;

  // Get all vendor's deals
  const { data: myDeals } = await supabase
    .from('deals')
    .select('*')
    .eq('vendor_id', user.id)
    .order('created_at', { ascending: false });

  // Get competitor deals (same category, different vendor)
  const { data: competitorDeals } = await supabase
    .from('deals')
    .select('*, vendor:vendors(business_name, category, city)')
    .eq('status', 'active')
    .neq('vendor_id', user.id)
    .gte('expires_at', new Date().toISOString());

  // Filter competitors in same category
  const categoryCompetitors = (competitorDeals || []).filter(
    (d) => (d.vendor as { category?: string })?.category === vendor.category
  );

  // Filter competitors in same city
  const localCompetitors = (competitorDeals || []).filter(
    (d) => (d.vendor as { city?: string })?.city === vendor.city
  );

  const deals = myDeals || [];
  const activeDeals = deals.filter(d => d.status === 'active');
  const spontiDeals = deals.filter(d => d.deal_type === 'sponti_coupon');
  const regularDeals = deals.filter(d => d.deal_type === 'regular');

  // Compute insights
  const avgDiscount = deals.length > 0
    ? deals.reduce((s, d) => s + d.discount_percentage, 0) / deals.length
    : 0;
  const avgClaims = deals.length > 0
    ? deals.reduce((s, d) => s + d.claims_count, 0) / deals.length
    : 0;
  const competitorAvgDiscount = categoryCompetitors.length > 0
    ? categoryCompetitors.reduce((s, d) => s + d.discount_percentage, 0) / categoryCompetitors.length
    : 0;
  const competitorAvgClaims = categoryCompetitors.length > 0
    ? categoryCompetitors.reduce((s, d) => s + d.claims_count, 0) / categoryCompetitors.length
    : 0;

  // Best and worst performing deals
  const sortedByPerformance = [...deals].sort((a, b) => b.claims_count - a.claims_count);
  const bestDeal = sortedByPerformance[0] || null;
  const worstActiveDeal = [...activeDeals].sort((a, b) => a.claims_count - b.claims_count)[0] || null;

  // Sponti vs Regular performance
  const spontiAvgClaims = spontiDeals.length > 0
    ? spontiDeals.reduce((s, d) => s + d.claims_count, 0) / spontiDeals.length
    : 0;
  const regularAvgClaims = regularDeals.length > 0
    ? regularDeals.reduce((s, d) => s + d.claims_count, 0) / regularDeals.length
    : 0;

  // Best discount range
  const discountBuckets: Record<string, { total: number; count: number }> = {};
  deals.forEach(d => {
    const bucket = Math.floor(d.discount_percentage / 10) * 10;
    const key = `${bucket}-${bucket + 10}%`;
    if (!discountBuckets[key]) discountBuckets[key] = { total: 0, count: 0 };
    discountBuckets[key].total += d.claims_count;
    discountBuckets[key].count += 1;
  });

  const bestDiscountRange = Object.entries(discountBuckets)
    .map(([range, data]) => ({ range, avgClaims: data.count > 0 ? data.total / data.count : 0 }))
    .sort((a, b) => b.avgClaims - a.avgClaims)[0] || null;

  // Generate AI recommendations
  const recommendations: Array<{ title: string; description: string; priority: 'high' | 'medium' | 'low'; action?: string }> = [];

  // Recommendation 1: Sponti coupon opportunity
  if (spontiDeals.length === 0 && regularDeals.length > 0) {
    recommendations.push({
      title: 'Try a Sponti Coupon',
      description: 'You haven\'t created any Sponti Coupons yet. Sponti Deals with deposits typically see 2-3x higher engagement than regular deals. Create a 24-hour Sponti Deal with a small deposit to boost traffic.',
      priority: 'high',
      action: '/vendor/deals/new',
    });
  } else if (spontiAvgClaims > regularAvgClaims * 1.5) {
    recommendations.push({
      title: 'Sponti Coupons are your top performers',
      description: `Your Sponti Coupons average ${Math.round(spontiAvgClaims)} claims vs ${Math.round(regularAvgClaims)} for Regular Deals. Consider running more Sponti Deals to maximize engagement.`,
      priority: 'medium',
      action: '/vendor/deals/new',
    });
  }

  // Recommendation 2: Discount optimization
  if (avgDiscount < competitorAvgDiscount - 5 && categoryCompetitors.length > 0) {
    recommendations.push({
      title: 'Increase your discounts to stay competitive',
      description: `Your average discount is ${Math.round(avgDiscount)}%, while competitors in ${vendor.category} average ${Math.round(competitorAvgDiscount)}%. Consider boosting your deals by ${Math.round(competitorAvgDiscount - avgDiscount)}% to attract more customers.`,
      priority: 'high',
    });
  } else if (avgDiscount > competitorAvgDiscount + 10 && categoryCompetitors.length > 0) {
    recommendations.push({
      title: 'Your discounts are higher than competitors',
      description: `At ${Math.round(avgDiscount)}% avg discount vs competitors' ${Math.round(competitorAvgDiscount)}%, you might be leaving money on the table. Consider reducing discounts slightly to improve margins.`,
      priority: 'medium',
    });
  }

  // Recommendation 3: Best performing discount range
  if (bestDiscountRange && deals.length >= 3) {
    recommendations.push({
      title: `Sweet spot: ${bestDiscountRange.range} discount range`,
      description: `Your best performing deals average ${Math.round(bestDiscountRange.avgClaims)} claims in the ${bestDiscountRange.range} discount range. Focus new deals around this range for optimal results.`,
      priority: 'medium',
    });
  }

  // Recommendation 4: No active deals
  if (activeDeals.length === 0) {
    recommendations.push({
      title: 'You have no active deals',
      description: 'Customers can\'t find you without active deals. Create a Regular Deal to establish your baseline, then add a Sponti Coupon for a traffic boost.',
      priority: 'high',
      action: '/vendor/deals/new',
    });
  }

  // Recommendation 5: Claims comparison
  if (avgClaims < competitorAvgClaims * 0.5 && categoryCompetitors.length > 0) {
    recommendations.push({
      title: 'Boost your deal visibility',
      description: `Your deals average ${Math.round(avgClaims)} claims vs ${Math.round(competitorAvgClaims)} for competitors. Consider offering deeper discounts, better titles, or running Sponti Deals during peak hours.`,
      priority: 'high',
    });
  }

  // Recommendation 6: Expiring deals
  const soonExpiring = activeDeals.filter(d => {
    const hoursLeft = (new Date(d.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft < 48;
  });

  if (soonExpiring.length > 0) {
    recommendations.push({
      title: `${soonExpiring.length} deal(s) expiring soon`,
      description: `You have deals expiring in the next 48 hours. Consider creating new deals to maintain visibility and keep customers engaged.`,
      priority: 'low',
      action: '/vendor/deals',
    });
  }

  // Recommendation 7: Pricing optimization
  if (bestDeal && worstActiveDeal && bestDeal.id !== worstActiveDeal.id) {
    recommendations.push({
      title: 'Learn from your top deal',
      description: `"${bestDeal.title}" with ${bestDeal.discount_percentage}% off earned ${bestDeal.claims_count} claims. Try to replicate its format with similar pricing and discount structure.`,
      priority: 'low',
    });
  }

  // Competitor data summary
  const competitorSummary = categoryCompetitors.length > 0 ? {
    count: new Set(categoryCompetitors.map(d => d.vendor_id)).size,
    avgDiscount: Math.round(competitorAvgDiscount),
    avgClaims: Math.round(competitorAvgClaims),
    topDeal: [...categoryCompetitors].sort((a, b) => b.claims_count - a.claims_count)[0],
    priceRange: {
      min: Math.min(...categoryCompetitors.map(d => d.deal_price)),
      max: Math.max(...categoryCompetitors.map(d => d.deal_price)),
    },
    discountRange: {
      min: Math.round(Math.min(...categoryCompetitors.map(d => d.discount_percentage))),
      max: Math.round(Math.max(...categoryCompetitors.map(d => d.discount_percentage))),
    },
  } : null;

  return NextResponse.json({
    vendor: {
      category: vendor.category,
      city: vendor.city,
    },
    myStats: {
      totalDeals: deals.length,
      activeDeals: activeDeals.length,
      avgDiscount: Math.round(avgDiscount),
      avgClaims: Math.round(avgClaims),
      spontiCount: spontiDeals.length,
      regularCount: regularDeals.length,
      spontiAvgClaims: Math.round(spontiAvgClaims),
      regularAvgClaims: Math.round(regularAvgClaims),
      bestDeal,
      worstActiveDeal,
    },
    competitors: includeCompetitorData ? competitorSummary : null,
    localCompetitorCount: includeCompetitorData ? new Set(localCompetitors.map(d => d.vendor_id)).size : 0,
    recommendations,
  });
}
