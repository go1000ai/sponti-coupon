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

  let body: { dealId?: string; platforms?: string[]; captions?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const dealId = body.dealId?.trim();
  if (!dealId) {
    return NextResponse.json({ error: 'dealId required' }, { status: 400 });
  }

  const platforms = Array.isArray(body.platforms) && body.platforms.length > 0
    ? body.platforms.map(String)
    : undefined;

  // Optional admin-edited captions per platform — passed through to postDealToSocial
  const customCaptions = body.captions && typeof body.captions === 'object'
    ? Object.fromEntries(
        Object.entries(body.captions).filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
      ) as Record<string, string>
    : undefined;

  const supabase = await createServiceRoleClient();
  const { data: deal } = await supabase
    .from('deals')
    .select('id, vendor_id')
    .eq('id', dealId)
    .single();

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  await postDealToSocial(deal.id, deal.vendor_id, {
    brandOnly: true,
    platforms,
    ...(customCaptions ? { customCaptions } : {}),
  });

  return NextResponse.json({ success: true });
}
