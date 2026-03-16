import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

// GET /api/stripe/connect/status
// Returns vendor's Stripe Connect status (with live Stripe API fallback)
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

  let onboardingComplete = vendor.stripe_connect_onboarding_complete;
  let chargesEnabled = vendor.stripe_connect_charges_enabled;

  // If vendor has an account but charges aren't enabled yet, check Stripe live
  // This catches cases where the webhook was missed
  if (vendor.stripe_connect_account_id && !chargesEnabled) {
    try {
      const account = await getStripe().accounts.retrieve(vendor.stripe_connect_account_id);
      onboardingComplete = account.details_submitted || false;
      chargesEnabled = account.charges_enabled || false;

      // Sync back to DB if Stripe says charges are now enabled
      if (chargesEnabled !== vendor.stripe_connect_charges_enabled || onboardingComplete !== vendor.stripe_connect_onboarding_complete) {
        const serviceClient = await createServiceRoleClient();
        await serviceClient
          .from('vendors')
          .update({
            stripe_connect_onboarding_complete: onboardingComplete,
            stripe_connect_charges_enabled: chargesEnabled,
          })
          .eq('id', user.id);
      }
    } catch {
      // Fall back to DB values if Stripe API fails
    }
  }

  return NextResponse.json({
    connected: !!vendor.stripe_connect_account_id,
    account_id: vendor.stripe_connect_account_id,
    onboarding_complete: onboardingComplete,
    charges_enabled: chargesEnabled,
  });
}
