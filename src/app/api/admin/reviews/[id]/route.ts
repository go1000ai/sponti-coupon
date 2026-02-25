import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PUT /api/admin/reviews/[id]
 * Update a review: edit the vendor reply text, toggle verified status.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const { id } = await params;
    const serviceClient = await createServiceRoleClient();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Build update object from allowed fields
    const updateData: Record<string, unknown> = {};

    if ('vendor_reply' in body) {
      updateData.vendor_reply = body.vendor_reply || null;
    }

    if ('is_verified' in body) {
      updateData.is_verified = Boolean(body.is_verified);
    }

    if ('comment' in body) {
      updateData.comment = body.comment || null;
    }

    if ('rating' in body) {
      const rating = Number(body.rating);
      if (rating >= 1 && rating <= 5) {
        updateData.rating = rating;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: review, error } = await serviceClient
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[PUT /api/admin/reviews] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error('[PUT /api/admin/reviews] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/reviews/[id]
 * Permanently delete a review.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const { id } = await params;
    const serviceClient = await createServiceRoleClient();

    const { error } = await serviceClient
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DELETE /api/admin/reviews] Delete error:', error);
      return NextResponse.json({ error: `Failed to delete review: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/reviews] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
