import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/claims
 * Paginated list of claims with customer name, deal title, vendor name.
 * Supports: page, pageSize, search, status query params.
 * Returns { claims: [...], total, page, pageSize }.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const status = searchParams.get('status') || 'all';

    // Fetch all claims with joined customer, deal, vendor data
    const { data: rawClaims, error: claimsError } = await serviceClient
      .from('claims')
      .select(`
        id,
        deposit_confirmed,
        redeemed,
        redeemed_at,
        expires_at,
        created_at,
        deal_id,
        customer:customers(first_name, last_name),
        deal:deals(title, claims_count, vendor:vendors(business_name))
      `)
      .order('created_at', { ascending: false });

    if (claimsError) {
      console.error('[GET /api/admin/claims] Query error:', claimsError);
      return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
    }

    if (!rawClaims || rawClaims.length === 0) {
      return NextResponse.json({ claims: [], total: 0, page, pageSize });
    }

    const now = new Date();

    // Map raw data to typed rows with computed status
    type ClaimStatus = 'active' | 'redeemed' | 'expired' | 'pending';

    interface ClaimRow {
      id: string;
      customer_name: string;
      deal_title: string;
      deal_id: string;
      vendor_name: string;
      status: ClaimStatus;
      deposit_confirmed: boolean;
      created_at: string;
      redeemed_at: string | null;
      expires_at: string;
    }

    const allClaims: ClaimRow[] = rawClaims.map((claim: Record<string, unknown>) => {
      const customer = claim.customer as { first_name: string | null; last_name: string | null } | null;
      const deal = claim.deal as { title: string; claims_count: number; vendor: { business_name: string } | null } | null;

      let claimStatus: ClaimStatus;
      if (claim.redeemed) {
        claimStatus = 'redeemed';
      } else if (!claim.deposit_confirmed) {
        claimStatus = 'pending';
      } else if (new Date(claim.expires_at as string) < now) {
        claimStatus = 'expired';
      } else {
        claimStatus = 'active';
      }

      return {
        id: claim.id as string,
        customer_name: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Unknown',
        deal_title: deal?.title || 'Unknown Deal',
        deal_id: claim.deal_id as string,
        vendor_name: deal?.vendor?.business_name || 'Unknown Vendor',
        status: claimStatus,
        deposit_confirmed: claim.deposit_confirmed as boolean,
        created_at: claim.created_at as string,
        redeemed_at: claim.redeemed_at as string | null,
        expires_at: claim.expires_at as string,
      };
    });

    // Apply status filter
    let filtered = allClaims;
    if (status !== 'all') {
      filtered = filtered.filter((c) => c.status === status);
    }

    // Apply search filter (customer name, deal title, vendor name)
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(search) ||
          c.deal_title.toLowerCase().includes(search) ||
          c.vendor_name.toLowerCase().includes(search)
      );
    }

    const total = filtered.length;

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const paginatedClaims = filtered.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      claims: paginatedClaims,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[GET /api/admin/claims] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
