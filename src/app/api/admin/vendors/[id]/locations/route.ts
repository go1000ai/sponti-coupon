import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/vendors/[id]/locations — List locations for a vendor
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  const { data: locations, error } = await serviceClient
    .from('vendor_locations')
    .select('*')
    .eq('vendor_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ locations: locations || [] });
}

// POST /api/admin/vendors/[id]/locations — Create a location
export async function POST(
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

  const { name, address, city, state, zip } = body as {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };

  if (!name || !address || !city || !state || !zip) {
    return NextResponse.json({ error: 'name, address, city, state, zip are required' }, { status: 400 });
  }

  const insertData: Record<string, unknown> = {
    vendor_id: id,
    name,
    address,
    city,
    state,
    zip,
  };

  if (body.lat) insertData.lat = Number(body.lat);
  if (body.lng) insertData.lng = Number(body.lng);
  if (body.phone) insertData.phone = body.phone;

  const { data: location, error } = await serviceClient
    .from('vendor_locations')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[POST /api/admin/vendors/locations] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ location }, { status: 201 });
}

// PUT /api/admin/vendors/[id]/locations — Update a location (pass location_id in body)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  await params;
  const serviceClient = await createServiceRoleClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const locationId = body.location_id as string;
  if (!locationId) {
    return NextResponse.json({ error: 'location_id is required' }, { status: 400 });
  }

  const allowedFields = ['name', 'address', 'city', 'state', 'zip', 'lat', 'lng', 'phone'];
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: location, error } = await serviceClient
    .from('vendor_locations')
    .update(updateData)
    .eq('id', locationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ location });
}

// DELETE /api/admin/vendors/[id]/locations — Delete a location (pass location_id in query)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  await params;
  const serviceClient = await createServiceRoleClient();

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('location_id');

  if (!locationId) {
    return NextResponse.json({ error: 'location_id query param is required' }, { status: 400 });
  }

  const { error } = await serviceClient
    .from('vendor_locations')
    .delete()
    .eq('id', locationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
