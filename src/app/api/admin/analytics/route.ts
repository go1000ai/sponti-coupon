import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

function getDateThreshold(range: string): string | null {
  if (range === 'all') return null;

  const now = new Date();
  let days = 30;
  if (range === '7d') days = 7;
  else if (range === '30d') days = 30;
  else if (range === '90d') days = 90;

  now.setDate(now.getDate() - days);
  return now.toISOString();
}

// GET /api/admin/analytics — Aggregate analytics data
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30d';
  const threshold = getDateThreshold(range);

  try {
    // ---- Deal Views Over Time ----
    let viewsQuery = serviceClient
      .from('deal_views')
      .select('viewed_at')
      .order('viewed_at', { ascending: true });

    if (threshold) viewsQuery = viewsQuery.gte('viewed_at', threshold);

    const { data: viewsData } = await viewsQuery;

    const viewsByDay: Record<string, number> = {};
    (viewsData || []).forEach((v) => {
      const day = new Date(v.viewed_at).toISOString().split('T')[0];
      viewsByDay[day] = (viewsByDay[day] || 0) + 1;
    });

    const deal_views_over_time = Object.entries(viewsByDay).map(([date, views]) => ({
      date,
      views,
    }));

    // ---- Claims vs Redemptions ----
    let claimsCountQuery = serviceClient
      .from('claims')
      .select('id', { count: 'exact', head: true });

    if (threshold) claimsCountQuery = claimsCountQuery.gte('created_at', threshold);

    const { count: totalClaims } = await claimsCountQuery;

    let redemptionsCountQuery = serviceClient
      .from('redemptions')
      .select('id', { count: 'exact', head: true });

    if (threshold) redemptionsCountQuery = redemptionsCountQuery.gte('redeemed_at', threshold);

    const { count: totalRedemptions } = await redemptionsCountQuery;

    const claims_vs_redemptions = {
      total_claims: totalClaims || 0,
      total_redemptions: totalRedemptions || 0,
    };

    // ---- Customer Signups Over Time ----
    let customerQuery = serviceClient
      .from('customers')
      .select('created_at')
      .order('created_at', { ascending: true });

    if (threshold) customerQuery = customerQuery.gte('created_at', threshold);

    const { data: customerData } = await customerQuery;

    const customersByDay: Record<string, number> = {};
    (customerData || []).forEach((c) => {
      const day = new Date(c.created_at).toISOString().split('T')[0];
      customersByDay[day] = (customersByDay[day] || 0) + 1;
    });

    const customer_signups = Object.entries(customersByDay).map(([date, count]) => ({
      date,
      count,
    }));

    // ---- Vendor Signups Over Time ----
    let vendorQuery = serviceClient
      .from('vendors')
      .select('created_at')
      .order('created_at', { ascending: true });

    if (threshold) vendorQuery = vendorQuery.gte('created_at', threshold);

    const { data: vendorData } = await vendorQuery;

    const vendorsByDay: Record<string, number> = {};
    (vendorData || []).forEach((v) => {
      const day = new Date(v.created_at).toISOString().split('T')[0];
      vendorsByDay[day] = (vendorsByDay[day] || 0) + 1;
    });

    const vendor_signups = Object.entries(vendorsByDay).map(([date, count]) => ({
      date,
      count,
    }));

    // ---- Top Deals (by claims_count) ----
    let topDealsQuery = serviceClient
      .from('deals')
      .select('id, title, vendor_id, claims_count, status, vendor:vendors!vendor_id(business_name)')
      .order('claims_count', { ascending: false })
      .limit(10);

    if (threshold) topDealsQuery = topDealsQuery.gte('created_at', threshold);

    const { data: topDealsData } = await topDealsQuery;

    // Fetch redemption counts per deal for conversion rate
    const dealIds = (topDealsData || []).map((d) => d.id);
    const redemptionsByDeal: Record<string, number> = {};

    if (dealIds.length > 0) {
      const { data: redemptionsData } = await serviceClient
        .from('redemptions')
        .select('deal_id')
        .in('deal_id', dealIds);

      (redemptionsData || []).forEach((r) => {
        redemptionsByDeal[r.deal_id] = (redemptionsByDeal[r.deal_id] || 0) + 1;
      });
    }

    const top_deals = (topDealsData || []).map((d: Record<string, unknown>) => {
      const vendorRaw = d.vendor as { business_name: string } | { business_name: string }[] | null;
      const vendor = Array.isArray(vendorRaw) ? vendorRaw[0] : vendorRaw;
      const claimsCount = (d.claims_count as number) || 0;
      const redemptionCount = redemptionsByDeal[d.id as string] || 0;
      const conversionRate = claimsCount > 0 ? ((redemptionCount / claimsCount) * 100) : 0;

      return {
        title: d.title,
        vendor_name: vendor?.business_name || 'Unknown',
        claims_count: claimsCount,
        conversion_rate: Math.round(conversionRate * 10) / 10,
      };
    });

    return NextResponse.json({
      deal_views_over_time,
      claims_vs_redemptions,
      customer_signups,
      vendor_signups,
      top_deals,
    });
  } catch (error) {
    console.error('[GET /api/admin/analytics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
