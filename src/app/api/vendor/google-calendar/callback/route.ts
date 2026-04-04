import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/social/crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * GET /api/vendor/google-calendar/callback
 * Handles OAuth callback from Google.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();
  const settingsUrl = `${appUrl}/vendor/settings`;

  if (errorParam || !code || !stateParam) {
    return NextResponse.redirect(`${settingsUrl}?gcal_error=auth_failed`);
  }

  // Decode state
  let state: { userId: string };
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
  } catch {
    return NextResponse.redirect(`${settingsUrl}?gcal_error=invalid_state`);
  }

  const redirectUri = `${appUrl}/api/vendor/google-calendar/callback`;

  // Exchange code for tokens
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Google token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${settingsUrl}?gcal_error=token_exchange_failed`);
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token || !refresh_token) {
      return NextResponse.redirect(`${settingsUrl}?gcal_error=missing_tokens`);
    }

    // Get Google email
    let googleEmail = '';
    try {
      const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        googleEmail = userInfo.email || '';
      }
    } catch {}

    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    // Store tokens
    const supabase = await createServiceRoleClient();
    const { error: upsertError } = await supabase
      .from('vendor_google_calendar')
      .upsert({
        vendor_id: state.userId,
        google_email: googleEmail,
        access_token_encrypted: encrypt(access_token),
        refresh_token_encrypted: encrypt(refresh_token),
        token_expires_at: expiresAt,
        calendar_id: 'primary',
        connected_at: new Date().toISOString(),
      }, { onConflict: 'vendor_id' });

    if (upsertError) {
      console.error('Failed to store Google Calendar tokens:', upsertError);
      return NextResponse.redirect(`${settingsUrl}?gcal_error=storage_failed`);
    }

    return NextResponse.redirect(`${settingsUrl}?gcal_connected=true`);
  } catch (err) {
    console.error('Google Calendar callback error:', err);
    return NextResponse.redirect(`${settingsUrl}?gcal_error=unexpected`);
  }
}
