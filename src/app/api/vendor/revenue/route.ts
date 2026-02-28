import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/vendor/revenue?period=month|quarter|year|all
// Returns revenue analytics for the vendor
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'month';

  // Calculate date range
  const now = new Date();
  let startDate: Date;
  switch (period) {
    case 'quarter':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all':
      startDate = new Date(2020, 0, 1);
      break;
    default: // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Get all redemptions for this vendor in the period
  const { data: redemptions } = await supabase
    .from('redemptions')
    .select('deposit_amount, remaining_balance, amount_collected, collection_completed, scanned_at')
    .eq('vendor_id', user.id)
    .gte('scanned_at', startDate.toISOString())
    .order('scanned_at', { ascending: true });

  const records = redemptions || [];

  // Calculate metrics
  let totalCollected = 0;
  let totalDeposits = 0;
  let completedTransactions = 0;

  for (const r of records) {
    const deposit = r.deposit_amount || 0;
    const collected = r.amount_collected || 0;
    totalDeposits += deposit;
    if (r.collection_completed) {
      totalCollected += collected;
      completedTransactions++;
    }
  }

  const totalRevenue = totalDeposits + totalCollected;
  const totalTransactions = records.length;
  const avgDealValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Commission savings: what they'd lose on a 50% commission platform like Groupon
  const commissionSavings = totalRevenue * 0.5;

  // Monthly trend (last 6 months)
  const monthlyTrend: { month: string; revenue: number; transactions: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    let monthRevenue = 0;
    let monthTx = 0;

    for (const r of records) {
      const d = new Date(r.scanned_at);
      if (d >= m && d <= mEnd) {
        monthRevenue += (r.deposit_amount || 0) + (r.collection_completed ? (r.amount_collected || 0) : 0);
        monthTx++;
      }
    }

    monthlyTrend.push({ month: label, revenue: monthRevenue, transactions: monthTx });
  }

  // Also fetch all-time redemptions for the monthly trend (if period is not 'all')
  let allTimeRedemptions = records;
  if (period !== 'all') {
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const { data: allData } = await supabase
      .from('redemptions')
      .select('deposit_amount, remaining_balance, amount_collected, collection_completed, scanned_at')
      .eq('vendor_id', user.id)
      .gte('scanned_at', sixMonthsAgo.toISOString())
      .order('scanned_at', { ascending: true });
    allTimeRedemptions = allData || [];

    // Recalculate monthly trend with full data
    monthlyTrend.length = 0;
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const label = m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      let monthRevenue = 0;
      let monthTx = 0;

      for (const r of allTimeRedemptions) {
        const d = new Date(r.scanned_at);
        if (d >= m && d <= mEnd) {
          monthRevenue += (r.deposit_amount || 0) + (r.collection_completed ? (r.amount_collected || 0) : 0);
          monthTx++;
        }
      }

      monthlyTrend.push({ month: label, revenue: monthRevenue, transactions: monthTx });
    }
  }

  return NextResponse.json({
    total_revenue: totalRevenue,
    total_deposits: totalDeposits,
    total_collected: totalCollected,
    total_transactions: totalTransactions,
    completed_collections: completedTransactions,
    avg_deal_value: Math.round(avgDealValue * 100) / 100,
    commission_savings: Math.round(commissionSavings * 100) / 100,
    monthly_trend: monthlyTrend,
  });
}
