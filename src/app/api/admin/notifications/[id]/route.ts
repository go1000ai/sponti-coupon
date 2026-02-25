import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * DELETE /api/admin/notifications/[id]
 * Permanently delete a single notification.
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
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DELETE /api/admin/notifications] Delete error:', error);
      return NextResponse.json({ error: `Failed to delete notification: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/notifications] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
