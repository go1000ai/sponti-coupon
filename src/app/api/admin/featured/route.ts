import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/featured — List all featured deals with deal title, vendor name, position, claims count
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();

  const { data: featuredData, error: featuredError } = await serviceClient
    .from('featured_deals')
    .select('*, deal:deals(id, title, claims_count, vendor_id, vendor:vendors(business_name))')
    .order('position', { ascending: true });

  if (featuredError) {
    return NextResponse.json({ error: featuredError.message }, { status: 500 });
  }

  const featured = (featuredData || []).map((f: Record<string, unknown>) => {
    const deal = f.deal as Record<string, unknown> | null;
    const vendor = deal?.vendor as { business_name: string } | null;
    return {
      id: f.id,
      deal_id: f.deal_id,
      position: f.position,
      created_at: f.created_at,
      deal_title: deal?.title || '--',
      vendor_name: vendor?.business_name || '--',
      claims_count: deal?.claims_count || 0,
    };
  });

  return NextResponse.json({ featured });
}

// POST /api/admin/featured — Add a deal to featured
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

  const { deal_id, position } = body;

  if (!deal_id) {
    return NextResponse.json({ error: 'deal_id is required' }, { status: 400 });
  }

  // Verify the deal exists
  const { data: dealExists, error: dealCheckError } = await serviceClient
    .from('deals')
    .select('id, title, claims_count, vendor:vendors(business_name)')
    .eq('id', deal_id as string)
    .single();

  if (dealCheckError || !dealExists) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  // Check if deal is already featured
  const { data: existing } = await serviceClient
    .from('featured_deals')
    .select('id')
    .eq('deal_id', deal_id as string)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Deal is already featured' }, { status: 409 });
  }

  const { data: featured, error: insertError } = await serviceClient
    .from('featured_deals')
    .insert({
      deal_id: deal_id as string,
      position: typeof position === 'number' ? position : 0,
    })
    .select('*')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const vendorRaw = dealExists.vendor as unknown;
  const vendor = (Array.isArray(vendorRaw) ? vendorRaw[0] : vendorRaw) as { business_name: string } | null;

  return NextResponse.json({
    featured: {
      ...featured,
      deal_title: dealExists.title,
      vendor_name: vendor?.business_name || '--',
      claims_count: dealExists.claims_count || 0,
    },
  }, { status: 201 });
}
