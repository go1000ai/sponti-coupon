import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SQUARE_BASE_URL = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

// GET /api/square/connect/authorize
// Redirects vendor to Square OAuth authorization page
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login?redirect=/vendor/payments', request.url));
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!vendor) {
    return NextResponse.redirect(new URL('/vendor/payments?connect_error=not_vendor', request.url));
  }

  const clientId = process.env.SQUARE_APP_ID;
  if (!clientId) {
    console.error('[Square Connect] SQUARE_APP_ID not configured');
    return NextResponse.redirect(new URL('/vendor/payments?connect_error=not_configured', request.url));
  }

  const scopes = [
    'PAYMENTS_WRITE',
    'PAYMENTS_READ',
    'ORDERS_WRITE',
    'ORDERS_READ',
    'MERCHANT_PROFILE_READ',
    'ONLINE_STORE_SITE_READ',
  ].join('+');

  const authorizeUrl = `${SQUARE_BASE_URL}/oauth2/authorize?client_id=${clientId}&scope=${scopes}&session=false&state=${user.id}`;

  return NextResponse.redirect(authorizeUrl);
}
