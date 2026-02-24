import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Validate API key from Authorization header
async function validateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer sc_live_')) {
    return null;
  }

  const apiKey = authHeader.replace('Bearer ', '');
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const supabase = await createServiceRoleClient();
  const { data: keyRecord } = await supabase
    .from('vendor_api_keys')
    .select('id, vendor_id, is_active')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if (!keyRecord) return null;

  // Update last_used_at
  await supabase
    .from('vendor_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id);

  return keyRecord.vendor_id;
}

// GET /api/v1/deals — List vendor's deals (API key required)
export async function GET(request: NextRequest) {
  const vendorId = await validateApiKey(request);
  if (!vendorId) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'active';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('deals')
    .select('id, deal_type, title, description, original_price, deal_price, discount_percentage, deposit_amount, max_claims, claims_count, starts_at, expires_at, status, image_url, created_at', { count: 'exact' })
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: deals, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    deals: deals || [],
    total: count || 0,
    limit,
    offset,
  });
}

// POST /api/v1/deals — Create a deal via API (API key required)
export async function POST(request: NextRequest) {
  const vendorId = await validateApiKey(request);
  if (!vendorId) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();
  const body = await request.json();
  const {
    deal_type, title, description, original_price, deal_price,
    deposit_amount, max_claims, starts_at, expires_at, image_url,
  } = body;

  // Basic validation
  if (!deal_type || !title || !original_price || !deal_price || !starts_at || !expires_at) {
    return NextResponse.json({
      error: 'Required fields: deal_type, title, original_price, deal_price, starts_at, expires_at',
    }, { status: 400 });
  }

  const discount_percentage = ((original_price - deal_price) / original_price) * 100;

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      vendor_id: vendorId,
      deal_type,
      title,
      description: description || null,
      original_price,
      deal_price,
      discount_percentage,
      deposit_amount: deposit_amount || null,
      max_claims: max_claims || null,
      starts_at,
      expires_at,
      timezone: 'UTC',
      status: new Date(starts_at) > new Date() ? 'draft' : 'active',
      image_url: image_url || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deal }, { status: 201 });
}
