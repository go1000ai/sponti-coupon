import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/webhooks/ghl-deal-link
 *
 * Called by GoHighLevel when Olivia (AI voice agent) promises to email
 * a caller a link to a deal they're interested in.
 *
 * Expected payload from GHL workflow:
 * {
 *   caller_name: string,
 *   caller_email: string,
 *   deal_query: string,       // what the caller is looking for (e.g. "pizza deal", "spa discount")
 *   deal_category?: string    // optional category filter
 * }
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret (same secret as support webhook)
  const secret = process.env.GHL_SUPPORT_WEBHOOK_SECRET;
  if (secret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    caller_name,
    caller_email,
    deal_query,
    deal_category,
  } = body as {
    caller_name?: string;
    caller_email?: string;
    deal_query?: string;
    deal_category?: string;
  };

  if (!caller_email?.trim()) {
    return NextResponse.json(
      { error: 'caller_email is required' },
      { status: 400 },
    );
  }

  if (!deal_query?.trim()) {
    return NextResponse.json(
      { error: 'deal_query is required' },
      { status: 400 },
    );
  }

  const supabase = await createServiceRoleClient();

  // Search for matching active deals
  const searchTerm = deal_query.trim().toLowerCase();

  let query = supabase
    .from('deals')
    .select(`
      id, title, slug, original_price, deal_price, discount_percentage,
      image_url, vendor_id,
      vendors!inner(business_name)
    `)
    .eq('status', 'active')
    .gte('expires_at', new Date().toISOString());

  // Category filter if provided
  if (deal_category?.trim()) {
    query = query.eq('category', deal_category.trim().toLowerCase());
  }

  const { data: allDeals, error: searchError } = await query.limit(50);

  if (searchError) {
    console.error('[GHL Deal Link] Search error:', searchError);
    return NextResponse.json({ error: 'Failed to search deals' }, { status: 500 });
  }

  // Filter deals by search term matching title, description, or vendor name
  const searchWords = searchTerm.split(/\s+/).filter(Boolean);

  const matchingDeals = (allDeals || [])
    .filter((deal) => {
      const title = (deal.title || '').toLowerCase();
      const vendorName = ((deal.vendors as { business_name?: string })?.business_name || '').toLowerCase();
      const combined = `${title} ${vendorName}`;
      return searchWords.some((word) => combined.includes(word));
    })
    .slice(0, 5); // Max 5 deals per email

  if (matchingDeals.length === 0) {
    // No matching deals — send a browse-all email instead
    const { sendDealLinkEmail } = await import('@/lib/email/deal-link');

    // Get top 3 active deals as fallback
    const { data: topDeals } = await supabase
      .from('deals')
      .select(`
        id, title, slug, original_price, deal_price, discount_percentage,
        image_url, vendor_id,
        vendors!inner(business_name)
      `)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('claims_count', { ascending: false })
      .limit(3);

    if (topDeals && topDeals.length > 0) {
      await sendDealLinkEmail({
        callerName: caller_name?.trim() || 'Friend',
        callerEmail: caller_email.trim(),
        deals: topDeals.map((d) => ({
          title: d.title,
          slug: d.slug,
          original_price: d.original_price,
          deal_price: d.deal_price,
          discount_percentage: d.discount_percentage,
          image_url: d.image_url,
          vendor_name: (d.vendors as { business_name?: string })?.business_name || '',
        })),
      });

      return NextResponse.json({
        success: true,
        matched: false,
        deals_sent: topDeals.length,
        message: `No exact matches for "${deal_query}", sent top deals instead`,
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      matched: false,
      deals_sent: 0,
      message: `No active deals found`,
    }, { status: 200 });
  }

  // Send email with matching deals
  const { sendDealLinkEmail } = await import('@/lib/email/deal-link');

  await sendDealLinkEmail({
    callerName: caller_name?.trim() || 'Friend',
    callerEmail: caller_email.trim(),
    deals: matchingDeals.map((d) => ({
      title: d.title,
      slug: d.slug,
      original_price: d.original_price,
      deal_price: d.deal_price,
      discount_percentage: d.discount_percentage,
      image_url: d.image_url,
      vendor_name: (d.vendors as { business_name?: string })?.business_name || '',
    })),
  });

  return NextResponse.json({
    success: true,
    matched: true,
    deals_sent: matchingDeals.length,
    deal_titles: matchingDeals.map((d) => d.title),
  }, { status: 200 });
}
