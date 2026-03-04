import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Run on Vercel Edge Network — keeps YELP_API_KEY server-side, never exposed to browser.
export const runtime = 'edge';

const YELP_SEARCH_URL = 'https://api.yelp.com/v3/businesses/search';

/**
 * Edge-compatible admin verification.
 * Reads auth cookies directly from the incoming Request (no next/headers).
 */
async function verifyAdminEdge(request: NextRequest): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return false;

  // Use request cookies directly — Edge runtime does not support next/headers
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Read-only in this Edge handler; session refresh is handled by middleware
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Service role client — pure fetch, fully Edge-compatible
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

// GET /api/admin/leads/search
// Query params: ?category=Restaurants&location=Orlando, FL&offset=0&radius=10
export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdminEdge(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'YELP_API_KEY is not configured. Add it to .env.local.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category    = searchParams.get('category') || '';
  const location    = searchParams.get('location') || '';
  const offset      = parseInt(searchParams.get('offset') || '0', 10);
  const radiusMiles = parseFloat(searchParams.get('radius') || '0');

  if (!category || !location) {
    return NextResponse.json(
      { error: 'category and location are required' },
      { status: 400 }
    );
  }

  const yelpParams: Record<string, string> = {
    term:    category,
    location: location.trim(),
    limit:   '50',
    offset:  String(offset),
    sort_by: 'review_count',
  };

  // Yelp radius is in meters, max 40 000 m (~25 mi).
  // For larger radii omit the param so Yelp covers the full metro area.
  if (radiusMiles > 0 && radiusMiles <= 25) {
    yelpParams.radius = String(Math.round(radiusMiles * 1609.34));
  }

  const params = new URLSearchParams(yelpParams);

  const res = await fetch(`${YELP_SEARCH_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  const data = await res.json() as {
    businesses?: Array<{
      id: string;
      name: string;
      location: { display_address: string[]; city: string; state: string };
      display_phone: string;
      url: string;
      rating: number;
      review_count: number;
      categories: { title: string }[];
    }>;
    total?: number;
    error?: { description?: string };
  };

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error?.description || 'Yelp API error' },
      { status: 502 }
    );
  }

  const businesses = data.businesses ?? [];

  const results = businesses.map((b) => ({
    place_id:      b.id,
    business_name: b.name,
    address:       b.location?.display_address?.join(', ') || '',
    phone:         b.display_phone || null,
    website:       b.url || null,
    rating:        b.rating ?? null,
    review_count:  b.review_count ?? 0,
    city:          b.location?.city || '',
    state:         b.location?.state || '',
    category,
  }));

  const total      = data.total ?? results.length;
  const nextOffset = offset + results.length;
  const hasMore    = nextOffset < Math.min(total, 1000);

  return NextResponse.json({
    results,
    next_offset:   hasMore ? nextOffset : null,
    total_results: results.length,
    total_found:   total,
  });
}
