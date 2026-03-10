import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/paypal/connect/status
// Returns the vendor's PayPal connection status
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('paypal_connect_merchant_id, paypal_connect_onboarding_complete, paypal_connect_charges_enabled')
    .eq('id', user.id)
    .single();

  if (!vendor?.paypal_connect_merchant_id) {
    return NextResponse.json({
      connected: false,
      merchant_id: null,
      onboarding_complete: false,
      charges_enabled: false,
    });
  }

  return NextResponse.json({
    connected: true,
    merchant_id: vendor.paypal_connect_merchant_id,
    onboarding_complete: vendor.paypal_connect_onboarding_complete,
    charges_enabled: vendor.paypal_connect_charges_enabled,
  });
}
