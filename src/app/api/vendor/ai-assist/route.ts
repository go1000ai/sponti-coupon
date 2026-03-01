import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier, AutoResponseTone } from '@/lib/types/database';
import { rateLimit } from '@/lib/rate-limit';

type AssistType = 'business_description' | 'deal_title' | 'deal_description' | 'review_reply' | 'loyalty_program_name' | 'loyalty_description' | 'loyalty_reward' | 'loyalty_reward_name' | 'loyalty_program_suggest' | 'suggest_variants';

const PROMPTS: Record<AssistType, string> = {
  business_description: `You are a marketing copywriter helping local businesses write compelling business descriptions for their profile on a coupon/deal app. Write a warm, professional, and inviting description that highlights what makes the business special. Keep it under 500 characters. Return ONLY the description text, no quotes, no labels.`,
  deal_title: `You are a marketing expert for local businesses. Write a short, catchy, attention-grabbing deal title (max 60 characters). Make it urgent and compelling. Return ONLY the title text, no quotes, no labels.`,
  deal_description: `You are an expert marketing copywriter for local businesses. Write a vivid, specific 3-5 sentence deal description that makes customers want to act immediately. Use sensory language and concrete details about what the customer will experience, taste, or receive. Mention specific items, flavors, or services — NEVER be vague or generic. Include the actual savings when possible and end with a strong call-to-action. The description should read like a mini advertisement, not generic marketing fluff. Return ONLY the description text, no quotes, no labels.`,
  review_reply: `You are a customer service expert helping a local business owner reply to a customer review. Write a professional, warm, and appreciative response. If the review is negative, be empathetic and constructive. Keep it concise (2-3 sentences). Return ONLY the reply text, no quotes, no labels.`,
  loyalty_program_name: `You are a branding expert helping a local business name their customer loyalty program. Create a catchy, memorable, and on-brand program name that makes customers feel special and excited to participate. The name should be short (2-5 words), easy to remember, and reflect the business category. Examples for inspiration: "Bean Club" for a coffee shop, "Glow Rewards" for a spa, "Fit Points" for a gym. Return ONLY the program name, no quotes, no labels, no explanation.`,
  loyalty_description: `You are a marketing copywriter helping a local business write a short description for their customer loyalty program. Make it exciting and clear — explain the benefit to the customer in 1-2 sentences. Be specific to the business category. Use action words and make the customer feel like they're getting an exclusive deal. Keep it under 200 characters. Return ONLY the description text, no quotes, no labels.`,
  loyalty_reward: `You are a marketing expert helping a local business decide what free reward to offer customers who complete their loyalty punch card. Suggest a specific, enticing, and realistic reward that matches the business category and would motivate repeat visits. Be concrete — not "free item" but "Free Large Iced Coffee" or "Free 30-Minute Massage". Return ONLY the reward text, no quotes, no labels, no explanation.`,
  loyalty_reward_name: `You are a marketing expert helping a local business name a points reward tier for their loyalty program. Create a short, appealing reward name (2-6 words) that sounds exclusive and desirable. Match the business category. Examples: "Free Signature Smoothie", "VIP Styling Session", "Premium Car Wash". Return ONLY the reward name, no quotes, no labels, no explanation.`,
  loyalty_program_suggest: `You are a loyalty program strategist for local businesses. Based on the business category, typical pricing, and any website/deal info provided, design an optimal loyalty rewards program.

Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "program_type": "points",
  "name": "catchy program name (2-5 words)",
  "description": "exciting 1-2 sentence description under 200 chars",
  "points_per_dollar": <number - how many points per dollar-unit spent>,
  "point_value": <number - dollar amount each point represents, e.g. 0.50 means 1 point per $0.50>,
  "suggested_rewards": [
    { "name": "reward name", "points_cost": <number>, "description": "short description" },
    { "name": "reward name", "points_cost": <number>, "description": "short description" },
    { "name": "reward name", "points_cost": <number>, "description": "short description" }
  ]
}

Guidelines:
- Make point_value match the business price range. High-ticket businesses ($50+) might use $1 per point. Budget businesses ($5-15) might use $0.25 or $0.50 per point.
- points_per_dollar is how many points the customer earns per point_value spent. Usually 1-2.
- Suggested rewards should be 3 tiers: easy (50-100 pts), medium (200-500 pts), and aspirational (500-1000 pts).
- Make rewards specific and enticing for the business category.
- The program should incentivize repeat visits.`,
  suggest_variants: `You are a deal pricing strategist for local businesses on a coupon platform. Based on the business category, deal title, description, and base pricing, suggest 2-3 deal variations at different price tiers (e.g., Basic, Premium, Deluxe).

Return ONLY valid JSON (no markdown, no backticks) as an array:
[
  { "name": "short tier name (2-4 words)", "description": "one-sentence description of what this tier includes", "original_price": <number>, "price": <number> },
  { "name": "short tier name (2-4 words)", "description": "one-sentence description of what this tier includes", "original_price": <number>, "price": <number> }
]

Guidelines:
- Create 2-3 tiers from basic to premium
- Each tier should add clear value over the previous one
- Pricing should be realistic for the business category
- Names should be short and descriptive (e.g., "Basic Oil Change", "Full Service Package")
- Descriptions should be specific about what's included — never generic
- Discount should be 20-50% off original price per tier
- If base prices are provided, use them as the middle tier and create tiers around them`,
};

