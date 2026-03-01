import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// GET /api/deals/[id] - Get a single deal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*, vendor:vendors(*)')
    .eq('id', id)
    .single();

  if (error || !deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  // Fetch other active deals from the same vendor (for "More from this vendor" section)
  const { data: vendorDeals } = await supabase
    .from('deals')
    .select('id, title, deal_type, original_price, deal_price, discount_percentage, image_url, expires_at, claims_count, max_claims, status')
    .eq('vendor_id', deal.vendor_id)
    .eq('status', 'active')
    .neq('id', id)
    .gte('expires_at', new Date().toISOString())
    .order('deal_type', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch similar deals from OTHER vendors (same category or similar tags)
  let similarDeals: typeof vendorDeals = [];
  if (deal.vendor?.category) {
    const { data: catDeals } = await supabase
      .from('deals')
      .select('id, title, deal_type, original_price, deal_price, discount_percentage, image_url, expires_at, claims_count, max_claims, status, vendor:vendors(business_name, logo_url, city, state)')
      .eq('status', 'active')
      .neq('vendor_id', deal.vendor_id)
      .neq('id', id)
      .gte('expires_at', new Date().toISOString())
      .order('claims_count', { ascending: false })
      .limit(6);
    similarDeals = catDeals || [];
  }

  // Record deal view (non-blocking, fire-and-forget)
  // Use Edge-compatible Web Crypto API for IP hashing
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  const { data: { user } } = await supabase.auth.getUser();

  // Hash IP for privacy (no raw IPs stored)
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + id); // combine IP + deal_id for per-deal dedup
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Fire-and-forget: don't await, don't block response
  supabase.from('deal_views').insert({
    deal_id: id,
    viewer_id: user?.id || null,
    ip_hash: ipHash,
  }).then(() => { /* ignore result */ });

  return NextResponse.json({ deal, vendor_deals: vendorDeals || [], similar_deals: similarDeals });
}

// PATCH /api/deals/[id] - Update deal (vendor only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership and get claims count
  const { data: existingDeal } = await supabase
    .from('deals')
    .select('vendor_id, claims_count')
    .eq('id', id)
    .single();

  if (!existingDeal || existingDeal.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized to modify this deal' }, { status: 403 });
  }

  const body = await request.json();
  const {
    status, expires_at, title, description, original_price, deal_price,
    discount_percentage, deposit_amount, max_claims, image_url, image_urls,
    terms_and_conditions, video_urls, amenities, how_it_works, highlights, fine_print,
    requires_appointment, variants,
  } = body;

  // If trying to edit content fields (not just status), check if deal has any claims
  const isContentEdit = title !== undefined || description !== undefined || original_price !== undefined ||
    deal_price !== undefined || discount_percentage !== undefined || deposit_amount !== undefined ||
    max_claims !== undefined || image_url !== undefined;

  if (isContentEdit && existingDeal.claims_count > 0) {
    return NextResponse.json(
      { error: 'This deal has active claims and can no longer be edited. You can pause/expire it and create a new one.' },
      { status: 403 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (expires_at) updates.expires_at = expires_at;
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (original_price !== undefined) updates.original_price = original_price;
  if (deal_price !== undefined) updates.deal_price = deal_price;
  if (discount_percentage !== undefined) updates.discount_percentage = discount_percentage;
  if (deposit_amount !== undefined) updates.deposit_amount = deposit_amount;
  if (max_claims !== undefined) updates.max_claims = max_claims;
  if (image_url !== undefined) updates.image_url = image_url;
  if (image_urls !== undefined) updates.image_urls = image_urls;
  if (terms_and_conditions !== undefined) updates.terms_and_conditions = terms_and_conditions;
  if (video_urls !== undefined) updates.video_urls = video_urls;
  if (amenities !== undefined) updates.amenities = amenities;
  if (how_it_works !== undefined) updates.how_it_works = how_it_works;
  if (highlights !== undefined) updates.highlights = highlights;
  if (fine_print !== undefined) updates.fine_print = fine_print;
  if (requires_appointment !== undefined) updates.requires_appointment = requires_appointment;
  if (variants !== undefined) updates.variants = variants;

  const { data: deal, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deal });
}
