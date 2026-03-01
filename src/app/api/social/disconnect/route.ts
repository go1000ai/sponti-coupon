import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/social/disconnect
 * Deactivates a social connection.
 * Body: { connection_id: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { connection_id } = body;

  if (!connection_id) {
    return NextResponse.json({ error: 'connection_id is required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Fetch the connection to verify ownership
  const { data: connection } = await serviceClient
    .from('social_connections')
    .select('id, vendor_id, is_brand_account')
    .eq('id', connection_id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  // Verify the user owns this connection (or is admin for brand connections)
  if (connection.is_brand_account) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can disconnect brand accounts' }, { status: 403 });
    }
  } else if (connection.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Soft-delete: set is_active to false
  const { error: updateError } = await serviceClient
    .from('social_connections')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection_id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
