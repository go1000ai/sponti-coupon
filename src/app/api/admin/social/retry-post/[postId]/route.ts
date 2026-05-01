import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { postDealToSocial } from '@/lib/social/post-manager';

/**
 * POST /api/admin/social/retry-post/[postId]
 * Re-attempts a failed post by looking up the original deal and re-firing
 * the brand-only social post pipeline.
 *
 * Node runtime.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { postId } = await context.params;
  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const { data: post } = await supabase
    .from('social_posts')
    .select('id, deal_id, deals:deals(id, vendor_id)')
    .eq('id', postId)
    .single();

  if (!post || !post.deal_id) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const deal = Array.isArray(post.deals) ? post.deals[0] : post.deals;
  if (!deal?.vendor_id) {
    return NextResponse.json({ error: 'Deal missing for post' }, { status: 404 });
  }

  await postDealToSocial(deal.id, deal.vendor_id, { brandOnly: true });

  return NextResponse.json({ success: true });
}
