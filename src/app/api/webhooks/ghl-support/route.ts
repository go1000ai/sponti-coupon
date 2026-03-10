import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/webhooks/ghl-support
 *
 * Called by GoHighLevel when Olivia (AI voice agent) creates a support ticket
 * from a phone call. Creates a support ticket visible in the admin dashboard.
 *
 * Expected payload from GHL workflow:
 * {
 *   caller_name: string,
 *   caller_phone: string,
 *   caller_email?: string,
 *   subject: string,
 *   message: string,
 *   category?: "billing" | "technical" | "account" | "general",
 *   priority?: "low" | "medium" | "high" | "urgent",
 *   caller_role?: "vendor" | "customer" | "caller"
 * }
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = process.env.GHL_SUPPORT_WEBHOOK_SECRET;
  if (secret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    caller_name,
    caller_phone,
    caller_email,
    subject,
    message,
    category,
    priority,
    caller_role,
  } = body as {
    caller_name?: string;
    caller_phone?: string;
    caller_email?: string;
    subject?: string;
    message?: string;
    category?: string;
    priority?: string;
    caller_role?: string;
  };

  if (!subject && !message) {
    return NextResponse.json(
      { error: 'subject or message is required' },
      { status: 400 },
    );
  }

  const validCategories = ['billing', 'technical', 'account', 'general'];
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  const validRoles = ['vendor', 'customer', 'caller'];

  const ticketCategory = category && validCategories.includes(category) ? category : 'general';
  const ticketPriority = priority && validPriorities.includes(priority) ? priority : 'medium';
  const ticketRole = caller_role && validRoles.includes(caller_role) ? caller_role : 'caller';

  const supabase = await createServiceRoleClient();

  // Check if caller has an account (by email or phone)
  let userId: string | null = null;
  let userEmail: string | null = caller_email?.trim() || null;
  let detectedRole = ticketRole;

  if (userEmail) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role, email')
      .eq('email', userEmail)
      .single();

    if (profile) {
      userId = profile.id;
      detectedRole = profile.role;
    }
  }

  // Create the support ticket
  const ticketSubject = subject?.trim() || `Phone support: ${caller_name || caller_phone || 'Unknown caller'}`;

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      user_id: userId,
      user_email: userEmail,
      user_role: detectedRole,
      subject: ticketSubject,
      category: ticketCategory,
      priority: ticketPriority,
      status: 'open',
      ai_enabled: false, // Admin should handle GHL tickets manually
      caller_name: caller_name?.trim() || null,
      caller_phone: caller_phone?.trim() || null,
      source: 'ghl_phone',
    })
    .select()
    .single();

  if (ticketError) {
    console.error('[GHL Support Webhook] Ticket creation error:', ticketError);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }

  // Create the initial message with call details
  const messageBody = [
    message?.trim() || 'No message provided.',
    '',
    '---',
    `Source: Phone call via Olivia (GHL)`,
    caller_name ? `Caller: ${caller_name.trim()}` : null,
    caller_phone ? `Phone: ${caller_phone.trim()}` : null,
    caller_email ? `Email: ${caller_email.trim()}` : null,
  ].filter(Boolean).join('\n');

  const { error: messageError } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticket.id,
      sender_type: 'user',
      sender_id: userId,
      message: messageBody,
    });

  if (messageError) {
    console.error('[GHL Support Webhook] Message creation error:', messageError);
  }

  // Send admin notification email
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { sendSupportNotification } = await import('@/lib/email/support-notification');
    await sendSupportNotification({
      ticketId: ticket.id,
      subject: ticketSubject,
      category: ticketCategory,
      userEmail: userEmail || caller_phone || 'Phone caller',
      userRole: detectedRole,
      adminUrl: `${appUrl}/admin/support/${ticket.id}`,
    });
  } catch (err) {
    console.error('[GHL Support Webhook] Email notification error:', err);
  }

  return NextResponse.json({
    success: true,
    ticket_id: ticket.id,
    subject: ticketSubject,
  }, { status: 201 });
}
