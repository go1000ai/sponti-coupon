import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval === 'function') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now > entry.resetAt) store.delete(key);
    });
  }, 5 * 60 * 1000);
}

function rateLimitKey(request: NextRequest, identifier?: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  return `${identifier || request.nextUrl.pathname}:${ip}`;
}

function tooManyResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSec) },
    }
  );
}

/**
 * In-memory rate limiter (per-instance only).
 *
 * On Vercel/serverless this is a SOFT limit — different instances have separate Maps, so a
 * determined attacker can scatter requests across instances and bypass it. Acceptable for
 * AI/cost-protection endpoints where a 2-3x over-limit is fine. For security-critical
 * endpoints (login, password reset, public PII lookups), use {@link rateLimitDb} instead.
 */
export function rateLimit(
  request: NextRequest,
  { maxRequests, windowMs, identifier }: { maxRequests: number; windowMs: number; identifier?: string }
): NextResponse | null {
  const key = rateLimitKey(request, identifier);
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return tooManyResponse(Math.ceil((entry.resetAt - now) / 1000));
  }

  return null;
}

/**
 * Cross-instance rate limiter backed by Postgres (migration 061_rate_limit_buckets.sql).
 *
 * Use for security-critical endpoints where the limit MUST hold regardless of which serverless
 * instance handles the request. Costs one DB round trip. If the DB call fails for any reason,
 * we fail OPEN (allow the request) so a Supabase outage doesn't lock everyone out — log only.
 */
export async function rateLimitDb(
  request: NextRequest,
  { maxRequests, windowMs, identifier }: { maxRequests: number; windowMs: number; identifier?: string }
): Promise<NextResponse | null> {
  const key = rateLimitKey(request, identifier);
  try {
    const sb = await createServiceRoleClient();
    const { data, error } = await sb.rpc('rl_increment', { p_key: key, p_window_ms: windowMs });
    if (error) {
      console.error('[rateLimitDb] rl_increment error, failing open:', error.message);
      return null;
    }
    const count = Number(data) || 0;
    if (count > maxRequests) {
      return tooManyResponse(Math.ceil(windowMs / 1000));
    }
    return null;
  } catch (err) {
    console.error('[rateLimitDb] unexpected error, failing open:', err);
    return null;
  }
}
