import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';

const YELP_SEARCH_URL = 'https://api.yelp.com/v3/businesses/search';

// GET /api/admin/leads/search — proxy to Yelp Fusion Business Search API
// Query params: ?category=Restaurants&location=Orlando, FL&offset=0
// Returns up to 50 results per call. Use offset to paginate (max 1000 total).
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'YELP_API_KEY is not configured. Add it to .env.local.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category   = searchParams.get('category') || '';
  const location   = searchParams.get('location') || '';
  const offset     = parseInt(searchParams.get('offset') || '0', 10);
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

  // Yelp radius is in meters, max 40000 (~25 miles)
  if (radiusMiles > 0) {
    const radiusMeters = Math.min(Math.round(radiusMiles * 1609.34), 40000);
    yelpParams.radius = String(radiusMeters);
  }

  const params = new URLSearchParams(yelpParams);

  const res = await fetch(`${YELP_SEARCH_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[Yelp Search] API error:', data);
    return NextResponse.json(
      { error: data.error?.description || 'Yelp API error' },
      { status: 502 }
    );
  }

  const businesses = data.businesses || [];

  const results = businesses.map((b: {
    id: string;
    name: string;
    location: { display_address: string[]; city: string; state: string };
    display_phone: string;
    url: string;
    rating: number;
    review_count: number;
    categories: { title: string }[];
  }) => ({
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

  const total      = data.total || results.length;
  const nextOffset = offset + results.length;
  const hasMore    = nextOffset < Math.min(total, 1000);

  return NextResponse.json({
    results,
    next_offset:   hasMore ? nextOffset : null,
    total_results: results.length,
    total_found:   total,
  });
}
