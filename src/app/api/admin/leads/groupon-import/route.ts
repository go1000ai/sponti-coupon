import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';

// Vercel: allow up to 120 seconds for Apify headless browser run
export const maxDuration = 120;

// Map our category labels to Groupon's URL slugs
const GROUPON_CATEGORY: Record<string, string> = {
  'Restaurants':    'restaurants',
  'Spas & Salons':  'beauty-and-spas',
  'Gyms & Fitness': 'health-and-fitness',
  'Entertainment':  'things-to-do',
  'Auto Services':  'automotive',
  'Retail Shops':   'shopping',
  'Medical & Dental': 'health-and-medical',
  'Hotels & Resorts': 'travel',
  'Tour & Activities': 'things-to-do',
  'Real Estate':    'real-estate',
};

// Puppeteer page function — runs inside the headless Chromium browser
// Must be a plain string (no outer template dependencies at runtime)
const PAGE_FUNCTION = `async function pageFunction(context) {
  const { page, request } = context;

  // Give React/Next.js time to hydrate and render deal cards
  await new Promise(r => setTimeout(r, 4000));

  // Scroll to trigger lazy-loaded cards
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 1500));

  const deals = await page.evaluate(() => {
    const results = [];
    const seen = new Set();

    // Groupon deal links all contain /deals/ or /activities/ in the href
    const links = Array.from(
      document.querySelectorAll('a[href*="/deals/"], a[href*="/activities/"], a[href*="/groupon/"]')
    );

    links.forEach(link => {
      // Walk up to find the card container
      const card =
        link.closest('article, li, [class*="card"], [class*="deal"], [class*="tile"], [class*="Cell"], [class*="item"]') ||
        link.parentElement;

      if (!card) return;

      const text = (card.innerText || '').trim();
      const lines = text.split('\\n').map(l => l.trim()).filter(l => l.length > 1);

      // First meaningful line is usually the deal/business title
      const name = (lines[0] || link.textContent || '').trim().slice(0, 120);
      if (!name || name.length < 3 || seen.has(name)) return;
      seen.add(name);

      // Detect an address-like line (has digits + street word)
      const addrLine = lines.find(l =>
        /\\d+/.test(l) &&
        /\\b(st|ave|blvd|rd|dr|ln|way|ct|pl|street|avenue|road|drive|hwy|highway|pkwy|parkway)\\b/i.test(l)
      ) || '';

      // Detect a phone-like line
      const phoneLine = lines.find(l =>
        /\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}/.test(l)
      ) || '';

      results.push({
        title:   name,
        address: addrLine,
        phone:   phoneLine,
        url:     link.href,
      });
    });

    return results.slice(0, 60);
  });

  return deals;
}`;

// POST /api/admin/leads/groupon-import
// Body: { location: string, categories: string[] }
// Returns: { results: SearchResult[], total: number, runId: string }
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'APIFY_API_KEY is not configured in .env.local' },
      { status: 500 }
    );
  }

  const body = await request.json() as { location: string; categories: string[] };
  const { location, categories } = body;

  if (!location || !categories?.length) {
    return NextResponse.json(
      { error: 'location and categories are required' },
      { status: 400 }
    );
  }

  // Build Groupon city slug: "Orlando, FL" → "orlando"
  const citySlug = location
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const cityLabel = location.split(',')[0].trim();
  const stateLabel = location.split(',')[1]?.trim() || '';

  // Build one Groupon URL per category (dedupe same slug)
  const seenSlugs = new Set<string>();
  const startUrls: { url: string }[] = [];

  for (const cat of categories) {
    const slug = GROUPON_CATEGORY[cat];
    const url = slug
      ? `https://www.groupon.com/local/us/${citySlug}/${slug}`
      : `https://www.groupon.com/local/us/${citySlug}?query=${encodeURIComponent(cat)}`;

    const key = slug || cat;
    if (!seenSlugs.has(key)) {
      seenSlugs.add(key);
      startUrls.push({ url });
    }
  }

  // Launch Apify puppeteer-scraper and wait up to 90 seconds for it to finish
  const apifyRes = await fetch(
    `https://api.apify.com/v2/acts/apify~puppeteer-scraper/runs?token=${apiKey}&waitForFinish=90`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls,
        maxPagesPerCrawl: startUrls.length,
        pageFunction: PAGE_FUNCTION,
        proxyConfiguration: { useApifyProxy: false },
        launchPuppeteerOptions: {
          stealth: true,
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
          ],
        },
      }),
    }
  );

  const runData = await apifyRes.json() as {
    data?: {
      id?: string;
      status?: string;
      defaultDatasetId?: string;
    };
    error?: { message?: string };
  };

  if (!apifyRes.ok) {
    console.error('[groupon-import] Apify run error:', runData);
    return NextResponse.json(
      { error: runData.error?.message || 'Apify run failed to start' },
      { status: 502 }
    );
  }

  const runStatus   = runData.data?.status;
  const datasetId   = runData.data?.defaultDatasetId;
  const runId       = runData.data?.id;

  if (runStatus === 'FAILED' || runStatus === 'ABORTED') {
    return NextResponse.json(
      { error: `Apify scraper ${runStatus.toLowerCase()}. Check your Apify dashboard.` },
      { status: 502 }
    );
  }

  if (!datasetId) {
    return NextResponse.json({ error: 'No dataset ID from Apify run' }, { status: 502 });
  }

  // Fetch extracted items from the dataset
  const dataRes  = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&format=json&clean=true`
  );
  const rawItems = await dataRes.json() as Array<{
    title?: string;
    name?: string;
    address?: string;
    phone?: string;
    url?: string;
  }>;

  const items = Array.isArray(rawItems) ? rawItems : [];

  // Deduplicate by business name and map to our SearchResult shape
  const seenNames = new Set<string>();
  const ts = Date.now();

  const results = items
    .filter((item) => (item.title || item.name || '').trim().length > 2)
    .filter((item) => {
      const name = (item.title || item.name || '').trim().toLowerCase();
      if (seenNames.has(name)) return false;
      seenNames.add(name);
      return true;
    })
    .map((item, idx) => ({
      place_id:      `groupon-${citySlug}-${idx}-${ts}`,
      business_name: (item.title || item.name || '').trim(),
      address:       item.address || '',
      phone:         item.phone   || null,
      website:       item.url     || null,
      rating:        null,
      review_count:  0,
      city:          cityLabel,
      state:         stateLabel,
      category:      'Groupon',
      on_groupon:    true,
    }));

  return NextResponse.json({
    results,
    total:  results.length,
    runId,
    status: runStatus,
  });
}
