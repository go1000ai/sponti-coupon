import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyPin, isValidPin } from '@/lib/redeem-members/pin';

/**
 * POST /api/vendor/redeem-members/verify  { member_id, pin }
 * Verifies a staff PIN within the vendor's own session (the kiosk device).
 * Returns the member's name on success so the kiosk can attribute redemptions.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { member_id, pin } = await request.json();
  if (!member_id || !isValidPin(pin)) {
    return NextResponse.json({ ok: false, error: 'Invalid PIN.' }, { status: 400 });
  }

  // Read the hash with the service role; ensure the member belongs to THIS vendor.
  const service = await createServiceRoleClient();
  const { data: member } = await service
    .from('redeem_members')
    .select('id, name, pin_hash, active, vendor_id')
    .eq('id', member_id)
    .eq('vendor_id', user.id)
    .single();

  if (!member || !member.active) {
    return NextResponse.json({ ok: false, error: 'Member not found.' }, { status: 404 });
  }

  if (!verifyPin(pin, member.pin_hash)) {
    return NextResponse.json({ ok: false, error: 'Incorrect PIN.' }, { status: 401 });
  }

  await service.from('redeem_members').update({ last_used_at: new Date().toISOString() }).eq('id', member.id);

  return NextResponse.json({ ok: true, member: { id: member.id, name: member.name } });
}
