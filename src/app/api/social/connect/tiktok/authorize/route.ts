import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';

/**
 * GET /api/social/connect/tiktok/authorize
 * Redirects vendor to TikTok OAuth to connect their account.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login?redirect=/vendor/settings', request.url));
  }

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
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'vendor') {
      return NextResponse.redirect(new URL('/vendor/settings?social_error=not_vendor', request.url));
    }
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.redirect(new URL('/vendor/settings?social_error=not_configured', request.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const callbackUrl = `${appUrl}/api/social/connect/tiktok/callback`;

  const state = JSON.stringify({
    csrf: randomBytes(16).toString('hex'),
    userId: user.id,
    isBrand,
  });
  const encodedState = Buffer.from(state).toString('base64url');

  const scopes = 'user.info.basic,video.publish';

  const authUrl = `${TIKTOK_AUTH_URL}?client_key=${clientKey}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scopes)}&state=${encodedState}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
