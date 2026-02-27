import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/stripe/connect/authorize
// Generates a Stripe Connect OAuth link and redirects the vendor
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login?redirect=/vendor/payments', request.url));
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('email, business_name')
    .eq('id', user.id)
    .single();

  if (!vendor) {
    return NextResponse.redirect(new URL('/vendor/payments?connect_error=not_vendor', request.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
    scope: 'read_write',
    redirect_uri: `${appUrl}/api/stripe/connect/callback`,
    state: user.id,
    'stripe_user[email]': vendor.email || '',
    'stripe_user[business_name]': vendor.business_name || '',
    'stripe_user[business_type]': 'company',
  });

  return NextResponse.redirect(`https://connect.stripe.com/oauth/authorize?${params}`);
}
