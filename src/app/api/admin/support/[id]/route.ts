import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/support/[id] — Get ticket detail with all messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  const { data: ticket, error: ticketError } = await serviceClient
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  const { data: messages, error: messagesError } = await serviceClient
    .from('support_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  return NextResponse.json({ ticket, messages: messages || [] });
}

// PATCH /api/admin/support/[id] — Update ticket fields (status, priority, ai_enabled, subject, category)
export async function PATCH(
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

  const allowedFields = ['status', 'priority', 'ai_enabled', 'subject', 'category'];
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  updateData.updated_at = new Date().toISOString();

  const { data: ticket, error } = await serviceClient
    .from('support_tickets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ticket });
}

// POST /api/admin/support/[id] — Admin reply to a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  // Verify ticket exists
  const { data: ticket, error: ticketError } = await serviceClient
    .from('support_tickets')
    .select('id')
    .eq('id', id)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, attachments } = body as {
    message: string;
    attachments?: { url: string; filename: string; size: number }[];
  };

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const { data: newMessage, error: messageError } = await serviceClient
    .from('support_messages')
    .insert({
      ticket_id: id,
      sender_type: 'admin',
      sender_id: admin.userId,
      message,
      attachments: attachments || [],
    })
    .select()
    .single();

  if (messageError) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  // Update ticket status to in_progress if it was open
  await serviceClient
    .from('support_tickets')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'open');

  return NextResponse.json({ message: newMessage }, { status: 201 });
}

// DELETE /api/admin/support/[id] — Delete a ticket and all messages
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  // Messages are cascade-deleted via FK
  const { error } = await serviceClient
    .from('support_tickets')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
