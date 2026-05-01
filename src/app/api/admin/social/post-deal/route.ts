import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { postDealToSocial } from '@/lib/social/post-manager';

/**
 * POST /api/admin/social/post-deal
 * Body: { dealId: string }
 * Manually triggers a brand-only post for the given deal. Used by admins to
 * push older deals or re-post deals that were missed by the auto-post webhook.
 *
 * Node runtime — postDealToSocial decrypts tokens and calls Meta APIs.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  let body: { dealId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const dealId = body.dealId?.trim();
  if (!dealId) {
    return NextResponse.json({ error: 'dealId required' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const { data: deal } = await supabase
    .from('deals')
    .select('id, vendor_id')
    .eq('id', dealId)
    .single();

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  await postDealToSocial(deal.id, deal.vendor_id, { brandOnly: true });

  return NextResponse.json({ success: true });
}
