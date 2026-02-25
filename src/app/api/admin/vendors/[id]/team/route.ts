import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/vendors/[id]/team — List team members for a vendor
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  const { data: members, error } = await serviceClient
    .from('team_members')
    .select('*')
    .eq('vendor_id', id)
    .order('invited_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members: members || [] });
}

// POST /api/admin/vendors/[id]/team — Add a team member
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

  const { email, name, role } = body as { email: string; name: string; role: string };

  if (!email || !name || !role) {
    return NextResponse.json({ error: 'email, name, and role are required' }, { status: 400 });
  }

  const validRoles = ['admin', 'manager', 'staff'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'role must be admin, manager, or staff' }, { status: 400 });
  }

  const insertData: Record<string, unknown> = {
    vendor_id: id,
    email,
    name,
    role,
    status: 'active',
    invited_at: new Date().toISOString(),
  };

  if (body.location_id) insertData.location_id = body.location_id;

  const { data: member, error } = await serviceClient
    .from('team_members')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[POST /api/admin/vendors/team] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member }, { status: 201 });
}

// PUT /api/admin/vendors/[id]/team — Update a team member (pass member_id in body)
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

  const memberId = body.member_id as string;
  if (!memberId) {
    return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
  }

  const allowedFields = ['name', 'email', 'role', 'status', 'location_id'];
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: member, error } = await serviceClient
    .from('team_members')
    .update(updateData)
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member });
}

// DELETE /api/admin/vendors/[id]/team — Remove a team member (pass member_id in query)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  await params;
  const serviceClient = await createServiceRoleClient();

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('member_id');

  if (!memberId) {
    return NextResponse.json({ error: 'member_id query param is required' }, { status: 400 });
  }

  const { error } = await serviceClient
    .from('team_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
