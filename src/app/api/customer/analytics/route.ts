import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/customer/analytics — Charts data for the customer dashboard
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch all claims with deal + vendor info
  const { data: claims } = await supabase
    .from('claims')
    .select('id, redeemed, redeemed_at, expires_at, deposit_confirmed, created_at, deal:deals(title, original_price, deal_price, deal_type, vendor:vendors(business_name, category))')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: true });

  if (!claims || claims.length === 0) {
    return NextResponse.json({
      savings_over_time: [],
      category_breakdown: [],
      redemption_activity: [],
      totals: { total_saved: 0, total_claimed: 0, total_redeemed: 0, total_expired: 0 },
    });
  }

  const now = new Date();

  // ── 1. Savings Over Time (monthly bar chart) ──
  // Group redeemed claims by month, sum savings
  const savingsByMonth: Record<string, number> = {};

  for (const claim of claims) {
    if (!claim.redeemed || !claim.redeemed_at) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deal = claim.deal as any;
    if (!deal) continue;

    const date = new Date(claim.redeemed_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const saved = (deal.original_price || 0) - (deal.deal_price || 0);
    savingsByMonth[monthKey] = (savingsByMonth[monthKey] || 0) + saved;
  }

  // Generate last 6 months including current
  const savings_over_time: { month: string; label: string; saved: number }[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    savings_over_time.push({
      month: key,
      label: monthNames[d.getMonth()],
      saved: Math.round((savingsByMonth[key] || 0) * 100) / 100,
    });
  }

  // ── 2. Category Breakdown (donut chart) ──
  const categoryCounts: Record<string, { count: number; saved: number }> = {};

  for (const claim of claims) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deal = claim.deal as any;
    const category = deal?.vendor?.category || 'other';
    const saved = claim.redeemed ? (deal?.original_price || 0) - (deal?.deal_price || 0) : 0;

    if (!categoryCounts[category]) {
      categoryCounts[category] = { count: 0, saved: 0 };
    }
    categoryCounts[category].count++;
    categoryCounts[category].saved += saved;
  }

  const categoryLabels: Record<string, string> = {
    'restaurants': 'Restaurants',
    'beauty-spa': 'Spa & Beauty',
    'health-fitness': 'Health & Fitness',
    'entertainment': 'Entertainment',
    'shopping': 'Shopping',
    'food-drink': 'Food & Drink',
    'hair-grooming': 'Hair & Grooming',
    'automotive': 'Automotive',
    'classes-courses': 'Classes & Courses',
    'wellness': 'Wellness',
    'other': 'Other',
  };

  const categoryColors: Record<string, string> = {
    'restaurants': '#f97316',
    'beauty-spa': '#ec4899',
    'health-fitness': '#22c55e',
    'entertainment': '#8b5cf6',
    'shopping': '#3b82f6',
    'food-drink': '#eab308',
    'hair-grooming': '#f43f5e',
    'automotive': '#64748b',
    'classes-courses': '#06b6d4',
    'wellness': '#14b8a6',
    'other': '#9ca3af',
  };

  const category_breakdown = Object.entries(categoryCounts)
    .map(([slug, data]) => ({
      name: categoryLabels[slug] || slug,
      value: data.count,
      saved: Math.round(data.saved * 100) / 100,
      color: categoryColors[slug] || '#9ca3af',
    }))
    .sort((a, b) => b.value - a.value);

  // ── 3. Redemption Activity (monthly grouped bar chart) ──
  const activityByMonth: Record<string, { claimed: number; redeemed: number; expired: number }> = {};

  for (const claim of claims) {
    const createdDate = new Date(claim.created_at);
    const createdKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;

    if (!activityByMonth[createdKey]) {
      activityByMonth[createdKey] = { claimed: 0, redeemed: 0, expired: 0 };
    }
    activityByMonth[createdKey].claimed++;

    if (claim.redeemed && claim.redeemed_at) {
      const redeemedDate = new Date(claim.redeemed_at);
      const redeemedKey = `${redeemedDate.getFullYear()}-${String(redeemedDate.getMonth() + 1).padStart(2, '0')}`;
      if (!activityByMonth[redeemedKey]) {
        activityByMonth[redeemedKey] = { claimed: 0, redeemed: 0, expired: 0 };
      }
      activityByMonth[redeemedKey].redeemed++;
    }

    if (!claim.redeemed && new Date(claim.expires_at) < now) {
      const expiredDate = new Date(claim.expires_at);
      const expiredKey = `${expiredDate.getFullYear()}-${String(expiredDate.getMonth() + 1).padStart(2, '0')}`;
      if (!activityByMonth[expiredKey]) {
        activityByMonth[expiredKey] = { claimed: 0, redeemed: 0, expired: 0 };
      }
      activityByMonth[expiredKey].expired++;
    }
  }

  const redemption_activity: { month: string; label: string; claimed: number; redeemed: number; expired: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const data = activityByMonth[key] || { claimed: 0, redeemed: 0, expired: 0 };
    redemption_activity.push({
      month: key,
      label: monthNames[d.getMonth()],
      ...data,
    });
  }

  // ── 4. Totals ──
  let total_saved = 0;
  const total_claimed = claims.length;
  let total_redeemed = 0;
  let total_expired = 0;

  for (const claim of claims) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deal = claim.deal as any;
    if (claim.redeemed) {
      total_redeemed++;
      total_saved += (deal?.original_price || 0) - (deal?.deal_price || 0);
    } else if (new Date(claim.expires_at) < now) {
      total_expired++;
    }
  }

  return NextResponse.json({
    savings_over_time,
    category_breakdown,
    redemption_activity,
    totals: {
      total_saved: Math.round(total_saved * 100) / 100,
      total_claimed,
      total_redeemed,
      total_expired,
    },
  });
}
