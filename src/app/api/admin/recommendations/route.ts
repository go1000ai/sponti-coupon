import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();

    // Get active deals with their engagement stats
    const { data: deals, error } = await serviceClient
      .from('deals')
      .select(`
        id,
        title,
        deal_type,
        discount_percentage,
        status,
        created_at,
        expires_at,
        claims_count,
        vendor:vendors(business_name, logo_url),
        category:categories(name)
      `)
      .eq('status', 'active')
      .order('claims_count', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[GET /api/admin/recommendations] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
    }

    // Get redemption counts per deal (redeemed claims)
    const dealIds = (deals || []).map((d: Record<string, unknown>) => d.id as string);
    const redemptionMap: Record<string, number> = {};

    if (dealIds.length > 0) {
      const { data: redemptionData } = await serviceClient
        .from('claims')
        .select('deal_id')
        .in('deal_id', dealIds)
        .eq('redeemed', true);

      if (redemptionData) {
        for (const r of redemptionData) {
          redemptionMap[r.deal_id] = (redemptionMap[r.deal_id] || 0) + 1;
        }
      }
    }

    const recommendations = (deals || []).map((d: Record<string, unknown>) => {
      const vendor = d.vendor as { business_name: string; logo_url: string | null } | null;
      const category = d.category as { name: string } | null;
      const claimsCount = (d.claims_count as number) || 0;
      const redemptionCount = redemptionMap[d.id as string] || 0;
      return {
        id: d.id as string,
        title: d.title as string,
        deal_type: d.deal_type as string,
        discount_percentage: d.discount_percentage as number | null,
        status: d.status as string,
        created_at: d.created_at as string,
        expires_at: d.expires_at as string | null,
        claims_count: claimsCount,
        redemption_count: redemptionCount,
        vendor_name: vendor?.business_name || 'Unknown',
        vendor_logo: vendor?.logo_url || null,
        category_name: category?.name || 'Uncategorized',
        conversion_rate: claimsCount > 0
          ? Math.round(redemptionCount / claimsCount * 100)
          : 0,
      };
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('[GET /api/admin/recommendations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
