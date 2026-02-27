import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

// POST /api/stripe/connect/disconnect
// Revokes the OAuth connection
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('stripe_connect_account_id')
    .eq('id', user.id)
    .single();

  if (!vendor?.stripe_connect_account_id) {
    return NextResponse.json({ error: 'No Stripe Connect account linked' }, { status: 400 });
  }

  try {
    // Deauthorize the connected account
    await getStripe().oauth.deauthorize({
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
      stripe_user_id: vendor.stripe_connect_account_id,
    });
  } catch (error) {
    console.error('[Stripe Connect] Deauthorize error:', error);
    // Continue even if deauthorize fails — we still want to clean up our DB
  }

  // Clear vendor's Stripe Connect fields
  await supabase
    .from('vendors')
    .update({
      stripe_connect_account_id: null,
      stripe_connect_onboarding_complete: false,
      stripe_connect_charges_enabled: false,
    })
    .eq('id', user.id);

  // Deactivate the integrated Stripe payment method
  await supabase
    .from('vendor_payment_methods')
    .update({ is_active: false, is_primary: false })
    .eq('vendor_id', user.id)
    .eq('payment_tier', 'integrated')
    .eq('processor_type', 'stripe');

  // Promote next available method to primary
  const { data: nextMethod } = await supabase
    .from('vendor_payment_methods')
    .select('id')
    .eq('vendor_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextMethod) {
    await supabase
      .from('vendor_payment_methods')
      .update({ is_primary: true })
      .eq('id', nextMethod.id);
  }

  return NextResponse.json({ success: true });
}
