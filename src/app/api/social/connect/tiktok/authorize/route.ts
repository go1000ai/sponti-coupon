import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateOAuthNonce, setOAuthNonceCookie, encodeOAuthState } from '@/lib/oauth-state';

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';

/**
 * GET /api/social/connect/tiktok/authorize
 * Redirects vendor to TikTok OAuth to connect their account.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login?redirect=/admin?tab=social', request.url));
  }

  // Phase 1: brand-only. Admin-only OAuth that always creates a brand connection.
  const isBrand = true;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/vendor/social?social_error=admin_only', request.url));
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.redirect(new URL('/vendor/social?social_error=not_configured', request.url));
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();
  const callbackUrl = `${appUrl}/api/social/connect/tiktok/callback`;

  const nonce = generateOAuthNonce();
  const encodedState = encodeOAuthState({ userId: user.id, isBrand, nonce });

  const scopes = 'user.info.basic,video.upload';

  const authUrl = `${TIKTOK_AUTH_URL}?client_key=${clientKey}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scopes)}&state=${encodedState}&response_type=code`;

  const res = NextResponse.redirect(authUrl);
  setOAuthNonceCookie(res, 'tiktok', nonce);
  return res;
}
