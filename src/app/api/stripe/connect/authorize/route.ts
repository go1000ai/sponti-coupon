import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

// GET /api/stripe/connect/authorize
// Creates a Stripe Standard account (or reuses existing) and redirects vendor to onboarding
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login?redirect=/vendor/payments', request.url));
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('email, business_name, stripe_connect_account_id')
    .eq('id', user.id)
    .single();

  if (!vendor) {
    return NextResponse.redirect(new URL('/vendor/payments?connect_error=not_vendor', request.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const stripe = getStripe();

  try {
    let accountId = vendor.stripe_connect_account_id;

    // If vendor doesn't have a connected account yet, create one
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
        email: vendor.email || undefined,
        business_profile: {
          name: vendor.business_name || undefined,
        },
      });
      accountId = account.id;

      // Store the account ID immediately
      await supabase
        .from('vendors')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', user.id);
    }

    // Create an Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/api/stripe/connect/authorize`,
      return_url: `${appUrl}/api/stripe/connect/callback?account_id=${accountId}&vendor_id=${user.id}`,
      type: 'account_onboarding',
    });

    return NextResponse.redirect(accountLink.url);
  } catch (error) {
    console.error('[Stripe Connect] Account Link error:', error);
    return NextResponse.redirect(
      new URL('/vendor/payments?connect_error=link_creation_failed', request.url)
    );
  }
}