// Tone-specific system prompts for review replies
// Each tone MUST produce noticeably different wording, sentence structure, and vocabulary
const TONE_PROMPTS: Record<AutoResponseTone, string> = {
  professional: `You are a corporate communications specialist writing a business reply to a customer review. Use formal, polished language. Start with "Dear [customer name]" or "Thank you for your feedback". Use words like "appreciate", "valued", "ensure", "commitment". NO slang, NO exclamation marks, NO emojis. Sound like a Fortune 500 company's customer service team. If negative, offer specific resolution steps. Keep it 2-3 sentences. Return ONLY the reply text.`,
  friendly: `You are a cheerful, outgoing small business owner replying to a customer review. Be WARM and PERSONAL — use their first name, add exclamation marks, sound genuinely excited! Use phrases like "So glad you loved it!", "You made our day!", "Can't wait to see you again!". Be upbeat and enthusiastic. If negative, be understanding but optimistic: "Oh no! We're so sorry about that — let's make it right!". Keep it 2-3 sentences. Return ONLY the reply text.`,
  casual: `You are replying to a review like you're texting a friend. Keep it VERY short — 1-2 sentences max. Use lowercase-feeling language, contractions, and a laid-back vibe. Examples: "hey thanks! really appreciate you stopping by", "glad you had a good time!", "ah man, sorry about that — hit us up and we'll sort it out". NO formal language, NO "Dear customer", NO corporate speak. Sound like a real human being. Return ONLY the reply text.`,
  grateful: `You are deeply moved and thankful when replying to this customer review. Express PROFOUND gratitude — almost emotional. Use phrases like "This means the world to us", "We're truly humbled", "Your support keeps us going", "We can't thank you enough". If negative, thank them even more: "We're so grateful you took the time to share this — it helps us grow". Be heartfelt and sincere, almost poetic. Keep it 2-3 sentences. Return ONLY the reply text.`,
  empathetic: `You are an emotionally intelligent business owner replying to a customer review. LEAD with validating their feelings. Use phrases like "We completely understand how that feels", "Your experience matters deeply to us", "We hear you". Mirror their emotions back. If positive: "It fills our hearts knowing you felt that way". If negative: "We can only imagine how frustrating that must have been — and we take full responsibility". Focus on emotional connection over business talk. Keep it 2-3 sentences. Return ONLY the reply text.`,
};

