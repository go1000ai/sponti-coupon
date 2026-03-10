import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/square/connect/status
// Returns vendor's Square Connect status
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('square_connect_merchant_id, square_connect_location_id, square_connect_onboarding_complete, square_connect_charges_enabled')
    .eq('id', user.id)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  return NextResponse.json({
    connected: !!vendor.square_connect_merchant_id,
    merchant_id: vendor.square_connect_merchant_id,
    location_id: vendor.square_connect_location_id,
    onboarding_complete: vendor.square_connect_onboarding_complete,
    charges_enabled: vendor.square_connect_charges_enabled,
  });
}
