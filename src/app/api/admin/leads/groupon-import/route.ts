import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';

// Vercel: allow up to 120 seconds for Apify headless browser run
export const maxDuration = 120;

// Map our category labels to Groupon's URL slugs
const GROUPON_CATEGORY: Record<string, string> = {
  'Restaurants':      'restaurants',
  'Spas & Salons':    'beauty-and-spas',
  'Gyms & Fitness':   'health-and-fitness',
  'Entertainment':    'things-to-do',
  'Auto Services':    'automotive',
  'Retail Shops':     'shopping',
  'Medical & Dental': 'health-and-medical',
  'Hotels & Resorts': 'travel',
  'Tour & Activities':'things-to-do',
  'Real Estate':      'real-estate',
};

// Convert a US zip code to "City, ST" using free zippopotam.us API
async function zipToCity(location: string): Promise<{ cityLabel: string; stateLabel: string; citySlug: string }> {
  const zipMatch = location.trim().match(/^(\d{5})(?:-\d{4})?$/);
  if (zipMatch) {
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zipMatch[1]}`);
      if (res.ok) {
        const data = await res.json() as { places?: Array<{ 'place name': string; 'state abbreviation': string }> };
        const place = data.places?.[0];
        if (place) {
          const cityLabel = place['place name'];
          const stateLabel = place['state abbreviation'];
          return {
            cityLabel,
            stateLabel,
            citySlug: cityLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          };
        }
      }
    } catch { /* fall through */ }
  }

  // Not a zip or lookup failed — parse as "City, State" string
  const cityLabel = location.split(',')[0].trim();
  const stateLabel = location.split(',')[1]?.trim() || '';
  const citySlug = cityLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { cityLabel, stateLabel, citySlug };
}

// Puppeteer page function — runs inside the headless Chromium browser.
// Uses multiple extraction strategies so it works regardless of Groupon DOM changes.
const PAGE_FUNCTION = `async function pageFunction(context) {
  const { page } = context;

  // 1) Wait for React to hydrate. Groupon is heavy — 10s is safer than 4s.
  await new Promise(r => setTimeout(r, 10000));

  // 2) Scroll through the full page to trigger lazy-loaded deal cards
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  const step = Math.max(300, Math.floor(bodyHeight / 8));
  for (let y = 0; y <= bodyHeight + step; y += step) {
    await page.evaluate((pos) => window.scrollTo(0, pos), y);
    await new Promise(r => setTimeout(r, 300));
  }
  await new Promise(r => setTimeout(r, 2000));

  // 3) Extract using multiple fallback strategies
  const extracted = await page.evaluate(() => {
    const debug = {
      url:       location.href,
      title:     document.title,
      bodyLen:   document.body.innerText.length,
      allLinks:  document.querySelectorAll('a').length,
      h2s:       document.querySelectorAll('h2').length,
      h3s:       document.querySelectorAll('h3').length,
    };

    const results = [];
    const seen    = new Set();

    function addResult(name, address, phone, url) {
      const key = name.toLowerCase().trim();
      if (!name || name.length < 3 || name.length > 150 || seen.has(key)) return;
      seen.add(key);
      results.push({ title: name.trim().slice(0, 120), address: address || '', phone: phone || '', url: url || '' });
    }

    function extractCard(el, linkHref) {
      const text  = (el.innerText || el.textContent || '').trim();
      const lines = text.split('\\n').map(l => l.trim()).filter(l => l.length > 1);
      const name  = lines[0] || '';
      const addr  = lines.find(l =>
        /\\d/.test(l) && l.length < 120 &&
        /\\b(st\\b|ave\\b|blvd\\b|rd\\b|dr\\b|ln\\b|way\\b|ct\\b|pl\\b|street|avenue|road|drive|lane|highway|hwy|pkwy|parkway)\\b/i.test(l)
      ) || '';
      const phone = lines.find(l => /\\(?\\d{3}\\)?[\\s.\\-]?\\d{3}[\\s.\\-]?\\d{4}/.test(l)) || '';
      addResult(name, addr, phone, linkHref);
    }

    // Strategy A: any link whose href contains deal/activity path segments
    const dealPaths = ['/deals/', '/activities/', '/groupon/', '/local/'];
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!dealPaths.some(p => href.includes(p))) return;
      const card = a.closest('article, li, section, [class*="card"], [class*="deal"], [class*="tile"]') || a.parentElement || a;
      extractCard(card, a.href);
    });

    // Strategy B: h2/h3 headings with a parent link (deal title pattern)
    document.querySelectorAll('h2, h3, h4').forEach(h => {
      const parentLink = h.closest('a') || h.parentElement?.closest('a');
      if (!parentLink) return;
      const name = (h.innerText || '').trim();
      const card = h.closest('article, li, [class*="card"]') || h.parentElement || h;
      const text  = (card.innerText || '').trim();
      const lines = text.split('\\n').map(l => l.trim()).filter(l => l.length > 1);
      const addr  = lines.find(l =>
        /\\d/.test(l) && l.length < 120 &&
        /\\b(st\\b|ave\\b|blvd\\b|rd\\b|dr\\b|street|avenue|road|drive|lane|highway)\\b/i.test(l)
      ) || '';
      addResult(name, addr, '', parentLink.href || '');
    });

    // Strategy C: if still nothing, grab ALL anchor text > 8 chars as a last resort
    if (results.length === 0) {
      document.querySelectorAll('a[href]').forEach(a => {
        const text = (a.innerText || a.textContent || '').trim().split('\\n')[0];
        if (text.length >= 8 && text.length <= 100 && !/^(sign|log|hel|men|nav|foo|hom|bro|sea)/i.test(text)) {
          addResult(text, '', '', a.href || '');
        }
      });
    }

    return { debug, results: results.slice(0, 60) };
  });

  // Return debug + results so we can diagnose empty responses
  return [extracted];
}`;

// POST /api/admin/leads/groupon-import
// Body: { location: string, categories: string[] }
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'APIFY_API_KEY is not configured in .env.local' }, { status: 500 });
  }

  const body = await request.json() as { location: string; categories: string[] };
  const { location, categories } = body;

  if (!location || !categories?.length) {
    return NextResponse.json({ error: 'location and categories are required' }, { status: 400 });
  }

  // Resolve zip codes → city name (Groupon URLs require city names, not zip codes)
  const { cityLabel, stateLabel, citySlug } = await zipToCity(location);

  console.log(`[groupon-import] city="${cityLabel}" state="${stateLabel}" slug="${citySlug}"`);

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
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL'],
        },
        launchPuppeteerOptions: {
          stealth: true,
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
        },
      }),
    }
  );

  const runData = await apifyRes.json() as {
    data?: { id?: string; status?: string; defaultDatasetId?: string };
    error?: { message?: string };
  };

  if (!apifyRes.ok) {
    console.error('[groupon-import] Apify run error:', runData);
    return NextResponse.json({ error: runData.error?.message || 'Apify run failed to start' }, { status: 502 });
  }

  const runStatus = runData.data?.status;
  const datasetId = runData.data?.defaultDatasetId;
  const runId     = runData.data?.id;

  if (runStatus === 'FAILED' || runStatus === 'ABORTED') {
    return NextResponse.json({ error: `Apify scraper ${runStatus?.toLowerCase()}. Check your Apify dashboard.` }, { status: 502 });
  }

  if (!datasetId) {
    return NextResponse.json({ error: 'No dataset ID from Apify run' }, { status: 502 });
  }

  // Fetch extracted items from the dataset
  const dataRes  = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&format=json&clean=true`);
  const rawItems = await dataRes.json() as Array<{
    // Page function returns [{ debug, results }] — one item per page
    debug?:   { url?: string; title?: string; bodyLen?: number; allLinks?: number };
    results?: Array<{ title?: string; address?: string; phone?: string; url?: string }>;
    // Fallback: older format where each item is a deal directly
    title?: string; name?: string; address?: string; phone?: string;
  }>;

  const items = Array.isArray(rawItems) ? rawItems : [];

  // Log debug info for each page
  for (const item of items) {
    if (item.debug) {
      console.log('[groupon-import] page debug:', item.debug);
    }
  }

  // Flatten: handle both {debug, results[]} format and flat deal format
  const allDeals: Array<{ title: string; address: string; phone: string; url: string }> = [];
  for (const item of items) {
    if (item.results && Array.isArray(item.results)) {
      allDeals.push(...item.results.map(r => ({
        title:   r.title   || '',
        address: r.address || '',
        phone:   r.phone   || '',
        url:     r.url     || '',
      })));
    } else if (item.title || item.name) {
      allDeals.push({
        title:   item.title || item.name || '',
        address: item.address || '',
        phone:   '',
        url:     '',
      });
    }
  }

  // Build debug message for empty results
  if (allDeals.length === 0) {
    const debugItems = items.filter(i => i.debug);
    const debugMsg = debugItems.length > 0
      ? `Scraper ran but found 0 businesses. Page: "${debugItems[0].debug?.title}" — ${debugItems[0].debug?.allLinks} links found on page.`
      : 'Scraper ran but found 0 businesses. Groupon may have blocked the request — try again in a few minutes.';
    return NextResponse.json({ results: [], total: 0, runId, status: runStatus, debug: debugMsg });
  }

  // Deduplicate by name and map to SearchResult shape
  const seenNames = new Set<string>();
  const ts = Date.now();

  const results = allDeals
    .filter((d) => d.title.trim().length > 2)
    .filter((d) => {
      const key = d.title.toLowerCase().trim();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    })
    .map((d, idx) => ({
      place_id:      `groupon-${citySlug}-${idx}-${ts}`,
      business_name: d.title.trim(),
      address:       d.address,
      phone:         d.phone || null,
      website:       d.url   || null,
      rating:        null,
      review_count:  0,
      city:          cityLabel,
      state:         stateLabel,
      category:      'Groupon',
      on_groupon:    true,
    }));

  return NextResponse.json({ results, total: results.length, runId, status: runStatus });
}
