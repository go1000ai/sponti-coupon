import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// PUT /api/admin/deals/[id] — Update a deal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Handle feature/unfeature as a special case
  if ('is_featured' in body) {
    const isFeatured = body.is_featured as boolean;
    if (isFeatured) {
      // Insert into featured_deals (upsert to avoid duplicates)
      const { error: featError } = await serviceClient
        .from('featured_deals')
        .upsert({ deal_id: id, position: 0 }, { onConflict: 'deal_id' });
      if (featError) {
        return NextResponse.json({ error: featError.message }, { status: 500 });
      }
    } else {
      // Remove from featured_deals
      const { error: unfeatError } = await serviceClient
        .from('featured_deals')
        .delete()
        .eq('deal_id', id);
      if (unfeatError) {
        return NextResponse.json({ error: unfeatError.message }, { status: 500 });
      }
    }
    // If the only field was is_featured, return early
    const otherKeys = Object.keys(body).filter(k => k !== 'is_featured');
    if (otherKeys.length === 0) {
      return NextResponse.json({ success: true, is_featured: isFeatured });
    }
  }

  // Build update object from allowed fields
  const allowedFields = [
    'title',
    'description',
    'deal_type',
    'original_price',
    'deal_price',
    'discount_percentage',
    'deposit_amount',
    'max_claims',
    'starts_at',
    'expires_at',
    'timezone',
    'status',
    'terms_and_conditions',
    'fine_print',
    'highlights',
    'amenities',
    'how_it_works',
    'image_url',
    'image_urls',
    'category_id',
    'benchmark_deal_id',
    'location_ids',
    'website_url',
    'video_urls',
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  // Convert numeric fields
  const numericFields = ['original_price', 'deal_price', 'discount_percentage', 'deposit_amount', 'max_claims'];
  for (const field of numericFields) {
    if (field in updateData) {
      const val = updateData[field];
      updateData[field] = val != null && val !== '' ? Number(val) : null;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: deal, error } = await serviceClient
    .from('deals')
    .update(updateData)
    .eq('id', id)
    .select('*, vendor:vendors(business_name)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  return NextResponse.json({ deal });
}

// DELETE /api/admin/deals/[id] — Delete a deal (cascading claims)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  // Remove from featured_deals first (if exists)
  await serviceClient.from('featured_deals').delete().eq('deal_id', id);

  // Delete associated claims
  const { error: claimsError } = await serviceClient
    .from('claims')
    .delete()
    .eq('deal_id', id);

  if (claimsError) {
    return NextResponse.json(
      { error: `Failed to delete claims: ${claimsError.message}` },
      { status: 500 }
    );
  }

  // Delete the deal
  const { error: dealError } = await serviceClient
    .from('deals')
    .delete()
    .eq('id', id);

  if (dealError) {
    return NextResponse.json(
      { error: `Failed to delete deal: ${dealError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
