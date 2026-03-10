import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createPartnerReferral } from '@/lib/paypal';

// GET /api/paypal/connect/authorize
// Creates a PayPal partner referral and redirects vendor to PayPal onboarding
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login?redirect=/vendor/payments', request.url));
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, email, business_name')
    .eq('id', user.id)
    .single();

  if (!vendor) {
    return NextResponse.redirect(new URL('/vendor/payments?connect_error=not_vendor', request.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const returnUrl = `${appUrl}/api/paypal/connect/callback`;
    const actionUrl = await createPartnerReferral(vendor.id, returnUrl);
    return NextResponse.redirect(actionUrl);
  } catch (error) {
    console.error('[PayPal Connect] Partner referral error:', error);
    return NextResponse.redirect(
      new URL('/vendor/payments?connect_error=paypal_referral_failed', request.url)
    );
  }
}
