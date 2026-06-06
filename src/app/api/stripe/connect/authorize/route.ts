import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { generateOAuthNonce, setOAuthNonceCookie } from '@/lib/oauth-state';

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

    // CSRF nonce — echoed in the return_url and set as an HttpOnly cookie.
    // The callback re-derives the vendor id from the session, not from the URL.
    const nonce = generateOAuthNonce();

    // Create an Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/api/stripe/connect/authorize`,
      return_url: `${appUrl}/api/stripe/connect/callback?account_id=${accountId}&nonce=${nonce}`,
      type: 'account_onboarding',
    });

    const res = NextResponse.redirect(accountLink.url);
    setOAuthNonceCookie(res, 'stripe', nonce);
    return res;
  } catch (error) {
    console.error('[Stripe Connect] Account Link error:', error);
    return NextResponse.redirect(
      new URL('/vendor/payments?connect_error=link_creation_failed', request.url)
    );
  }
}
