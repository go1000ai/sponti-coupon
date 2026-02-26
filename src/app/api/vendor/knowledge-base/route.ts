import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/vendor/knowledge-base — List all KB entries for the current vendor
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();
  const { data: entries, error } = await serviceClient
    .from('vendor_knowledge_base')
    .select('*')
    .eq('vendor_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: entries || [] });
}

// POST /api/vendor/knowledge-base — Create a new KB entry
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { question, answer, category } = body;

  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: 'Question and answer are required.' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();
  const { data: entry, error } = await serviceClient
    .from('vendor_knowledge_base')
    .insert({
      vendor_id: user.id,
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

// PUT /api/vendor/knowledge-base — Update a KB entry
export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    .eq('vendor_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry });
}

// DELETE /api/vendor/knowledge-base — Delete a KB entry
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Entry ID is required.' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();
  const { error } = await serviceClient
    .from('vendor_knowledge_base')
    .delete()
    .eq('id', id)
    .eq('vendor_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