// POST /api/vendor/ai-assist — General AI text assist (Business+ tier only)
export async function POST(request: NextRequest) {
  // Rate limit: 30 AI assist requests per hour
  const limited = rateLimit(request, { maxRequests: 30, windowMs: 60 * 60 * 1000, identifier: 'ai-assist' });
  if (limited) return limited;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type, context, tone, custom_instructions } = body as {
    type: AssistType;
    context: Record<string, string>;
    tone?: AutoResponseTone;
    custom_instructions?: string;
  };

  if (!type || !PROMPTS[type]) {
    return NextResponse.json({ error: 'Invalid assist type' }, { status: 400 });
  }

  // Get vendor info for context + tier check
  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, category, city, state, subscription_tier')
    .eq('id', user.id)
    .single();

  // Check tier access — AI features require Business plan or higher
  const tier = (vendor?.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].ai_deal_assistant) {
    return NextResponse.json(
      { error: 'AI Assist requires a Business plan or higher. Upgrade at /vendor/subscription.' },
      { status: 403 }
    );
  }

  const businessName = vendor?.business_name || context?.business_name || 'My Business';
  const category = vendor?.category || context?.category || '';
  const location = vendor?.city && vendor?.state ? `${vendor.city}, ${vendor.state}` : '';

  // Build user message with context
  let userMessage = `Business: ${businessName}\nCategory: ${category}\nLocation: ${location}\n`;

  if (type === 'business_description') {
    userMessage += `\nWrite a compelling business profile description for this business.`;
    if (context?.current_text) {
      userMessage += `\n\nHere is the current description (improve or rewrite it):\n${context.current_text}`;
    }
  } else if (type === 'deal_title') {
    userMessage += `\nDeal type: ${context?.deal_type === 'sponti_coupon' ? 'Sponti Coupon (flash deal)' : 'Steady Deal'}`;
    if (context?.description) userMessage += `\nDeal description: ${context.description}`;
    userMessage += `\n\nWrite a catchy deal title.`;
    if (context?.current_text) {
      userMessage += `\n\nHere is the current title (improve or rewrite it):\n${context.current_text}`;
    }
  } else if (type === 'deal_description') {
    userMessage += `\nDeal type: ${context?.deal_type === 'sponti_coupon' ? 'Sponti Coupon (flash deal)' : 'Steady Deal'}`;
    if (context?.title) userMessage += `\nDeal title: ${context.title}`;
    if (context?.original_price) userMessage += `\nOriginal price: $${context.original_price}`;
    if (context?.deal_price) userMessage += `\nDeal price: $${context.deal_price}`;
    userMessage += `\n\nWrite a compelling deal description.`;
    if (context?.current_text) {
      userMessage += `\n\nHere is the current description (improve or rewrite it):\n${context.current_text}`;
    }
  } else if (type === 'review_reply') {
    userMessage += `\nCustomer rating: ${context?.rating || '?'} stars`;
    userMessage += `\nCustomer review: ${context?.review_text || '(no text)'}`;
    if (context?.customer_name) userMessage += `\nCustomer name: ${context.customer_name}`;
    userMessage += `\n\nWrite a professional reply to this review.`;
  } else if (type === 'loyalty_program_name') {
    userMessage += `\nProgram type: ${context?.program_type === 'points' ? 'Points System' : 'Punch Card'}`;
    userMessage += `\n\nCreate a catchy loyalty program name for this ${category || ''} business.`;
    if (context?.current_text) {
      userMessage += `\n\nHere is the current name (improve or create a new alternative):\n${context.current_text}`;
    }
  } else if (type === 'loyalty_description') {
    userMessage += `\nProgram type: ${context?.program_type === 'points' ? 'Points System' : 'Punch Card'}`;
    if (context?.program_name) userMessage += `\nProgram name: ${context.program_name}`;
    userMessage += `\n\nWrite a short, exciting description for this loyalty program.`;
    if (context?.current_text) {
      userMessage += `\n\nHere is the current description (improve or rewrite it):\n${context.current_text}`;
    }
  } else if (type === 'loyalty_reward') {
    userMessage += `\nProgram type: Punch Card`;
    if (context?.program_name) userMessage += `\nProgram name: ${context.program_name}`;
    if (context?.punches_required) userMessage += `\nStamps required: ${context.punches_required}`;
    userMessage += `\n\nSuggest a specific, enticing free reward for completing the punch card.`;
    if (context?.current_text) {
      userMessage += `\n\nHere is the current reward (improve or suggest a better alternative):\n${context.current_text}`;
    }
  } else if (type === 'loyalty_reward_name') {
    userMessage += `\nProgram type: Points System`;
    if (context?.program_name) userMessage += `\nProgram name: ${context.program_name}`;
    if (context?.points_cost) userMessage += `\nPoints cost: ${context.points_cost}`;
    userMessage += `\n\nSuggest a reward name for this points tier.`;
    if (context?.current_text) {
      userMessage += `\n\nHere is the current reward name (improve or suggest an alternative):\n${context.current_text}`;
    }
  } else if (type === 'loyalty_program_suggest') {
    if (context?.website_url) userMessage += `\nBusiness website: ${context.website_url}`;
    if (context?.avg_deal_price) userMessage += `\nAverage deal price: $${context.avg_deal_price}`;
    if (context?.deals_info) userMessage += `\nExisting deals: ${context.deals_info}`;
    userMessage += `\n\nDesign an optimal loyalty rewards program for this ${category || ''} business. Consider their typical pricing to set appropriate point values and reward tiers.`;
  } else if (type === 'suggest_variants') {
    if (context?.title) userMessage += `\nDeal title: ${context.title}`;
    if (context?.description) userMessage += `\nDeal description: ${context.description}`;
    if (context?.original_price) userMessage += `\nBase original price: $${context.original_price}`;
    if (context?.deal_price) userMessage += `\nBase deal price: $${context.deal_price}`;
    userMessage += `\n\nSuggest 2-3 deal variations at different price tiers for this ${category || ''} business. Make them specific, creative, and realistic.`;
    if (context?.existing_variants) userMessage += `\n\nExisting variants (improve or suggest alternatives):\n${context.existing_variants}`;
  }

  const anthropicKey = process.env.SPONTI_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;

  if (anthropicKey) {
    try {
      // Use tone-specific prompt for review replies if tone is provided
      let systemPrompt = type === 'review_reply' && tone && TONE_PROMPTS[tone]
        ? TONE_PROMPTS[tone]
        : PROMPTS[type];

      // Append custom instructions if provided (for review replies)
      if (custom_instructions && type === 'review_reply') {
        systemPrompt += `\n\nAdditional business-specific instructions: ${custom_instructions}`;
      }

      const client = new Anthropic({ apiKey: anthropicKey });
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: userMessage }],
        system: systemPrompt,
        temperature: 0.8,
      });

      const content = message.content[0];
      if (content.type === 'text') {
        return NextResponse.json({ text: content.text.trim(), source: 'ai' });
      }
    } catch (err) {
      console.error('AI assist error, falling back to templates:', err);
    }
  }

  // Fallback: simple templates when no API key
  const fallbackText = getFallbackText(type, businessName, category);
  return NextResponse.json({ text: fallbackText, source: 'template' });
}

