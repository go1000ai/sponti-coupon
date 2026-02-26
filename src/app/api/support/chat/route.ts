import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are Mia, SpontiCoupon's friendly support assistant.

CRITICAL RULES:
- Keep responses SHORT. 1-3 sentences unless step-by-step instructions are truly needed.
- NEVER use markdown formatting. No bold, bullet points, headers, or asterisks. Plain conversational text only.
- Sound human and warm. You're Mia — friendly, helpful, direct.
- Get to the point immediately.
- If something needs admin help or you can't resolve the issue, suggest opening a support ticket.
- Never make up pricing, policies, or features you're unsure about.

Platform context:
- Vendors create deals/coupons, customers claim and redeem them
- Subscription tiers: Starter ($49/mo), Pro ($99/mo), Business ($199/mo), Enterprise ($499/mo)
- Customers browse deals, claim coupons, earn loyalty points, leave reviews
- Vendors set up loyalty programs (punch cards or points)
- Payments go through Stripe
- Every claimed deal gets both a QR code and a 6-digit redemption code
- Deposits: vendor decides per deal — no deposit, deposit, or full payment upfront
- Website Import feature lets vendors paste their URL and auto-generate deals`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// POST /api/support/chat — Stateless chat with Mia
export async function POST(request: NextRequest) {
  let body: { messages: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
  }

  const anthropicKey = process.env.SPONTI_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    return NextResponse.json({
      reply: "Thanks for reaching out! I'm having a little trouble connecting right now. You can open a support ticket below and our team will get back to you shortly.",
    });
  }

  try {
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return NextResponse.json({ reply: content.text.trim() });
    }

    return NextResponse.json({
      reply: "I'm sorry, I had trouble processing that. Could you try rephrasing your question?",
    });
  } catch (err) {
    console.error('[Mia Chat] Error:', err);
    return NextResponse.json({
      reply: "I'm having a little trouble right now. If you need immediate help, please open a support ticket below and our team will assist you.",
    });
  }
}
