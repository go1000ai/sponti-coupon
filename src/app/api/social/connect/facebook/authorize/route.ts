import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

const META_OAUTH_URL = 'https://www.facebook.com/v21.0/dialog/oauth';

/**
 * GET /api/social/connect/facebook/authorize
 * Redirects vendor (or admin for brand) to Meta OAuth to connect Facebook Page.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isBrand = request.nextUrl.searchParams.get('brand') === 'true';
  const errorRedirect = isBrand ? '/admin?tab=social' : '/vendor/social';
  const sep = isBrand ? '&' : '?';

  if (!user) {
    return NextResponse.redirect(new URL(`/auth/login?redirect=${encodeURIComponent(errorRedirect)}`, request.url));
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (isBrand && profile?.role !== 'admin') {
    return NextResponse.redirect(new URL(`${errorRedirect}${sep}social_error=not_admin`, request.url));
  }

  if (!isBrand && profile?.role !== 'vendor' && profile?.role !== 'admin') {
    return NextResponse.redirect(new URL(`${errorRedirect}${sep}social_error=not_vendor`, request.url));
  }

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.redirect(new URL(`${errorRedirect}${sep}social_error=not_configured`, request.url));
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();
  const callbackUrl = `${appUrl}/api/social/connect/facebook/callback`;

  // Generate CSRF state token
  const state = JSON.stringify({
    csrf: randomBytes(16).toString('hex'),
    userId: user.id,
    isBrand,
  });
  const encodedState = Buffer.from(state).toString('base64url');

  // Facebook Login for Business uses config_id instead of individual scopes
  const configId = process.env.META_LOGIN_CONFIG_ID;

  const authUrl = configId
    ? `${META_OAUTH_URL}?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&config_id=${configId}&state=${encodedState}&response_type=code`
    : `${META_OAUTH_URL}?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent('pages_manage_posts,pages_read_engagement,pages_show_list,business_management')}&auth_type=rerequest&state=${encodedState}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
