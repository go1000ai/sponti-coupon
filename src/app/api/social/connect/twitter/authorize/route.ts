import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { randomBytes, createHash } from 'crypto';

const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';

/**
 * GET /api/social/connect/twitter/authorize
 * Redirects vendor to X/Twitter OAuth 2.0 with PKCE.
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

  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/vendor/settings?social_error=not_configured', request.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const callbackUrl = `${appUrl}/api/social/connect/twitter/callback`;

  // PKCE: Generate code_verifier and code_challenge
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

  // State includes the code_verifier (stored temporarily)
  const state = JSON.stringify({
    csrf: randomBytes(16).toString('hex'),
    userId: user.id,
    isBrand,
    codeVerifier,
  });
  const encodedState = Buffer.from(state).toString('base64url');

  const scopes = 'tweet.write tweet.read users.read offline.access';

  const authUrl = `${TWITTER_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scopes)}&state=${encodedState}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  return NextResponse.redirect(authUrl);
}
