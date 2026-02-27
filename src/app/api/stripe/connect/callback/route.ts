import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/stripe/connect/callback?code=ac_xxx&state=vendor_uuid
// Completes the OAuth flow, stores the connected account ID
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // vendor_id
  const errorParam = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (errorParam) {
    return NextResponse.redirect(
      `${appUrl}/vendor/payments?connect_error=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/vendor/payments?connect_error=missing_params`
    );
  }

  try {
    // Exchange authorization code for connected account
    const response = await getStripe().oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const connectedAccountId = response.stripe_user_id;
    if (!connectedAccountId) {
      throw new Error('No stripe_user_id in OAuth response');
    }

    // Check if the account has charges enabled
    const account = await getStripe().accounts.retrieve(connectedAccountId);

    const supabase = await createServiceRoleClient();

    // Store the connected account on the vendor
    await supabase
      .from('vendors')
      .update({
        stripe_connect_account_id: connectedAccountId,
        stripe_connect_onboarding_complete: account.details_submitted || false,
        stripe_connect_charges_enabled: account.charges_enabled || false,
      })
      .eq('id', state);

    // Check if an integrated Stripe payment method already exists
    const { data: existing } = await supabase
      .from('vendor_payment_methods')
      .select('id')
      .eq('vendor_id', state)
      .eq('processor_type', 'stripe')
      .eq('payment_tier', 'integrated')
      .maybeSingle();

    if (!existing) {
      // Demote existing primary methods
      await supabase
        .from('vendor_payment_methods')
        .update({ is_primary: false })
        .eq('vendor_id', state)
        .eq('is_primary', true);

      // Create the integrated Stripe payment method as primary
      await supabase
        .from('vendor_payment_methods')
        .insert({
          vendor_id: state,
          processor_type: 'stripe',
          payment_link: `stripe_connect:${connectedAccountId}`,
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
          payment_link: `stripe_connect:${connectedAccountId}`,
          is_active: true,
        })
        .eq('id', existing.id);
    }

    return NextResponse.redirect(
      `${appUrl}/vendor/payments?connect_success=true`
    );
  } catch (error) {
    console.error('[Stripe Connect] OAuth error:', error);
    return NextResponse.redirect(
      `${appUrl}/vendor/payments?connect_error=oauth_failed`
    );
  }
}
