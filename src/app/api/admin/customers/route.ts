import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/customers — List all customers with stats
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';

  // Fetch all customers
  let query = serviceClient
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply search filter if provided
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`
    );
  }

  const { data: customersData, error: customersError } = await query;

  if (customersError) {
    return NextResponse.json({ error: customersError.message }, { status: 500 });
  }

  if (!customersData || customersData.length === 0) {
    return NextResponse.json({ customers: [] });
  }

  const customerIds = customersData.map((c) => c.id);

  // Fetch claims with deal info for savings calculation
  const { data: claimsData } = await serviceClient
    .from('claims')
    .select('customer_id, redeemed, deal:deals(original_price, deal_price)')
    .in('customer_id', customerIds);

  // Build stats map
  const statsMap: Record<string, { total_claims: number; total_redeemed: number; total_saved: number }> = {};

  (claimsData || []).forEach((claim: Record<string, unknown>) => {
    const customerId = claim.customer_id as string;
    const redeemed = claim.redeemed as boolean;
    const dealRaw = claim.deal as { original_price: number; deal_price: number } | { original_price: number; deal_price: number }[] | null;
    const deal = Array.isArray(dealRaw) ? dealRaw[0] : dealRaw;

    if (!statsMap[customerId]) {
      statsMap[customerId] = { total_claims: 0, total_redeemed: 0, total_saved: 0 };
    }
    statsMap[customerId].total_claims += 1;
    if (redeemed) {
      statsMap[customerId].total_redeemed += 1;
      if (deal) {
        statsMap[customerId].total_saved += (deal.original_price - deal.deal_price);
      }
    }
  });

  // Enrich customers with stats
  const customers = customersData.map((c) => ({
    ...c,
    total_claims: statsMap[c.id]?.total_claims || 0,
    total_redeemed: statsMap[c.id]?.total_redeemed || 0,
    total_saved: statsMap[c.id]?.total_saved || 0,
  }));

  return NextResponse.json({ customers });
}
