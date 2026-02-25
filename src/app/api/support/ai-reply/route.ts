import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are the AI support assistant for SpontiCoupon, a coupon and deals marketplace platform that connects local businesses (vendors) with customers through deals, coupons, loyalty programs, and more.

Your role:
- Provide helpful, friendly, and concise responses to support inquiries
- Answer questions about how the platform works for both vendors and customers
- Help with common issues like account setup, deal management, coupon redemption, subscription questions, and payment issues
- Be empathetic and professional in all interactions

Important guidelines:
- If you can help resolve the issue, do so clearly with step-by-step instructions
- If the issue requires admin intervention (e.g., billing disputes, account recovery, technical bugs), clearly state that an admin will follow up soon
- Never make up information about pricing, policies, or features you're unsure about
- Keep responses concise but thorough — aim for 2-4 paragraphs max
- Use a warm, professional tone

Platform context:
- Vendors create deals/coupons that customers can claim and redeem
- Vendors have subscription tiers: Starter ($49/mo), Pro ($99/mo), Business ($199/mo), Enterprise ($499/mo)
- Customers can browse deals, claim coupons, earn loyalty points (SpontiPoints), and leave reviews
- Vendors can set up loyalty programs (punch cards or points-based)
- Payment processing is handled via Stripe`;

// POST /api/support/ai-reply — Generate AI reply for a support ticket
export async function POST(request: NextRequest) {
  const serviceClient = await createServiceRoleClient();

  let body: { ticket_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ticket_id } = body;
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

  // Check if AI is still enabled
  if (!ticket.ai_enabled) {
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

Please provide a helpful response to the latest message. If you cannot fully resolve the issue, acknowledge it and let the user know an admin will review their case.`;

  const anthropicKey = process.env.SPONTI_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    // No API key — insert a fallback message
    await serviceClient
      .from('support_messages')
      .insert({
        ticket_id,
        sender_type: 'ai',
        sender_id: null,
        message: `Thank you for reaching out to SpontiCoupon Support! We've received your ${ticket.category} inquiry and our team will review it shortly. In the meantime, you can check our help resources or reply to this thread with any additional details. We typically respond within 24 hours.`,
        attachments: [],
      });

    return NextResponse.json({ success: true, source: 'template' });
  }

  try {
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.7,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      // Insert AI reply
      await serviceClient
        .from('support_messages')
        .insert({
          ticket_id,
          sender_type: 'ai',
          sender_id: null,
          message: content.text.trim(),
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

    // Fallback message on AI failure
    await serviceClient
      .from('support_messages')
      .insert({
        ticket_id,
        sender_type: 'ai',
        sender_id: null,
        message: `Thank you for contacting SpontiCoupon Support! We've received your message and our team will get back to you soon. If your issue is urgent, please note that in your reply and we'll prioritize it.`,
        attachments: [],
      });

    return NextResponse.json({ success: true, source: 'fallback' });
  }
}
