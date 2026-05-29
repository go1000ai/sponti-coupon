import { NextRequest, NextResponse } from 'next/server';
import { postDealToSocial } from '@/lib/social/post-manager';

// This endpoint runs on Node.js runtime (NOT edge) because it needs
// Node.js crypto for token encryption/decryption
// Do NOT add: export const runtime = 'edge';

/**
 * POST /api/social/auto-post
 * Internal fire-and-forget endpoint called after deal creation.
 * Posts the new deal to all connected social media accounts.
 */
export async function POST(request: NextRequest) {
  // Validate internal call via shared secret. Log loudly if the secret is missing in env —
  // otherwise auto-posting silently fails for every deal and nobody notices.
  const secret = request.headers.get('x-social-post-secret');
  const expectedSecret = process.env.SOCIAL_POST_INTERNAL_SECRET;

  if (!expectedSecret) {
    console.error('[Social Auto-Post] SOCIAL_POST_INTERNAL_SECRET is not configured — auto-posting is disabled. Set this env var.');
    return NextResponse.json({ error: 'Auto-posting not configured', code: 'NO_INTERNAL_SECRET' }, { status: 500 });
  }
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { deal_id, vendor_id, custom_captions, post_ids } = body;

    if (!deal_id || !vendor_id) {
      return NextResponse.json({ error: 'Missing deal_id or vendor_id' }, { status: 400 });
    }

    // Phase 1: brand-only. All deal posts go to @sponticoupon's own FB/IG, NOT to any
    // per-vendor connections. Vendors no longer connect their own accounts directly via
    // Meta OAuth (admin-only). When we later route to vendor accounts via GHL, this lock
    // can be lifted on a per-vendor basis.
    await postDealToSocial(deal_id, vendor_id, {
      customCaptions: custom_captions,
      postIds: post_ids,
      brandOnly: true,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Social Auto-Post] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Social posting failed', detail: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
