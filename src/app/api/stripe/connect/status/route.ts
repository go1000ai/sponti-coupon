import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/stripe/connect/status
// Returns vendor's Stripe Connect status
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('stripe_connect_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled')
    .eq('id', user.id)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  return NextResponse.json({
    connected: !!vendor.stripe_connect_account_id,
    account_id: vendor.stripe_connect_account_id,
    onboarding_complete: vendor.stripe_connect_onboarding_complete,
    charges_enabled: vendor.stripe_connect_charges_enabled,
  });
}
