import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/support — List current user's support tickets
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = serviceClient
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: tickets, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tickets: tickets || [] });
}

// POST /api/support — Create a new support ticket with initial message
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();

  // Get user role
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['vendor', 'customer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only vendors and customers can create tickets' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { subject, category, message, attachments } = body as {
    subject: string;
    category?: string;
    message: string;
    attachments?: { url: string; filename: string; size: number }[];
  };

  if (!subject || !message) {
    return NextResponse.json({ error: 'subject and message are required' }, { status: 400 });
  }

  const validCategories = ['billing', 'technical', 'account', 'general'];
  const ticketCategory = category && validCategories.includes(category) ? category : 'general';

  // Create ticket
  const { data: ticket, error: ticketError } = await serviceClient
    .from('support_tickets')
    .insert({
      user_id: user.id,
      user_email: user.email,
      user_role: profile.role,
      subject,
      category: ticketCategory,
      status: 'open',
      priority: 'medium',
      ai_enabled: true,
    })
    .select()
    .single();

  if (ticketError) {
    console.error('[POST /api/support] Ticket creation error:', ticketError);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }

  // Create initial message
  const { error: messageError } = await serviceClient
    .from('support_messages')
    .insert({
      ticket_id: ticket.id,
      sender_type: 'user',
      sender_id: user.id,
      message,
      attachments: attachments || [],
    });

  if (messageError) {
    console.error('[POST /api/support] Message creation error:', messageError);
  }

  // Trigger AI auto-reply asynchronously if enabled
  if (ticket.ai_enabled) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/support/ai-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticket.id }),
    }).catch(err => console.error('[AI Reply] Trigger error:', err));
  }

  // Send email notification to admin
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { sendSupportNotification } = await import('@/lib/email/support-notification');
    await sendSupportNotification({
      ticketId: ticket.id,
      subject,
      category: ticketCategory,
      userEmail: user.email || '',
      userRole: profile.role,
      adminUrl: `${appUrl}/admin/support/${ticket.id}`,
    });
  } catch (err) {
    console.error('[Support] Email notification error:', err);
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
