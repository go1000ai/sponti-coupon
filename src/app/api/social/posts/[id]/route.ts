import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/social/crypto';

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * DELETE /api/social/posts/[id]
 * Deletes a social post from the platform (Facebook/Instagram) and removes the DB record.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();

  // Fetch the post
  const { data: post, error: fetchError } = await serviceClient
    .from('social_posts')
    .select('id, deal_id, platform, platform_post_id, status, account_type')
    .eq('id', postId)
    .single();

  if (fetchError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Verify the post belongs to this vendor's deals
  const { data: deal } = await serviceClient
    .from('deals')
    .select('vendor_id')
    .eq('id', post.deal_id)
    .single();

  if (!deal || deal.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // If the post was published to a platform, try to delete it there
  let platformDeleted = false;
  if (post.status === 'posted' && post.platform_post_id && (post.platform === 'facebook' || post.platform === 'instagram')) {
    try {
      // Find the connection to get the access token
      const vendorId = post.account_type === 'brand' ? null : user.id;

      const query = serviceClient
        .from('social_connections')
        .select('access_token')
        .eq('platform', post.platform)
        .eq('is_active', true);

      if (vendorId) {
        query.eq('vendor_id', vendorId);
      } else {
        query.eq('is_brand_account', true);
      }

      const { data: connection } = await query.limit(1).single();

      if (connection?.access_token) {
        const accessToken = decrypt(connection.access_token);

        // Facebook and Instagram both support DELETE /{post-id}
        const deleteRes = await fetch(
          `${META_GRAPH_URL}/${post.platform_post_id}?access_token=${accessToken}`,
          { method: 'DELETE' }
        );
        const deleteData = await deleteRes.json();
        platformDeleted = deleteData.success === true;
      }
    } catch (err) {
      console.error(`[Social Delete] Failed to delete ${post.platform} post ${post.platform_post_id}:`, err);
      // Continue to delete from DB even if platform delete fails
    }
  }

  // Delete from database
  const { error: deleteError } = await serviceClient
    .from('social_posts')
    .delete()
    .eq('id', postId);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete post record' }, { status: 500 });
  }

  return NextResponse.json({
    deleted: true,
    platformDeleted,
  });
}
