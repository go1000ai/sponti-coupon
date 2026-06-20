import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendDealDigestEmail, type DigestDeal } from '@/lib/email/deal-digest';
import { getDealImage } from '@/lib/constants';

export const maxDuration = 60;

const MAX_EMAILS_PER_RUN = 200;
const MAX_DEALS_PER_EMAIL = 8;

function distMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const norm = (s?: string | null) => (s || '').toLowerCase();

// Does a deal's vendor.category match any of the customer's preferred category slugs?
// Empty prefs = match everything. Fuzzy bidirectional token match against category name + slug.
function matchesPrefs(
  vendorCategory: string | null | undefined,
  prefSlugs: string[],
  categories: { name: string; slug: string }[],
): boolean {
  if (!prefSlugs.length) return true;
  const vWords = norm(vendorCategory).split(/[^a-z]+/).filter((w) => w.length > 2);
  if (!vWords.length) return false;
  for (const slug of prefSlugs) {
    const cat = categories.find((c) => c.slug === slug);
    const tokens = [...norm(cat?.name).split(/[^a-z]+/), ...slug.split('-')].filter((w) => w.length > 2);
    if (tokens.some((tok) => vWords.some((vw) => tok.includes(vw) || vw.includes(tok)))) return true;
  }
  return false;
}

// GET /api/cron/deal-digest — daily: email customers new deals matching their categories + radius
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
  }

  const supabase = await createServiceRoleClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';
  const now = new Date();
  const lookbackIso = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2-day window

  // Recently-published, still-live deals
  const { data: deals } = await supabase
    .from('deals')
    .select('id, slug, title, deal_price, original_price, discount_percentage, image_url, image_urls, created_at, vendor:vendors(business_name, category, lat, lng)')
    .eq('status', 'active')
    .gte('expires_at', now.toISOString())
    .gte('created_at', lookbackIso)
    .order('created_at', { ascending: false });

  if (!deals || deals.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No new deals to digest' });
  }

  const { data: categories } = await supabase.from('categories').select('name, slug');
  const cats = categories || [];

  // Opted-in customers with a stored location
  const { data: customers } = await supabase
    .from('customers')
    .select('id, email, first_name, last_name, preferred_categories, deal_radius_miles, lat, lng, last_deal_digest_at')
    .eq('email_preferred_deals', true)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(MAX_EMAILS_PER_RUN);

  if (!customers || customers.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No opted-in customers with location' });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const c of customers) {
    try {
      const since = c.last_deal_digest_at ? new Date(c.last_deal_digest_at) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const radius = c.deal_radius_miles ?? 50;
      const prefs: string[] = c.preferred_categories || [];

      const matched = deals.filter((d) => {
        if (new Date(d.created_at) <= since) return false;
        const vendor = d.vendor as unknown as { business_name?: string; category?: string; lat?: number; lng?: number } | null;
        if (!vendor?.lat || !vendor?.lng) return false;
        if (distMiles(c.lat as number, c.lng as number, vendor.lat, vendor.lng) > radius) return false;
        if (!matchesPrefs(vendor.category, prefs, cats)) return false;
        return true;
      });

      // Always advance the watermark for processed customers so each run is "what's new since last run"
      await supabase.from('customers').update({ last_deal_digest_at: now.toISOString() }).eq('id', c.id);

      if (matched.length === 0 || !c.email) continue;

      const digestDeals: DigestDeal[] = matched.slice(0, MAX_DEALS_PER_EMAIL).map((d) => {
        const vendor = d.vendor as unknown as { business_name?: string; category?: string; lat?: number; lng?: number } | null;
        return {
          title: d.title,
          businessName: vendor?.business_name || 'A local business',
          dealPrice: d.deal_price,
          originalPrice: d.original_price,
          discountPercentage: d.discount_percentage,
          imageUrl: getDealImage(d.image_url || d.image_urls?.[0], vendor?.category),
          url: `${appUrl}/deals/${d.slug || d.id}`,
          distanceMiles: vendor?.lat && vendor?.lng ? distMiles(c.lat as number, c.lng as number, vendor.lat, vendor.lng) : null,
        };
      });

      const name = c.first_name ? `${c.first_name}` : (c.email.split('@')[0]);
      await sendDealDigestEmail({ to: c.email, customerName: name, deals: digestDeals });
      sent++;
    } catch (err) {
      errors.push(`customer ${c.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ sent, processed: customers.length, errors: errors.length ? errors : undefined });
}
