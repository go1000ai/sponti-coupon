import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceClient = await createServiceRoleClient();
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return null;
  return user;
}

// GET /api/admin/knowledge-base — List all KB entries (optionally filtered by vendor)
export async function GET(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId');

  const serviceClient = await createServiceRoleClient();
  let query = serviceClient
    .from('vendor_knowledge_base')
    .select('*, vendors(business_name)')
    .order('created_at', { ascending: false });

  if (vendorId) {
    query = query.eq('vendor_id', vendorId);
  }

  const { data: entries, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: entries || [] });
}

// POST /api/admin/knowledge-base — Create a KB entry for a specific vendor
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { vendorId, question, answer, category } = body;

  if (!vendorId) {
    return NextResponse.json({ error: 'Vendor ID is required.' }, { status: 400 });
  }
  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: 'Question and answer are required.' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();
  const { data: entry, error } = await serviceClient
    .from('vendor_knowledge_base')
    .insert({
      vendor_id: vendorId,
      question: question.trim(),
      answer: answer.trim(),
      category: category?.trim() || 'General',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry });
}

// PUT /api/admin/knowledge-base — Update a KB entry
export async function PUT(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, question, answer, category } = body;

  if (!id) {
    return NextResponse.json({ error: 'Entry ID is required.' }, { status: 400 });
  }
  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: 'Question and answer are required.' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();
  const { data: entry, error } = await serviceClient
    .from('vendor_knowledge_base')
    .update({
      question: question.trim(),
      answer: answer.trim(),
      category: category?.trim() || 'General',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry });
}

// DELETE /api/admin/knowledge-base — Delete a KB entry
export async function DELETE(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Entry ID is required.' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();
  const { error } = await serviceClient
    .from('vendor_knowledge_base')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
