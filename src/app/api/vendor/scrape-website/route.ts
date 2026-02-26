import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import http from 'http';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';
import { rateLimit } from '@/lib/rate-limit';

// Fetch a URL with SSL tolerance and redirect following (many small biz sites have cert issues)
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
        rejectUnauthorized: false, // Tolerate self-signed / expired certs
      };

      const req = lib.request(options, (res) => {
        // Follow redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          redirects++;
          if (redirects > maxRedirects) {
            reject(new Error('Too many redirects'));
            return;
          }
          let nextUrl = res.headers.location;
          if (nextUrl.startsWith('/')) {
            nextUrl = `${parsed.protocol}//${parsed.host}${nextUrl}`;
          }
          res.resume(); // Drain response
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
        res.on('end', () => {
          resolve({ html: Buffer.concat(chunks).toString('utf-8'), finalUrl: reqUrl });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.end();
    }

    doRequest(targetUrl);
  });
}

// POST /api/vendor/scrape-website — Scrape vendor website and generate deal suggestions
export async function POST(request: NextRequest) {
  // Rate limit: 10 website scrapes per hour
  const limited = rateLimit(request, { maxRequests: 10, windowMs: 60 * 60 * 1000, identifier: 'ai-scrape-website' });
  if (limited) return limited;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify vendor role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'vendor') {
    return NextResponse.json({ error: 'Only vendors can use this feature' }, { status: 403 });
  }

  // Get vendor info
  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, category, city, state, subscription_tier')
    .eq('id', user.id)
    .single();

  // Check tier access (Business+)
  const tier = (vendor?.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].ai_deal_assistant) {
    return NextResponse.json(
      { error: 'Website Import requires a Business plan or higher. Upgrade at /vendor/subscription.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
  }

  // Basic URL validation
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
    // Step 1: Fetch the website HTML (tolerates SSL issues & follows redirects)
    let html: string;
    try {
      const result = await fetchWebsite(parsedUrl.toString());
      html = result.html;
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      if (msg.includes('timeout')) {
        return NextResponse.json(
          { error: 'The website took too long to respond. Try again or check the URL.' },
          { status: 408 }
        );
      }
      if (msg.startsWith('HTTP ')) {
        return NextResponse.json(
          { error: `Could not reach the website (${msg}). Check the URL and try again.` },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: 'Could not connect to the website. Check the URL and try again.' },
        { status: 422 }
      );
    }

    if (!html || html.length < 100) {
      return NextResponse.json(
        { error: 'The website returned very little content. It may be blocked or require JavaScript. Try a different page URL.' },
        { status: 422 }
      );
    }

    // Strip heavy content (scripts, styles, SVGs) to reduce token usage
    const cleanHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')       // Remove remaining HTML tags
      .replace(/\s{2,}/g, ' ')        // Collapse whitespace
      .trim();

    // Limit to ~8000 chars to control costs
    const truncatedContent = cleanHtml.slice(0, 8000);

    // Extract image URLs from the HTML
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    const imageUrls: string[] = [];
    let match;
    while ((match = imgRegex.exec(html)) !== null && imageUrls.length < 20) {
      let imgUrl = match[1];
      // Resolve relative URLs
      if (imgUrl.startsWith('/')) {
        imgUrl = `${parsedUrl.origin}${imgUrl}`;
      } else if (!imgUrl.startsWith('http')) {
        imgUrl = `${parsedUrl.origin}/${imgUrl}`;
      }
      // Skip tiny icons, trackers, and data URIs
      if (
        imgUrl.startsWith('data:') ||
        imgUrl.includes('favicon') ||
        imgUrl.includes('pixel') ||
        imgUrl.includes('tracking') ||
        imgUrl.includes('1x1') ||
        imgUrl.includes('.svg')
      ) continue;
      imageUrls.push(imgUrl);
    }

    // Step 2: Fetch competitor deals from SpontiCoupon in same category/city
    let competitorInfo = '';
    if (vendor?.category || vendor?.city) {
      const serviceClient = await createServiceRoleClient();
      let competitorQuery = serviceClient
        .from('deals')
        .select('title, description, original_price, deal_price, discount_percentage, deal_type')
        .eq('status', 'active')
        .neq('vendor_id', user.id)
        .order('claims_count', { ascending: false })
        .limit(5);

      // Try to match by category through vendor join
      if (vendor?.category) {
        const { data: similarVendors } = await serviceClient
          .from('vendors')
          .select('id')
          .eq('category', vendor.category)
          .neq('id', user.id)
          .limit(20);

        if (similarVendors && similarVendors.length > 0) {
          competitorQuery = competitorQuery.in('vendor_id', similarVendors.map(v => v.id));
        }
      }

      const { data: competitorDeals } = await competitorQuery;
      if (competitorDeals && competitorDeals.length > 0) {
        competitorInfo = `\n\nTOP COMPETITOR DEALS ON SPONTICOUPON (same category):\n${competitorDeals.map((d, i) =>
          `${i + 1}. "${d.title}" — $${d.original_price} → $${d.deal_price} (${d.discount_percentage}% off, ${d.deal_type === 'sponti_coupon' ? 'Sponti' : 'Steady'})`
        ).join('\n')}`;
      }
    }

    // Step 3: Use Claude to analyze the website and generate deal suggestions
    const client = new Anthropic({ apiKey: anthropicKey });

    const systemPrompt = `You are a deal creation expert for SpontiCoupon, a local deal/coupon platform. A vendor has given you their website. Your job is to:

1. ANALYZE their website content to understand their business (services, products, pricing, specialties, brand voice)
2. EXTRACT useful information (business name, menu items, services, pricing if visible)
3. GENERATE 3 compelling deal suggestions that would work well on SpontiCoupon

Each deal should be SPECIFIC to what this business actually offers — reference their actual products, services, or menu items.

Return ONLY valid JSON (no markdown, no code blocks) with this structure:
{
  "business_summary": "1-2 sentence summary of what this business is and what they offer",
  "extracted_info": {
    "business_name": "Name if found on the page",
    "services_or_products": ["item1", "item2", ...],
    "price_range": "e.g. $10-$50 per service",
    "specialties": ["specialty1", "specialty2"],
    "brand_tone": "e.g. casual, upscale, family-friendly"
  },
  "suggested_deals": [
    {
      "title": "Catchy deal title (max 60 chars)",
      "description": "3-5 vivid sentences about what the customer will experience",
      "deal_type": "regular" or "sponti_coupon",
      "original_price": number,
      "deal_price": number,
      "discount_percentage": number,
      "max_claims": number (20-100),
      "terms_and_conditions": "Clear terms covering scope, restrictions, validity",
      "how_it_works": "Step-by-step: 1. Claim on SpontiCoupon 2. Show QR code 3. Enjoy",
      "highlights": ["highlight1", "highlight2", "highlight3", "highlight4"],
      "amenities": ["amenity1", "amenity2", "amenity3"],
      "fine_print": "Brief disclaimers",
      "suggested_image_prompt": "A description of what the deal image should look like"
    }
  ],
  "recommended_images": ["url1", "url2"]
}

RULES:
- Make deals SPECIFIC to the business — reference their actual products/services
- Price deals competitively (consider the competitor data if provided)
- Include at least one Sponti Coupon (flash deal) and one Steady Deal
- The third deal should be the most creative/compelling option
- For suggested_image_prompt, describe a professional photo that would showcase this specific deal
- For recommended_images, pick the best 2-3 images from the website that could work as deal images`;

    const userPrompt = `WEBSITE URL: ${parsedUrl.toString()}

WEBSITE CONTENT:
${truncatedContent}

IMAGES FOUND ON WEBSITE:
${imageUrls.slice(0, 10).join('\n')}

VENDOR INFO:
- Business Name: ${vendor?.business_name || 'Unknown'}
- Category: ${vendor?.category || 'Unknown'}
- Location: ${vendor?.city && vendor?.state ? `${vendor.city}, ${vendor.state}` : 'Unknown'}
${competitorInfo}

Analyze this website and generate 3 specific, compelling deal suggestions based on what this business actually offers.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
      temperature: 0.7,
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Failed to analyze website' }, { status: 500 });
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse website analysis' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      analysis: result,
      website_url: parsedUrl.toString(),
      website_images: imageUrls.slice(0, 10),
    });
  } catch (err: unknown) {
    console.error('Website scrape error:', err);
    const errMsg = err instanceof Error ? err.message : String(err);

    if (errMsg.includes('abort') || errMsg.includes('timeout')) {
      return NextResponse.json(
        { error: 'The website took too long to respond. Try again or check the URL.' },
        { status: 408 }
      );
    }
    if (errMsg.includes('ENOTFOUND') || errMsg.includes('getaddrinfo')) {
      return NextResponse.json(
        { error: 'Could not find that website. Check the URL and try again.' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze website. Please try again.' },
      { status: 500 }
    );
  }
}
