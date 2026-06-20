import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import http from 'http';
import Anthropic from '@anthropic-ai/sdk';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { rateLimit } from '@/lib/rate-limit';

// Fetch a URL with SSL tolerance and redirect following (small-biz sites often
// have cert issues). Mirrors the helper in /api/vendor/scrape-website.
async function fetchWebsite(targetUrl: string): Promise<{ html: string; finalUrl: string }> {
  return new Promise((resolve, reject) => {
    const maxRedirects = 5;
    let redirects = 0;

    function doRequest(reqUrl: string) {
      const parsed = new URL(reqUrl);
      const isHttps = parsed.protocol === 'https:';
      const lib = isHttps ? https : http;

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 15000,
        rejectUnauthorized: false,
      };

      const req = lib.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          redirects++;
          if (redirects > maxRedirects) { reject(new Error('Too many redirects')); return; }
          let nextUrl = res.headers.location;
          if (nextUrl.startsWith('/')) nextUrl = `${parsed.protocol}//${parsed.host}${nextUrl}`;
          res.resume();
          doRequest(nextUrl);
          return;
        }
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf-8'), finalUrl: reqUrl }));
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.end();
    }

    doRequest(targetUrl);
  });
}

// POST /api/admin/leads/scrape-deals — extract the deals/offers a business
// currently advertises on its site, so the admin can reference them on a call.
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  // Rate limit: 20 scrapes per hour per instance
  const limited = rateLimit(request, { maxRequests: 20, windowMs: 60 * 60 * 1000, identifier: 'admin-scrape-deals' });
  if (limited) return limited;

  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const anthropicKey = process.env.SPONTI_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
  }

  try {
    let html: string;
    try {
      const result = await fetchWebsite(parsedUrl.toString());
      html = result.html;
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      if (msg.includes('timeout')) {
        return NextResponse.json({ error: 'The site took too long to respond. Try again.' }, { status: 408 });
      }
      return NextResponse.json(
        { error: 'Could not reach the site. Check the URL and try again.' },
        { status: 422 },
      );
    }

    if (!html || html.length < 100) {
      return NextResponse.json(
        { error: 'The site returned very little content (may be JS-only or blocked).' },
        { status: 422 },
      );
    }

    const cleanText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 8000);

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      temperature: 0.1,
      system:
        'You extract the deals, offers, discounts, promotions, packages, specials, ' +
        'or pricing a local business currently advertises on its page. ' +
        'Only report what is actually present in the text — never invent deals. ' +
        'Respond with ONLY valid JSON, no markdown.',
      messages: [
        {
          role: 'user',
          content:
            `Here is the visible text of a business website page. List the specific deals/offers/promotions/specials/packages they currently advertise (with prices if shown). ` +
            `Return JSON exactly: {"summary": string, "deals": [{"title": string, "details": string}]}. ` +
            `"details" should include price/discount/terms if present, kept short. ` +
            `If no explicit deals or offers are advertised, return an empty deals array and say so in summary.\n\n---\n${cleanText}`,
        },
      ],
    });

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let parsed: { summary?: string; deals?: { title: string; details: string }[] } = {};
    try {
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return NextResponse.json({ error: 'Could not parse the deals from the page.' }, { status: 500 });
    }

    return NextResponse.json({
      summary: parsed.summary || '',
      deals: Array.isArray(parsed.deals) ? parsed.deals : [],
      website_url: parsedUrl.toString(),
    });
  } catch (err) {
    console.error('[scrape-deals]', err);
    return NextResponse.json({ error: 'Failed to analyze the site. Please try again.' }, { status: 500 });
  }
}
