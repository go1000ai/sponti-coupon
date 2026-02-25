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
        customer_id,
        qr_code,
        qr_code_url,
        redemption_code,
        session_token,
        customer:customers(first_name, last_name, email),
        deal:deals(title, deal_type, claims_count, vendor:vendors(business_name))
      `)
      .order('created_at', { ascending: false });

    // Fetch all redemption records to map who redeemed each claim
    const { data: redemptions } = await serviceClient
      .from('redemptions')
      .select('claim_id, scanned_by, scanned_at, vendor_id');

    // Get unique vendor IDs from redemptions to look up business names
    const vendorIds = Array.from(new Set((redemptions || []).map((r: Record<string, unknown>) => r.vendor_id as string).filter(Boolean)));
    const vendorNameMap: Record<string, string> = {};
    if (vendorIds.length > 0) {
      const { data: vendorRows } = await serviceClient
        .from('vendors')
        .select('id, business_name')
        .in('id', vendorIds);
      (vendorRows || []).forEach((v: { id: string; business_name: string }) => {
        vendorNameMap[v.id] = v.business_name;
      });
    }

    // Also look up scanned_by user profiles (the person who actually scanned)
    const scannerIds = Array.from(new Set((redemptions || []).map((r: Record<string, unknown>) => r.scanned_by as string).filter(Boolean)));
    const scannerNameMap: Record<string, string> = {};
    if (scannerIds.length > 0) {
      const { data: profileRows } = await serviceClient
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', scannerIds);
      (profileRows || []).forEach((p: { id: string; full_name: string | null; email: string | null }) => {
        scannerNameMap[p.id] = p.full_name || p.email || 'Unknown';
      });
    }

    // Build lookup: claim_id -> redemption info
    const redemptionMap: Record<string, { scanned_by: string; scanned_by_name: string; scanned_at: string; vendor_name: string }> = {};
    (redemptions || []).forEach((r: Record<string, unknown>) => {
      redemptionMap[r.claim_id as string] = {
        scanned_by: r.scanned_by as string,
        scanned_by_name: scannerNameMap[r.scanned_by as string] || 'Unknown',
        scanned_at: r.scanned_at as string,
        vendor_name: vendorNameMap[r.vendor_id as string] || 'Unknown',
      };
    });

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
      customer_id: string;
      customer_name: string;
      customer_email: string | null;
      deal_title: string;
      deal_type: string;
      deal_id: string;
      vendor_name: string;
      status: ClaimStatus;
      deposit_confirmed: boolean;
      created_at: string;
      redeemed_at: string | null;
      expires_at: string;
      qr_code: string | null;
      qr_code_url: string | null;
      redemption_code: string | null;
      session_token: string | null;
      redeemed_by_vendor: string | null;
      redeemed_by_name: string | null;
      redeemed_by_id: string | null;
      scanned_at: string | null;
    }

    const allClaims: ClaimRow[] = rawClaims.map((claim: Record<string, unknown>) => {
      const customer = claim.customer as { first_name: string | null; last_name: string | null; email: string | null } | null;
      const deal = claim.deal as { title: string; deal_type: string; claims_count: number; vendor: { business_name: string } | null } | null;

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

      const redemption = redemptionMap[claim.id as string] || null;

      return {
        id: claim.id as string,
        customer_id: claim.customer_id as string,
        customer_name: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Unknown',
        customer_email: customer?.email || null,
        deal_title: deal?.title || 'Unknown Deal',
        deal_type: deal?.deal_type || 'regular',
        deal_id: claim.deal_id as string,
        vendor_name: deal?.vendor?.business_name || 'Unknown Vendor',
        status: claimStatus,
        deposit_confirmed: claim.deposit_confirmed as boolean,
        created_at: claim.created_at as string,
        redeemed_at: claim.redeemed_at as string | null,
        expires_at: claim.expires_at as string,
        qr_code: claim.qr_code as string | null,
        qr_code_url: claim.qr_code_url as string | null,
        redemption_code: claim.redemption_code as string | null,
        session_token: claim.session_token as string | null,
        redeemed_by_vendor: redemption?.vendor_name || null,
        redeemed_by_name: redemption?.scanned_by_name || null,
        redeemed_by_id: redemption?.scanned_by || null,
        scanned_at: redemption?.scanned_at || null,
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
