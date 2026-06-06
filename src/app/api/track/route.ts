import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

// Cap field lengths so the public, unauthenticated analytics insert can't be
// used to flood the table with oversized rows.
const cap = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null;

export async function POST(request: NextRequest) {
  // Public beacon — soft per-IP cap to limit table-flooding abuse.
  const limited = rateLimit(request, { maxRequests: 120, windowMs: 60 * 1000, identifier: 'track' });
  if (limited) return limited;

  try {
    const { path, referrer, session_id } = await request.json();

    if (!path || typeof path !== 'string' || path.length > 2048) {
      return new NextResponse(null, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || null;

    // Extract source from referrer domain or UTM
    let source: string | null = null;
    if (referrer && typeof referrer === 'string') {
      try {
        const url = new URL(referrer);
        // Skip self-referrals
        if (!url.hostname.includes('sponticoupon.com')) {
          source = url.hostname.replace('www.', '');
        }
      } catch {
        // Invalid URL, skip
      }
    }

    // Check for UTM source in the path
    if (!source && path.includes('utm_source=')) {
      try {
        const params = new URLSearchParams(path.split('?')[1]);
        source = params.get('utm_source');
      } catch {
        // Ignore parse errors
      }
    }

    const supabase = await createServiceRoleClient();
    await supabase.from('page_views').insert({
      path: path.split('?')[0].slice(0, 2048), // Store clean path without query params
      referrer: cap(referrer, 2048),
      source: cap(source, 255),
      user_agent: cap(userAgent, 512),
      session_id: cap(session_id, 128),
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
