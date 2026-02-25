import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/support/[id] — Get ticket detail with messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  // Get ticket — verify ownership
  const { data: ticket, error: ticketError } = await serviceClient
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  // Get messages
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

// POST /api/support/[id] — Add a reply to a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  // Verify ticket ownership
  const { data: ticket, error: ticketError } = await serviceClient
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  // Don't allow replies on closed tickets
  if (ticket.status === 'closed') {
    return NextResponse.json({ error: 'Cannot reply to a closed ticket' }, { status: 400 });
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

  // Create message
  const { data: newMessage, error: messageError } = await serviceClient
    .from('support_messages')
    .insert({
      ticket_id: id,
      sender_type: 'user',
      sender_id: user.id,
      message,
      attachments: attachments || [],
    })
    .select()
    .single();

  if (messageError) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  // Re-open ticket if it was resolved
  if (ticket.status === 'resolved') {
    await serviceClient
      .from('support_tickets')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .eq('id', id);
  } else {
    await serviceClient
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  // Trigger AI auto-reply if enabled
  if (ticket.ai_enabled) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/support/ai-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: id }),
    }).catch(err => console.error('[AI Reply] Trigger error:', err));
  }

  return NextResponse.json({ message: newMessage }, { status: 201 });
}
