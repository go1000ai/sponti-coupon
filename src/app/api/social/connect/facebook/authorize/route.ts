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

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login?redirect=/vendor/settings', request.url));
  }

  // Check if this is a brand account connection (admin only)
  const isBrand = request.nextUrl.searchParams.get('brand') === 'true';

  if (isBrand) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/vendor/settings?social_error=not_admin', request.url));
    }
  } else {
    // Verify vendor role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'vendor') {
      return NextResponse.redirect(new URL('/vendor/settings?social_error=not_vendor', request.url));
    }
  }

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.redirect(new URL('/vendor/settings?social_error=not_configured', request.url));
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

  const scopes = 'pages_manage_posts,pages_read_engagement,pages_show_list';

  const authUrl = `${META_OAUTH_URL}?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scopes)}&state=${encodedState}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
