import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/stripe/connect/callback?account_id=acct_xxx&vendor_id=xxx
// Called when vendor returns from Stripe onboarding
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('account_id');
  const vendorId = searchParams.get('vendor_id');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!accountId || !vendorId) {
    return NextResponse.redirect(
      `${appUrl}/vendor/payments?connect_error=missing_params`
    );
  }

  try {
    // Check the account status
    const account = await getStripe().accounts.retrieve(accountId);

    const supabase = await createServiceRoleClient();

    // Update vendor with latest account status
    await supabase
      .from('vendors')
      .update({
        stripe_connect_account_id: accountId,
        stripe_connect_onboarding_complete: account.details_submitted || false,
        stripe_connect_charges_enabled: account.charges_enabled || false,
      })
      .eq('id', vendorId);

    // If charges are enabled, set up the integrated payment method
    if (account.charges_enabled) {
      const { data: existing } = await supabase
        .from('vendor_payment_methods')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('processor_type', 'stripe')
        .eq('payment_tier', 'integrated')
        .maybeSingle();

      if (!existing) {
        // Demote existing primary methods
        await supabase
          .from('vendor_payment_methods')
          .update({ is_primary: false })
          .eq('vendor_id', vendorId)
          .eq('is_primary', true);

        // Create the integrated Stripe payment method as primary
        await supabase
          .from('vendor_payment_methods')
          .insert({
            vendor_id: vendorId,
            processor_type: 'stripe',
            payment_link: `stripe_connect:${accountId}`,
            display_name: 'Stripe (Integrated)',
            is_primary: true,
            is_active: true,
            payment_tier: 'integrated',
          });
      } else {
        // Update existing integrated method
        await supabase
          .from('vendor_payment_methods')
          .update({
            payment_link: `stripe_connect:${accountId}`,
            is_active: true,
          })
          .eq('id', existing.id);
      }
    }

    return NextResponse.redirect(
      `${appUrl}/vendor/payments?connect_success=true`
    );
  } catch (error) {
    console.error('[Stripe Connect] Callback error:', error);
    return NextResponse.redirect(
      `${appUrl}/vendor/payments?connect_error=callback_failed`
    );
  }
}
