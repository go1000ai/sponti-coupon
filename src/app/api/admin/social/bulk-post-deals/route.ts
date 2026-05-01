import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { postDealToSocial } from '@/lib/social/post-manager';

/**
 * POST /api/admin/social/bulk-post-deals
 * Body: { dealIds: string[] }
 * Manually triggers brand-only posts for multiple deals in parallel.
 * Returns per-deal results so the UI can show partial successes.
 *
 * Node runtime — postDealToSocial decrypts tokens and calls Meta APIs.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  let body: { dealIds?: string[]; platforms?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const dealIds = Array.isArray(body.dealIds)
    ? body.dealIds.map(String).filter((id) => id.length > 0)
    : [];

  const platforms = Array.isArray(body.platforms) && body.platforms.length > 0
    ? body.platforms.map(String)
    : undefined;

  if (dealIds.length === 0) {
    return NextResponse.json({ error: 'dealIds must be a non-empty array' }, { status: 400 });
  }

  if (dealIds.length > 50) {
    return NextResponse.json({ error: 'Max 50 deals per bulk post' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const { data: deals } = await supabase
    .from('deals')
    .select('id, vendor_id')
    .in('id', dealIds);

  const dealRows = deals || [];

  // Run all deal posts in parallel; isolate errors per deal.
  const results = await Promise.allSettled(
    dealRows.map((d) =>
      postDealToSocial(d.id, d.vendor_id, { brandOnly: true, platforms })
        .then(() => ({ dealId: d.id, success: true as const }))
        .catch((err) => ({
          dealId: d.id,
          success: false as const,
          error: err instanceof Error ? err.message : 'Unknown error',
        }))
    )
  );

  // Note any deals from the original list that didn't match a row.
  const foundIds = new Set(dealRows.map((d) => d.id));
  const missing = dealIds.filter((id) => !foundIds.has(id));

  return NextResponse.json({
    requested: dealIds.length,
    posted: results.filter((r) => r.status === 'fulfilled' && r.value.success).length,
    failed: results.filter((r) => r.status === 'fulfilled' && !r.value.success).length,
    missing: missing.length,
    results: results.map((r) => (r.status === 'fulfilled' ? r.value : { success: false as const, error: 'rejected' })),
  });
}
