import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/social/crypto';

/**
 * POST /api/vendor/google-calendar/disconnect
 * Disconnects Google Calendar and revokes token.
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceRoleClient();

  // Get current token to revoke
  const { data: gcal } = await serviceClient
    .from('vendor_google_calendar')
    .select('access_token_encrypted')
    .eq('vendor_id', user.id)
    .single();

  if (gcal) {
    // Revoke token (best effort)
    try {
      const token = decrypt(gcal.access_token_encrypted);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch {}

    // Delete record
    await serviceClient
      .from('vendor_google_calendar')
      .delete()
      .eq('vendor_id', user.id);
  }

  return NextResponse.json({ success: true });
}
