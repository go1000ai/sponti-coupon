import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const BASE_PROMPT = `You are Mia, SpontiCoupon's friendly support assistant.

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
- Website Import feature lets vendors paste their URL and auto-generate deals
- AI Image Generation: when creating a deal, vendors can click "Generate with AI" to automatically create a professional image for their deal — no photos needed
- Vendors can also convert deal images into short videos using the AI video feature`;

const VENDOR_CONTEXT = `

You are currently helping a VENDOR (business owner). They create and manage deals, not claim them.
Common vendor questions: creating deals, managing subscriptions, reading analytics, setting up loyalty programs, scanning/redeeming customer QR codes, website import, branding, team management, API keys, billing, AI image generation, AI video creation.
If a vendor mentions they don't have images or photos for their deals, recommend the AI Image Generation feature — they can generate professional deal images automatically when creating or editing a deal.
When they ask about QR codes or redemptions, explain from the vendor perspective — they scan or enter codes to redeem customer coupons.`;

const CUSTOMER_CONTEXT = `

You are currently helping a CUSTOMER (deal shopper). They browse, claim, and redeem deals.
Common customer questions: how to find deals, claiming coupons, using QR codes or 6-digit codes at businesses, deposit payments, loyalty rewards, account settings.
When they ask about QR codes, explain they show their QR code or tell the vendor their 6-digit code to redeem.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// POST /api/support/chat — Stateless chat with Mia
export async function POST(request: NextRequest) {
  let body: { messages: ChatMessage[]; userRole?: string; vendorId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { messages, userRole, vendorId } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
  }

  const anthropicKey = process.env.SPONTI_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    return NextResponse.json({
      reply: "Thanks for reaching out! I'm having a little trouble connecting right now. You can open a support ticket below and our team will get back to you shortly.",
    });
  }

  // Build role-aware system prompt
  const roleContext = userRole === 'vendor' ? VENDOR_CONTEXT : CUSTOMER_CONTEXT;
  let systemPrompt = BASE_PROMPT + roleContext;

  // Inject vendor knowledge base entries if available
  let resolvedVendorId = vendorId;

  // If the user is a vendor, use their own ID to fetch their KB
  if (userRole === 'vendor' && !resolvedVendorId) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) resolvedVendorId = user.id;
    } catch {
      // Continue without KB entries
    }
  }

  if (resolvedVendorId) {
    try {
      const serviceClient = await createServiceRoleClient();
      const { data: kbEntries } = await serviceClient
        .from('vendor_knowledge_base')
        .select('question, answer, category')
        .eq('vendor_id', resolvedVendorId)
        .limit(50);

      if (kbEntries && kbEntries.length > 0) {
        const kbText = kbEntries
          .map((e) => `Q: ${e.question}\nA: ${e.answer}`)
          .join('\n\n');
        systemPrompt += `\n\nBusiness-specific knowledge base (use this to answer questions about this business):\n${kbText}`;
      }
    } catch {
      // Continue without KB entries
    }
  }

  try {
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
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
