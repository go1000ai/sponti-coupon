import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// GET /api/vendor/roi?period=30 — Vendor ROI Dashboard metrics
export async function GET(request: NextRequest) {
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
    return NextResponse.json({ error: 'Vendor access only' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = parseInt(searchParams.get('period') || '30');
  const periodStart = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
  const prevPeriodStart = new Date(Date.now() - 2 * period * 24 * 60 * 60 * 1000).toISOString();

  const serviceClient = await createServiceRoleClient();

  // Get vendor info (for average_ticket_value)
  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('average_ticket_value, subscription_tier')
    .eq('id', user.id)
    .single();

  const avgTicket = vendor?.average_ticket_value || 50;

  // ── 1. Customers Sent (unique customers who redeemed in period) ──
  const { data: periodRedemptions } = await serviceClient
    .from('redemptions')
    .select('customer_id, scanned_at')
    .eq('vendor_id', user.id)
    .gte('scanned_at', periodStart);

  const uniqueCustomers = new Set((periodRedemptions || []).map(r => r.customer_id));
  const customersSent = uniqueCustomers.size;

  // Previous period for comparison
  const { data: prevRedemptions } = await serviceClient
    .from('redemptions')
    .select('customer_id')
    .eq('vendor_id', user.id)
    .gte('scanned_at', prevPeriodStart)
    .lt('scanned_at', periodStart);

  const prevCustomers = new Set((prevRedemptions || []).map(r => r.customer_id)).size;
  const customersSentDelta = prevCustomers > 0
    ? Math.round(((customersSent - prevCustomers) / prevCustomers) * 100)
    : customersSent > 0 ? 100 : 0;

  // ── 2. Repeat Customers (customers with 2+ redemptions, ever) ──
  const { data: allRedemptions } = await serviceClient
    .from('redemptions')
    .select('customer_id')
    .eq('vendor_id', user.id);

  const customerCounts: Record<string, number> = {};
  (allRedemptions || []).forEach(r => {
    customerCounts[r.customer_id] = (customerCounts[r.customer_id] || 0) + 1;
  });
  const repeatCustomers = Object.values(customerCounts).filter(c => c >= 2).length;
  const totalUniqueCustomers = Object.keys(customerCounts).length;
  const repeatRate = totalUniqueCustomers > 0
    ? Math.round((repeatCustomers / totalUniqueCustomers) * 100)
    : 0;

  // ── 3. Estimated Revenue (unique customers in period × avg ticket value) ──
  const estimatedRevenue = customersSent * avgTicket;

  // Previous period revenue
  const prevRevenue = prevCustomers * avgTicket;
  const revenueDelta = prevRevenue > 0
    ? Math.round(((estimatedRevenue - prevRevenue) / prevRevenue) * 100)
    : estimatedRevenue > 0 ? 100 : 0;

  // ── 4. Deal Views (from deal_views table) ──
  const { data: dealViewCount } = await serviceClient
    .rpc('get_vendor_deal_views', {
      p_vendor_id: user.id,
      p_start_date: periodStart,
      p_end_date: new Date().toISOString(),
    });

  const dealViews = dealViewCount || 0;

  // Previous period views
  const { data: prevViewCount } = await serviceClient
    .rpc('get_vendor_deal_views', {
      p_vendor_id: user.id,
      p_start_date: prevPeriodStart,
      p_end_date: periodStart,
    });
  const prevDealViews = prevViewCount || 0;
  const dealViewsDelta = prevDealViews > 0
    ? Math.round(((dealViews - prevDealViews) / prevDealViews) * 100)
    : dealViews > 0 ? 100 : 0;

  // ── 5. Loyalty Active Customers (customers with a loyalty card for this vendor) ──
  const { count: loyaltyActiveCount } = await serviceClient
    .from('loyalty_cards')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', user.id);

  const loyaltyActive = loyaltyActiveCount || 0;

  // ── 6. Conversion rate (views → claims) ──
  const { count: periodClaimsCount } = await serviceClient
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .in('deal_id', (await serviceClient
      .from('deals')
      .select('id')
      .eq('vendor_id', user.id)
    ).data?.map(d => d.id) || [])
    .gte('created_at', periodStart);

  const periodClaims = periodClaimsCount || 0;
  const conversionRate = dealViews > 0
    ? Math.round((periodClaims / dealViews) * 100)
    : 0;

  // ── 7. Monthly revenue chart (last 6 months) ──
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: chartRedemptions } = await serviceClient
    .from('redemptions')
    .select('customer_id, scanned_at')
    .eq('vendor_id', user.id)
    .gte('scanned_at', sixMonthsAgo.toISOString());

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const revenueChart: { month: string; label: string; revenue: number; customers: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

    const monthRedemptions = (chartRedemptions || []).filter(r => {
      const scannedDate = new Date(r.scanned_at);
      return scannedDate >= d && scannedDate <= monthEnd;
    });

    const monthUniqueCustomers = new Set(monthRedemptions.map(r => r.customer_id)).size;

    revenueChart.push({
      month: monthKey,
      label: monthNames[d.getMonth()],
      revenue: monthUniqueCustomers * avgTicket,
      customers: monthUniqueCustomers,
    });
  }

  return NextResponse.json({
    period,
    metrics: {
      customers_sent: {
        value: customersSent,
        delta: customersSentDelta,
        label: 'Customers Sent',
      },
      repeat_customers: {
        value: repeatCustomers,
        rate: repeatRate,
        total_unique: totalUniqueCustomers,
        label: 'Repeat Customers',
      },
      estimated_revenue: {
        value: estimatedRevenue,
        delta: revenueDelta,
        avg_ticket: avgTicket,
        label: 'Estimated Revenue',
      },
      deal_views: {
        value: dealViews,
        delta: dealViewsDelta,
        conversion_rate: conversionRate,
        label: 'Deal Views',
      },
      loyalty_active: {
        value: loyaltyActive,
        label: 'Loyalty Members',
      },
    },
    revenue_chart: revenueChart,
  });
}

// PATCH /api/vendor/roi — Update average ticket value
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { average_ticket_value } = body;

  if (typeof average_ticket_value !== 'number' || average_ticket_value < 0) {
    return NextResponse.json({ error: 'Invalid average ticket value' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vendors')
    .update({ average_ticket_value })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, average_ticket_value });
}
