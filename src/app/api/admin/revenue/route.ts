import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Subscription } from '@/lib/types/database';

const TIER_PRICES: Record<string, number> = {
  starter: 49,
  pro: 99,
  business: 199,
  enterprise: 499,
};

function getRangeStart(range: string): string | null {
  const now = new Date();
  switch (range) {
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    case '90d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return d.toISOString();
    }
    case '12m': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString();
    }
    case 'all':
    default:
      return null;
  }
}

function getMonthsForRange(range: string): number {
  switch (range) {
    case '30d': return 3; // show last 3 months for context
    case '90d': return 6;
    case '12m': return 12;
    case 'all': return 12; // default to 12 months for all
    default: return 6;
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const supabase = await createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30d';
  const rangeStart = getRangeStart(range);

  // Current month boundary
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const [activeSubsRes, depositsRes, newSubsThisMonthRes, canceledSubsRes, vendorsRes] = await Promise.all([
    // All active subscriptions
    supabase.from('subscriptions').select('*').eq('status', 'active'),
    // Deposit revenue from confirmed claims (with range filter)
    (() => {
      let q = supabase
        .from('claims')
        .select('deal:deals(deposit_amount)')
        .eq('deposit_confirmed', true);
      if (rangeStart) q = q.gte('created_at', rangeStart);
      return q;
    })(),
    // New subs this month (to estimate last month MRR)
    supabase
      .from('subscriptions')
      .select('tier')
      .eq('status', 'active')
      .gte('created_at', thisMonthStart.toISOString()),
    // Canceled/churned subscriptions
    (() => {
      let q = supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'canceled');
      if (rangeStart) q = q.gte('current_period_end', rangeStart);
      return q;
    })(),
    // All vendors for top vendor calculation
    supabase.from('vendors').select('id, business_name, subscription_tier'),
  ]);

  // Calculate MRR and tier revenue
  const subs = activeSubsRes.data || [];
  const tierCounts: Record<string, number> = {};
  let totalMRR = 0;

  subs.forEach((sub: Subscription) => {
    tierCounts[sub.tier] = (tierCounts[sub.tier] || 0) + 1;
    totalMRR += TIER_PRICES[sub.tier] || 0;
  });

  const tierRevenue = ['starter', 'pro', 'business', 'enterprise'].map(tier => ({
    tier,
    count: tierCounts[tier] || 0,
    price: TIER_PRICES[tier],
    total: (tierCounts[tier] || 0) * TIER_PRICES[tier],
  }));

  // Last month MRR estimate
  let newSubsMRR = 0;
  (newSubsThisMonthRes.data || []).forEach((sub: { tier: string }) => {
    newSubsMRR += TIER_PRICES[sub.tier] || 0;
  });
  const lastMonthMRR = totalMRR - newSubsMRR;

  // Deposit revenue
  let depositRevenue = 0;
  (depositsRes.data || []).forEach((claim: Record<string, unknown>) => {
    const dealRaw = claim.deal as { deposit_amount: number | null } | { deposit_amount: number | null }[] | null;
    const deal = Array.isArray(dealRaw) ? dealRaw[0] : dealRaw;
    if (deal?.deposit_amount) {
      depositRevenue += deal.deposit_amount;
    }
  });

  // Top vendors by claims
  const vendors = vendorsRes.data || [];
  const vendorMap: Record<string, { business_name: string; tier: string | null }> = {};
  const vendorIds: string[] = [];
  vendors.forEach((v: { id: string; business_name: string; subscription_tier: string | null }) => {
    vendorIds.push(v.id);
    vendorMap[v.id] = { business_name: v.business_name, tier: v.subscription_tier };
  });

  let topVendors: { business_name: string; tier: string | null; claims_count: number; tier_revenue: number }[] = [];
  if (vendorIds.length > 0) {
    const { data: dealsWithClaims } = await supabase
      .from('deals')
      .select('vendor_id, claims_count')
      .in('vendor_id', vendorIds);

    const vendorClaims: Record<string, number> = {};
    (dealsWithClaims || []).forEach((d: { vendor_id: string; claims_count: number }) => {
      vendorClaims[d.vendor_id] = (vendorClaims[d.vendor_id] || 0) + d.claims_count;
    });

    topVendors = Object.entries(vendorClaims)
      .map(([vendorId, claimsCount]) => ({
        business_name: vendorMap[vendorId]?.business_name || 'Unknown',
        tier: vendorMap[vendorId]?.tier || null,
        claims_count: claimsCount,
        tier_revenue: TIER_PRICES[vendorMap[vendorId]?.tier || ''] || 0,
      }))
      .sort((a, b) => b.claims_count - a.claims_count)
      .slice(0, 10);
  }

  // MRR trend - build monthly data points
  // We use subscription created_at dates to estimate historical MRR
  const monthsCount = getMonthsForRange(range);
  const mrrTrend: { month: string; mrr: number }[] = [];

  // Get all subscriptions (active + canceled) to build historical picture
  const { data: allSubs } = await supabase
    .from('subscriptions')
    .select('tier, status, created_at, current_period_end')
    .order('created_at', { ascending: true });

  const allSubsList = allSubs || [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - i);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
    const monthLabel = monthEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    // Count subscriptions that were active at the end of this month:
    // created_at <= monthEnd AND (status='active' OR current_period_end > monthEnd)
    let monthMRR = 0;
    allSubsList.forEach((sub: { tier: string; status: string; created_at: string; current_period_end: string }) => {
      const createdAt = new Date(sub.created_at);
      const periodEnd = new Date(sub.current_period_end);
      if (createdAt <= monthEnd && (sub.status === 'active' || periodEnd > monthEnd)) {
        monthMRR += TIER_PRICES[sub.tier] || 0;
      }
    });

    mrrTrend.push({ month: monthLabel, mrr: monthMRR });
  }

  return NextResponse.json({
    totalMRR,
    lastMonthMRR,
    depositRevenue,
    tierRevenue,
    topVendors,
    mrrTrend,
    churnCount: canceledSubsRes.count || 0,
  });
}
