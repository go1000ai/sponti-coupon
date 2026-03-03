import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/leads — list all saved leads with optional filters
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  const city   = searchParams.get('city')   || '';

  const serviceClient = await createServiceRoleClient();

  let query = serviceClient
    .from('vendor_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }
  if (city) {
    query = query.ilike('city', `%${city}%`);
  }

  const { data: leads, error } = await query;

  if (error) {
    console.error('[GET /api/admin/leads]', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }

  return NextResponse.json({ leads: leads || [] });
}

// POST /api/admin/leads — save a new lead from Google Places search
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const body = await request.json();
  const {
    business_name, address, phone, website,
    category, city, state, rating, review_count, place_id,
  } = body;

  if (!business_name) {
    return NextResponse.json({ error: 'business_name is required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  const { data: lead, error } = await serviceClient
    .from('vendor_leads')
    .insert({
      business_name, address, phone, website,
      category, city, state, rating, review_count, place_id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Lead already saved' }, { status: 409 });
    }
    console.error('[POST /api/admin/leads]', error);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }

  return NextResponse.json({ lead }, { status: 201 });
}

// PATCH /api/admin/leads — update status, on_groupon, or notes for a lead
export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const body = await request.json();
  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const allowedFields = ['status', 'on_groupon', 'notes'];
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in fields) {
      updateData[field] = fields[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  updateData.updated_at = new Date().toISOString();

  const serviceClient = await createServiceRoleClient();

  const { data: lead, error } = await serviceClient
    .from('vendor_leads')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[PATCH /api/admin/leads]', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }

  return NextResponse.json({ lead });
}

// DELETE /api/admin/leads?id= — remove a saved lead
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  const { error } = await serviceClient
    .from('vendor_leads')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[DELETE /api/admin/leads]', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
