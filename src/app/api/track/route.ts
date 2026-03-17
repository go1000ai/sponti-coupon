import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { path, referrer, session_id } = await request.json();

    if (!path || typeof path !== 'string') {
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
      path: path.split('?')[0], // Store clean path without query params
      referrer: referrer || null,
      source,
      user_agent: userAgent,
      session_id: session_id || null,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
