import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';

const YELP_SEARCH_URL = 'https://api.yelp.com/v3/businesses/search';

// POST /api/admin/leads/batch-import
// Body: { names: string[], location: string }
// Looks up each business name via Yelp and returns enriched results
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'YELP_API_KEY is not configured in .env.local.' },
      { status: 500 }
    );
  }

  const { names, location } = await request.json() as { names: string[]; location: string };

  if (!names?.length || !location?.trim()) {
    return NextResponse.json({ error: 'names and location are required' }, { status: 400 });
  }

  // Dedupe and clean the names list
  const cleanNames = Array.from(new Set(
    names.map((n) => n.trim()).filter((n) => n.length > 1)
  )).slice(0, 100); // cap at 100

  const results = [];
  const seenIds = new Set<string>();

  // Look up each name one at a time — Yelp term search with exact name
  for (const name of cleanNames) {
    try {
      const params = new URLSearchParams({
        term: name,
        location: location.trim(),
        limit: '1',
        sort_by: 'best_match',
      });

      const res = await fetch(`${YELP_SEARCH_URL}?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      });

      if (!res.ok) continue;

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
      };

      const b = data.businesses?.[0];
      if (!b || seenIds.has(b.id)) continue;
      seenIds.add(b.id);

      results.push({
        place_id:      b.id,
        business_name: b.name,
        address:       b.location?.display_address?.join(', ') || '',
        phone:         b.display_phone || null,
        website:       b.url || null,
        rating:        b.rating ?? null,
        review_count:  b.review_count ?? 0,
        city:          b.location?.city || '',
        state:         b.location?.state || '',
        category:      b.categories?.[0]?.title || 'Groupon',
        on_groupon:    true,
      });
    } catch {
      // skip failed lookups silently
    }
  }

  return NextResponse.json({ results, total: results.length });
}
