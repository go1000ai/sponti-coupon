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
  // Validate internal call via shared secret
  const secret = request.headers.get('x-social-post-secret');
  const expectedSecret = process.env.SOCIAL_POST_INTERNAL_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { deal_id, vendor_id } = body;

    if (!deal_id || !vendor_id) {
      return NextResponse.json({ error: 'Missing deal_id or vendor_id' }, { status: 400 });
    }

    // Run social posting — errors are caught internally and logged to social_posts table
    await postDealToSocial(deal_id, vendor_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Social Auto-Post] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Social posting failed', detail: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