function getFallbackText(type: AssistType, businessName: string, category: string): string {
  switch (type) {
    case 'business_description':
      return `Welcome to ${businessName}! We're a local ${category || 'business'} dedicated to delivering an exceptional experience to every customer. Whether you're a first-time visitor or a loyal regular, we go above and beyond to make your visit memorable. Stop by today and discover why our community loves us!`;
    case 'deal_title':
      return `${businessName} — Exclusive Savings!`;
    case 'deal_description':
      return `Don't miss this incredible deal from ${businessName}! Enjoy premium ${category || 'products and services'} at an unbeatable price. This limited-time offer is exclusively available to SpontiCoupon users — grab it before it's gone!`;
    case 'review_reply':
      return `Thank you so much for your feedback! We truly appreciate you taking the time to share your experience with ${businessName}. Your satisfaction means the world to us, and we look forward to seeing you again soon!`;
    case 'loyalty_program_name':
      return `${businessName} Rewards`;
    case 'loyalty_description':
      return `Earn rewards every time you shop with ${businessName}! The more you visit, the more you save.`;
    case 'loyalty_reward':
      return `Free ${category || 'item'} of your choice`;
    case 'loyalty_reward_name':
      return `${businessName} Special Reward`;
    case 'loyalty_program_suggest':
      return JSON.stringify({
        program_type: 'points',
        name: `${businessName} Rewards`,
        description: `Earn rewards every time you shop with ${businessName}! The more you visit, the more you save.`,
        points_per_dollar: 1,
        point_value: 1,
        suggested_rewards: [
          { name: `Free ${category || 'Item'}`, points_cost: 100, description: 'Earn 100 points for a free item' },
          { name: `VIP ${category || 'Experience'}`, points_cost: 300, description: 'Premium reward for loyal customers' },
          { name: `${businessName} Grand Prize`, points_cost: 500, description: 'Our best reward for top customers' },
        ],
      });
    case 'suggest_variants':
      return JSON.stringify([
        { name: 'Basic', description: `Standard ${category || 'service'} package`, original_price: 50, price: 30 },
        { name: 'Premium', description: `Enhanced ${category || 'service'} with extras`, original_price: 80, price: 55 },
        { name: 'Deluxe', description: `Full ${category || 'service'} experience`, original_price: 120, price: 85 },
      ]);
    default:
      return '';
  }
}
