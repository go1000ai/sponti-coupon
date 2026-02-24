import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier, AutoResponseTone, AutoResponseSettings } from '@/lib/types/database';

// Tone-specific system prompts (same as in ai-assist)
// Each tone MUST produce noticeably different wording, sentence structure, and vocabulary
const TONE_PROMPTS: Record<AutoResponseTone, string> = {
  professional: `You are a corporate communications specialist writing a business reply to a customer review. Use formal, polished language. Start with "Dear [customer name]" or "Thank you for your feedback". Use words like "appreciate", "valued", "ensure", "commitment". NO slang, NO exclamation marks, NO emojis. Sound like a Fortune 500 company's customer service team. If negative, offer specific resolution steps. Keep it 2-3 sentences. Return ONLY the reply text.`,
  friendly: `You are a cheerful, outgoing small business owner replying to a customer review. Be WARM and PERSONAL — use their first name, add exclamation marks, sound genuinely excited! Use phrases like "So glad you loved it!", "You made our day!", "Can't wait to see you again!". Be upbeat and enthusiastic. If negative, be understanding but optimistic: "Oh no! We're so sorry about that — let's make it right!". Keep it 2-3 sentences. Return ONLY the reply text.`,
  casual: `You are replying to a review like you're texting a friend. Keep it VERY short — 1-2 sentences max. Use lowercase-feeling language, contractions, and a laid-back vibe. Examples: "hey thanks! really appreciate you stopping by", "glad you had a good time!", "ah man, sorry about that — hit us up and we'll sort it out". NO formal language, NO "Dear customer", NO corporate speak. Sound like a real human being. Return ONLY the reply text.`,
  grateful: `You are deeply moved and thankful when replying to this customer review. Express PROFOUND gratitude — almost emotional. Use phrases like "This means the world to us", "We're truly humbled", "Your support keeps us going", "We can't thank you enough". If negative, thank them even more: "We're so grateful you took the time to share this — it helps us grow". Be heartfelt and sincere, almost poetic. Keep it 2-3 sentences. Return ONLY the reply text.`,
  empathetic: `You are an emotionally intelligent business owner replying to a customer review. LEAD with validating their feelings. Use phrases like "We completely understand how that feels", "Your experience matters deeply to us", "We hear you". Mirror their emotions back. If positive: "It fills our hearts knowing you felt that way". If negative: "We can only imagine how frustrating that must have been — and we take full responsibility". Focus on emotional connection over business talk. Keep it 2-3 sentences. Return ONLY the reply text.`,
};

const DEFAULT_PROMPT = `You are a customer service expert helping a local business owner reply to a customer review. Write a professional, warm, and appreciative response. If the review is negative, be empathetic and constructive. Keep it concise (2-3 sentences). Return ONLY the reply text, no quotes, no labels.`;

// POST /api/vendor/auto-respond — Process pending auto-responses for a specific vendor
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();
  const result = await processVendorAutoResponses(serviceClient, user.id);
  return NextResponse.json(result);
}

// GET /api/vendor/auto-respond — Cron-triggered: process ALL vendors' pending auto-responses
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();

  // Find all vendors with pending auto-responses
  const { data: pendingReviews } = await serviceClient
    .from('reviews')
    .select('vendor_id')
    .is('vendor_reply', null)
    .not('auto_response_scheduled_at', 'is', null)
    .is('auto_response_sent_at', null);

  if (!pendingReviews || pendingReviews.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Get unique vendor IDs
  const vendorIds = Array.from(new Set(pendingReviews.map(r => r.vendor_id)));

  let totalProcessed = 0;
  for (const vendorId of vendorIds) {
    if (totalProcessed >= 50) break; // Rate limit per cron cycle
    const result = await processVendorAutoResponses(serviceClient, vendorId);
    totalProcessed += result.processed;
  }

  return NextResponse.json({ processed: totalProcessed });
}

// Core processing function for a single vendor
async function processVendorAutoResponses(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  vendorId: string
) {
  // Get vendor settings
  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, category, city, state, subscription_tier, notification_preferences')
    .eq('id', vendorId)
    .single();

  if (!vendor) return { processed: 0 };

  // Check tier access
  const tier = (vendor.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].ai_deal_assistant) return { processed: 0 };

  // Check auto-response settings
  const prefs = vendor.notification_preferences as { auto_response?: AutoResponseSettings } | null;
  const autoSettings = prefs?.auto_response;
  if (!autoSettings?.enabled) return { processed: 0 };

  const delayMs = (autoSettings.delay_hours || 24) * 60 * 60 * 1000;
  const cutoffTime = new Date(Date.now() - delayMs).toISOString();

  // Find reviews that are past the delay threshold
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, customer:customers(first_name, last_name, email)')
    .eq('vendor_id', vendorId)
    .is('vendor_reply', null)
    .not('auto_response_scheduled_at', 'is', null)
    .is('auto_response_sent_at', null)
    .lte('auto_response_scheduled_at', cutoffTime)
    .limit(10); // Process up to 10 per vendor per cycle

  if (!reviews || reviews.length === 0) return { processed: 0 };

  const anthropicKey = process.env.SPONTI_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return { processed: 0 };

  const client = new Anthropic({ apiKey: anthropicKey });
  const tone = autoSettings.tone || 'professional';
  let systemPrompt = TONE_PROMPTS[tone] || DEFAULT_PROMPT;

  if (autoSettings.custom_instructions) {
    systemPrompt += `\n\nAdditional business-specific instructions: ${autoSettings.custom_instructions}`;
  }

  let processed = 0;

  for (const review of reviews) {
    // Skip negative reviews if not enabled
    if (review.rating <= 2 && !autoSettings.include_negative) {
      // Clear the scheduled auto-response
      await supabase
        .from('reviews')
        .update({ auto_response_scheduled_at: null })
        .eq('id', review.id);
      continue;
    }

    try {
      // Build the user message
      const customerName = review.customer?.first_name
        ? `${review.customer.first_name} ${review.customer.last_name || ''}`.trim()
        : review.customer?.email?.split('@')[0] || 'Customer';

      const userMessage = `Business: ${vendor.business_name}\nCategory: ${vendor.category || ''}\nLocation: ${vendor.city || ''}, ${vendor.state || ''}\nCustomer rating: ${review.rating} stars\nCustomer review: ${review.comment || '(no text)'}\nCustomer name: ${customerName}\n\nWrite a reply to this review.`;

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: userMessage }],
        system: systemPrompt,
        temperature: 0.8,
      });

      const content = message.content[0];
      if (content.type === 'text') {
        const replyText = content.text.trim();

        // Save the auto-response
        await supabase
          .from('reviews')
          .update({
            vendor_reply: replyText,
            vendor_replied_at: new Date().toISOString(),
            auto_response_sent_at: new Date().toISOString(),
            auto_response_tone: tone,
            is_auto_response: true,
          })
          .eq('id', review.id)
          .is('vendor_reply', null); // Optimistic concurrency: only if still null

        processed++;
      }
    } catch (err) {
      console.error(`Auto-respond failed for review ${review.id}:`, err);
      // Leave as pending, will retry next cycle
    }
  }

  return { processed };
}
