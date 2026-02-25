import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/deals/[id]/analytics — Per-deal analytics
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  try {
    // Fetch claims for this deal
    const { data: claimsData } = await serviceClient
      .from('claims')
      .select('id, created_at, customer:customers(email)')
      .eq('deal_id', id)
      .order('created_at', { ascending: true });

    // Fetch redemptions for this deal
    const { data: redemptionsData } = await serviceClient
      .from('redemptions')
      .select('id, scanned_at')
      .eq('deal_id', id)
      .order('scanned_at', { ascending: true });

    // Fetch views for this deal
    const { data: viewsData } = await serviceClient
      .from('deal_views')
      .select('id, viewed_at')
      .eq('deal_id', id)
      .order('viewed_at', { ascending: true });

    const claims = claimsData || [];
    const redemptions = redemptionsData || [];
    const views = viewsData || [];

    // Group claims by day
    const claimsByDay: Record<string, number> = {};
    claims.forEach((c) => {
      const day = new Date(c.created_at).toISOString().split('T')[0];
      claimsByDay[day] = (claimsByDay[day] || 0) + 1;
    });

    // Group redemptions by day
    const redemptionsByDay: Record<string, number> = {};
    redemptions.forEach((r) => {
      const day = new Date(r.scanned_at).toISOString().split('T')[0];
      redemptionsByDay[day] = (redemptionsByDay[day] || 0) + 1;
    });

    // Group views by day
    const viewsByDay: Record<string, number> = {};
    views.forEach((v) => {
      const day = new Date(v.viewed_at).toISOString().split('T')[0];
      viewsByDay[day] = (viewsByDay[day] || 0) + 1;
    });

    // Merge all days into a single timeline
    const allDays = new Set([
      ...Object.keys(claimsByDay),
      ...Object.keys(redemptionsByDay),
      ...Object.keys(viewsByDay),
    ]);
    const sortedDays = Array.from(allDays).sort();

    const timeline = sortedDays.map((date) => ({
      date,
      claims: claimsByDay[date] || 0,
      redemptions: redemptionsByDay[date] || 0,
      views: viewsByDay[date] || 0,
    }));

    const totalClaims = claims.length;
    const totalRedemptions = redemptions.length;
    const totalViews = views.length;
    const conversionRate = totalClaims > 0
      ? Math.round((totalRedemptions / totalClaims) * 1000) / 10
      : 0;

    // Recent claims (last 5) with customer info
    const recentClaims = claims.slice(-5).reverse().map((c) => {
      const customer = c.customer as unknown as { email: string } | { email: string }[] | null;
      const email = Array.isArray(customer) ? customer[0]?.email : customer?.email;
      return {
        id: c.id,
        customer_email: email || 'Unknown',
        created_at: c.created_at,
      };
    });

    return NextResponse.json({
      timeline,
      total_claims: totalClaims,
      total_redemptions: totalRedemptions,
      total_views: totalViews,
      conversion_rate: conversionRate,
      recent_claims: recentClaims,
    });
  } catch (error) {
    console.error('[GET /api/admin/deals/[id]/analytics] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
