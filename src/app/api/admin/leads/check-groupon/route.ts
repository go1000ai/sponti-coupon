import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';

// GET /api/admin/leads/check-groupon?name=Business+Name&city=Orlando&state=FL
// Checks if a business appears in Groupon's public search results.
// Returns { found: boolean }
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || '';
  const city = searchParams.get('city') || '';

  if (!name || !city) {
    return NextResponse.json({ found: false });
  }

  try {
    // Groupon city slug: lowercase, no spaces, no state
    const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const query    = encodeURIComponent(name);
    const url      = `https://www.groupon.com/local/us/${citySlug}?query=${query}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ found: false });
    }

    const html = await res.text();

    // Check if the business name appears in the page content (case-insensitive)
    // Strip common words that cause false positives
    const nameParts = name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const found = nameParts.length > 0 && nameParts.every((part) => html.toLowerCase().includes(part));

    return NextResponse.json({ found });
  } catch {
    // Timeout or network error — assume not found
    return NextResponse.json({ found: false });
  }
}
