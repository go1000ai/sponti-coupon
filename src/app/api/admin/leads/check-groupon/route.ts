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

  // Distinctive words from the business name (> 3 chars, skip generic words)
  const SKIP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'have', 'more']);
  const nameWords = name
    .toLowerCase()
    .split(/[\s&,.'"-]+/)
    .filter((w) => w.length > 3 && !SKIP_WORDS.has(w));

  // Need at least 1 distinctive word to proceed
  if (nameWords.length === 0) {
    return NextResponse.json({ found: false });
  }

  // Groupon city slug: lowercase, replace non-alphanumeric with hyphens
  const citySlug = city
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const query = encodeURIComponent(name);

  // Try two Groupon URL formats — deals page + local page
  const urls = [
    `https://www.groupon.com/deals/${citySlug}?query=${query}`,
    `https://www.groupon.com/local/us/${citySlug}?query=${query}`,
  ];

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
  };

  // Match logic: require at least half the distinctive words to appear in
  // the page (or just 1 if there's only 1 distinctive word).
  // This is more lenient than requiring all words to match.
  function scoreMatch(html: string): boolean {
    const lower = html.toLowerCase();
    const matched = nameWords.filter((w) => lower.includes(w)).length;
    const threshold = Math.max(1, Math.ceil(nameWords.length / 2));
    return matched >= threshold;
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const html = await res.text();

      // The raw HTML of Groupon's page (even when JS-rendered) contains the
      // initial data inside <script> tags and __NEXT_DATA__ JSON blobs.
      // Searching the raw text covers both visible content and embedded JSON.
      if (scoreMatch(html)) {
        return NextResponse.json({ found: true });
      }
    } catch {
      // Timeout or network error — try next URL
      continue;
    }
  }

  return NextResponse.json({ found: false });
}
