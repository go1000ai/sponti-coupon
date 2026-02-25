import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/deals — List all deals with vendor business_name
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';
  const status = searchParams.get('status') || '';
  const type = searchParams.get('type') || '';

  let query = serviceClient
    .from('deals')
    .select('*, vendor:vendors(business_name)')
    .order('created_at', { ascending: false });

  // Apply search filter (title or vendor business_name via ilike)
  if (search) {
    query = query.or(`title.ilike.%${search}%`);
  }

  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Apply type filter
  if (type && type !== 'all') {
    query = query.eq('deal_type', type);
  }

  const { data: dealsData, error: dealsError } = await query;

  if (dealsError) {
    return NextResponse.json({ error: dealsError.message }, { status: 500 });
  }

  // Fetch featured deal IDs
  const { data: featuredData } = await serviceClient
    .from('featured_deals')
    .select('deal_id');

  const featuredIds = new Set((featuredData || []).map((f: { deal_id: string }) => f.deal_id));

  // If searching by vendor name, filter client-side since Supabase doesn't
  // support or-filtering across joined tables cleanly
  let deals = (dealsData || []).map((deal: Record<string, unknown>) => ({
    ...deal,
    is_featured: featuredIds.has(deal.id as string),
  }));

  if (search) {
    const q = search.toLowerCase();
    deals = deals.filter((d: Record<string, unknown>) => {
      const title = (d.title as string || '').toLowerCase();
      const vendor = d.vendor as { business_name: string } | null;
      const vendorName = (vendor?.business_name || '').toLowerCase();
      return title.includes(q) || vendorName.includes(q);
    });
  }

  // Fetch vendors list for the create form dropdown
  const { data: vendorsData } = await serviceClient
    .from('vendors')
    .select('id, business_name')
    .order('business_name', { ascending: true });

  return NextResponse.json({ deals, vendors: vendorsData || [] });
}

// POST /api/admin/deals — Create a new deal
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    vendor_id,
    deal_type,
    title,
    description,
    original_price,
    deal_price,
    discount_percentage,
    deposit_amount,
    max_claims,
    starts_at,
    expires_at,
    timezone,
    status,
    terms_and_conditions,
    image_url,
    image_urls,
    fine_print,
    highlights,
    amenities,
    how_it_works,
  } = body;

  if (!vendor_id || !title || !deal_type) {
    return NextResponse.json(
      { error: 'vendor_id, title, and deal_type are required' },
      { status: 400 }
    );
  }

  const insertData: Record<string, unknown> = {
    vendor_id,
    deal_type,
    title,
    description: description || null,
    original_price: Number(original_price) || 0,
    deal_price: Number(deal_price) || 0,
    discount_percentage: Number(discount_percentage) || 0,
    deposit_amount: deposit_amount != null ? Number(deposit_amount) : null,
    max_claims: max_claims != null ? Number(max_claims) : null,
    starts_at: starts_at || new Date().toISOString(),
    expires_at: expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    timezone: timezone || 'America/New_York',
    status: status || 'draft',
    terms_and_conditions: terms_and_conditions || null,
    image_url: image_url || null,
    image_urls: image_urls || [],
    fine_print: fine_print || null,
    highlights: highlights || [],
    amenities: amenities || [],
    how_it_works: how_it_works || null,
  };

  const { data: deal, error } = await serviceClient
    .from('deals')
    .insert(insertData)
    .select('*, vendor:vendors(business_name)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deal }, { status: 201 });
}
