import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are the support assistant for SpontiCoupon, a coupon and deals marketplace platform.

CRITICAL RULES:
- Keep responses SHORT. 1-3 sentences unless step-by-step instructions are truly needed.
- NEVER use markdown formatting. No bold, no bullet points, no headers, no asterisks, no numbered lists. Write in plain conversational text like a real person typing a message.
- Sound human and natural. Write like a friendly support agent, not a robot.
- Be direct. Get to the point immediately.
- If something needs admin help, just say so briefly and move on.
- Never make up pricing, policies, or features you're unsure about.

Platform context:
Vendors create deals/coupons that customers claim and redeem. Subscription tiers are Starter ($49/mo), Pro ($99/mo), Business ($199/mo), and Enterprise ($499/mo). Customers can browse deals, claim coupons, earn SpontiPoints, and leave reviews. Vendors can set up punch card or points-based loyalty programs. Payments go through Stripe.`;

// POST /api/support/ai-reply — Generate AI reply for a support ticket
export async function POST(request: NextRequest) {
  const serviceClient = await createServiceRoleClient();

  let body: { ticket_id: string; draft_only?: boolean; admin_draft?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ticket_id, draft_only, admin_draft } = body;
  if (!ticket_id) {
    return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 });
  }

  // Get ticket details
  const { data: ticket, error: ticketError } = await serviceClient
    .from('support_tickets')
    .select('*')
    .eq('id', ticket_id)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  // Check if AI is still enabled (skip check for admin draft mode)
  if (!draft_only && !ticket.ai_enabled) {
    return NextResponse.json({ skipped: true, reason: 'AI disabled for this ticket' });
  }

  // Get conversation history
  const { data: messages, error: messagesError } = await serviceClient
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticket_id)
    .order('created_at', { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  // Build conversation for AI
  const conversationContext = (messages || []).map((m: Record<string, unknown>) => {
    const role = m.sender_type === 'user' ? 'Customer/Vendor' : m.sender_type === 'admin' ? 'Admin' : 'AI Assistant';
    return `${role}: ${m.message}`;
  }).join('\n\n');

  const userMessage = `Support Ticket Details:
- Subject: ${ticket.subject}
- Category: ${ticket.category}
- User Type: ${ticket.user_role}
- User Email: ${ticket.user_email}

Conversation History:
${conversationContext}

${draft_only && admin_draft
    ? `The admin has written this draft response and wants you to improve it. Keep the same intent and meaning, but make it clearer, more professional, and more natural-sounding. Do not add unnecessary filler. Here is the admin's draft:\n\n"${admin_draft}"`
    : draft_only
    ? 'Draft a professional admin response to the latest message. Write as if you are a human support admin — do not mention being an AI. The admin will review and edit your draft before sending.'
    : 'Please provide a helpful response to the latest message. If you cannot fully resolve the issue, acknowledge it and let the user know an admin will review their case.'
  }`;

  const anthropicKey = process.env.SPONTI_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    const fallbackMessage = `Thank you for reaching out to SpontiCoupon Support! We've received your ${ticket.category} inquiry and our team will review it shortly. In the meantime, you can check our help resources or reply to this thread with any additional details. We typically respond within 24 hours.`;

    if (draft_only) {
      return NextResponse.json({ success: true, draft: fallbackMessage, source: 'template' });
    }

    await serviceClient
      .from('support_messages')
      .insert({
        ticket_id,
        sender_type: 'ai',
        sender_id: null,
        message: fallbackMessage,
        attachments: [],
      });

    return NextResponse.json({ success: true, source: 'template' });
  }

  try {
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.7,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const aiText = content.text.trim();

      // Draft mode: return text for admin to review, don't insert
      if (draft_only) {
        return NextResponse.json({ success: true, draft: aiText, source: 'ai' });
      }

      // Auto-reply mode: insert as AI message
      await serviceClient
        .from('support_messages')
        .insert({
          ticket_id,
          sender_type: 'ai',
          sender_id: null,
          message: aiText,
          attachments: [],
        });

      // Update ticket timestamp
      await serviceClient
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticket_id);

      return NextResponse.json({ success: true, source: 'ai' });
    }

    return NextResponse.json({ error: 'Unexpected AI response format' }, { status: 500 });
  } catch (err) {
    console.error('[AI Reply] Anthropic error:', err);

    const fallbackMessage = `Thank you for contacting SpontiCoupon Support! We've received your message and our team will get back to you soon. If your issue is urgent, please note that in your reply and we'll prioritize it.`;

    if (draft_only) {
      return NextResponse.json({ success: true, draft: fallbackMessage, source: 'fallback' });
    }

    await serviceClient
      .from('support_messages')
      .insert({
        ticket_id,
        sender_type: 'ai',
        sender_id: null,
        message: fallbackMessage,
        attachments: [],
      });

    return NextResponse.json({ success: true, source: 'fallback' });
  }
}
