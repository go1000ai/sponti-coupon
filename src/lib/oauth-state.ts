import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * Shared CSRF protection for OAuth authorize/callback flows.
 *
 * THREAT: Without this, the `state` param is attacker-forgeable, so an attacker
 * could (a) bind their own provider account to a victim's vendor, or (b) trick a
 * logged-in victim into completing an attacker-initiated flow.
 *
 * DEFENSE (use BOTH):
 *  1. Nonce cookie — `generateOAuthNonce()` in authorize, put the nonce inside
 *     `state`, and `setOAuthNonceCookie()` on the redirect response. In the
 *     callback, `verifyOAuthNonce()` against the cookie. An attacker cannot set
 *     this HttpOnly cookie in the victim's browser.
 *  2. Session-derived identity — the callback MUST derive the vendor/user id from
 *     the authenticated Supabase session (`auth.getUser()`), NEVER from `state`.
 *     This is what actually prevents acting on behalf of another user.
 */

const COOKIE_PREFIX = 'oauth_nonce_';
// 1 hour — generous enough for slow flows like Stripe/Square Connect KYC
// onboarding, while still a short-lived, single-use, browser-bound CSRF token.
const MAX_AGE_SEC = 3600;

function cookieName(provider: string): string {
  return `${COOKIE_PREFIX}${provider}`;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

/** Generate a random CSRF nonce. Call once in the authorize route. */
export function generateOAuthNonce(): string {
  return randomBytes(16).toString('hex');
}

/** Set the HttpOnly nonce cookie on the redirect response (authorize route). */
export function setOAuthNonceCookie(res: NextResponse, provider: string, nonce: string): NextResponse {
  res.cookies.set(cookieName(provider), nonce, cookieOptions(MAX_AGE_SEC));
  return res;
}

/** Clear the nonce cookie (single-use). Call on the callback's response. */
export function clearOAuthNonceCookie(res: NextResponse, provider: string): NextResponse {
  res.cookies.set(cookieName(provider), '', cookieOptions(0));
  return res;
}

/**
 * Constant-time compare the nonce carried in `state` against the cookie.
 * Returns true only when both exist and match.
 */
export function verifyOAuthNonce(
  request: NextRequest,
  provider: string,
  stateNonce: string | undefined | null,
): boolean {
  const cookie = request.cookies.get(cookieName(provider))?.value;
  if (!cookie || !stateNonce) return false;
  const a = Buffer.from(cookie);
  const b = Buffer.from(stateNonce);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Base64url-encode a state payload (include a `nonce` field). */
export function encodeOAuthState(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/** Decode a base64url state param; returns null on tamper/parse failure. */
export function decodeOAuthState<T = Record<string, unknown>>(stateParam: string | null): T | null {
  if (!stateParam) return null;
  try {
    return JSON.parse(Buffer.from(stateParam, 'base64url').toString()) as T;
  } catch {
    return null;
  }
}
