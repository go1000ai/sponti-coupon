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
    case 'today': {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case '7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    case 'all':
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const supabase = await createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30d';
  const rangeStart = getRangeStart(range);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  // Week boundaries for growth metrics
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  // Build vendor/customer queries with optional date range
  let vendorsQuery = supabase.from('vendors').select('*', { count: 'exact', head: true });
  let customersQuery = supabase.from('customers').select('*', { count: 'exact', head: true });
  let dealsQuery = supabase.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'active');

  if (rangeStart) {
    vendorsQuery = vendorsQuery.gte('created_at', rangeStart);
    customersQuery = customersQuery.gte('created_at', rangeStart);
    dealsQuery = dealsQuery.gte('created_at', rangeStart);
  }

  const [
    vendorsRes,
    customersRes,
    dealsRes,
    subsRes,
    // Today's activity
    claimsTodayRes,
    signupsTodayRes,
    dealsCreatedTodayRes,
    // Recent activity items
    recentClaimsRes,
    recentRedemptionsRes,
    recentCustomersRes,
    recentDealsRes,
    // Growth: this week
    vendorsThisWeekRes,
    customersThisWeekRes,
    // Growth: last week
    vendorsLastWeekRes,
    customersLastWeekRes,
    // System health
    expiredUnclearedRes,
    pendingDepositsRes,
  ] = await Promise.all([
    vendorsQuery,
    customersQuery,
    dealsQuery,
    supabase.from('subscriptions').select('*').eq('status', 'active'),
    // Today's activity
    supabase.from('claims').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('deals').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    // Recent activity
    supabase
      .from('claims')
      .select('id, created_at, customer:customers(first_name, last_name), deal:deals(title)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('redemptions')
      .select('id, scanned_at, customer:customers(first_name, last_name), deal:deals(title)')
      .order('scanned_at', { ascending: false })
      .limit(5),
    supabase
      .from('customers')
      .select('id, first_name, last_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('deals')
      .select('id, title, created_at, vendor:vendors(business_name)')
      .order('created_at', { ascending: false })
      .limit(5),
    // Growth: this week vendors/customers
    supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisWeekStart.toISOString()),
    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisWeekStart.toISOString()),
    // Growth: last week vendors/customers
    supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastWeekStart.toISOString())
      .lt('created_at', thisWeekStart.toISOString()),
    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastWeekStart.toISOString())
      .lt('created_at', thisWeekStart.toISOString()),
    // System health: expired deals still marked active
    supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .lt('expires_at', now.toISOString()),
    // System health: claims with pending deposits
    supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('deposit_confirmed', false)
      .eq('redeemed', false),
  ]);

  // Compute MRR and tier breakdown
  const subs = subsRes.data || [];
  const tierBreakdown: Record<string, number> = {};
  let mrr = 0;
  subs.forEach((sub: Subscription) => {
    tierBreakdown[sub.tier] = (tierBreakdown[sub.tier] || 0) + 1;
    mrr += TIER_PRICES[sub.tier] || 0;
  });

  // Build recent activity feed
  type ActivityItem = {
    id: string;
    type: 'claim' | 'redemption' | 'signup' | 'deal';
    description: string;
    timestamp: string;
  };

  const activity: ActivityItem[] = [];

  (recentClaimsRes.data || []).forEach((claim: Record<string, unknown>) => {
    const customer = claim.customer as { first_name: string | null; last_name: string | null } | null;
    const deal = claim.deal as { title: string } | null;
    activity.push({
      id: `claim-${claim.id}`,
      type: 'claim',
      description: `${customer?.first_name || 'A customer'} ${customer?.last_name || ''} claimed "${deal?.title || 'a deal'}"`,
      timestamp: claim.created_at as string,
    });
  });

  (recentRedemptionsRes.data || []).forEach((redemption: Record<string, unknown>) => {
    const customer = redemption.customer as { first_name: string | null; last_name: string | null } | null;
    const deal = redemption.deal as { title: string } | null;
    activity.push({
      id: `redemption-${redemption.id}`,
      type: 'redemption',
      description: `${customer?.first_name || 'A customer'} ${customer?.last_name || ''} redeemed "${deal?.title || 'a deal'}"`,
      timestamp: redemption.scanned_at as string,
    });
  });

  (recentCustomersRes.data || []).forEach((cust: Record<string, unknown>) => {
    activity.push({
      id: `signup-${cust.id}`,
      type: 'signup',
      description: `${cust.first_name || 'New customer'} ${cust.last_name || ''} signed up`,
      timestamp: cust.created_at as string,
    });
  });

  (recentDealsRes.data || []).forEach((deal: Record<string, unknown>) => {
    const vendor = deal.vendor as { business_name: string } | null;
    activity.push({
      id: `deal-${deal.id}`,
      type: 'deal',
      description: `${vendor?.business_name || 'A vendor'} created "${deal.title}"`,
      timestamp: deal.created_at as string,
    });
  });

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    totalVendors: vendorsRes.count || 0,
    totalCustomers: customersRes.count || 0,
    activeDeals: dealsRes.count || 0,
    mrr,
    tierBreakdown,
    todayActivity: {
      claims: claimsTodayRes.count || 0,
      signups: signupsTodayRes.count || 0,
      dealsCreated: dealsCreatedTodayRes.count || 0,
    },
    recentActivity: activity.slice(0, 10),
    growthMetrics: {
      vendorsThisWeek: vendorsThisWeekRes.count || 0,
      vendorsLastWeek: vendorsLastWeekRes.count || 0,
      customersThisWeek: customersThisWeekRes.count || 0,
      customersLastWeek: customersLastWeekRes.count || 0,
    },
    systemHealth: {
      expiredUncleared: expiredUnclearedRes.count || 0,
      pendingDeposits: pendingDepositsRes.count || 0,
    },
  });
}
