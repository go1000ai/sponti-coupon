import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

function decrypt(encrypted: string): string {
  const key = Buffer.from(process.env.SOCIAL_TOKEN_ENCRYPTION_KEY!, 'hex');
  const [ivHex, authTagHex, ciphertext] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function verifyAdminFromRequest() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return null;
  return user;
}

// PUT — AI Marketing Expert: generate captions, campaign ideas, and strategy
export async function PUT(request: NextRequest) {
  const admin = await verifyAdminFromRequest();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { topic, campaign, mode } = await request.json();
  if (!topic && !campaign) return NextResponse.json({ error: 'Topic or campaign required' }, { status: 400 });

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    // Mode: 'ideas' returns multiple post ideas for a campaign
    if (mode === 'ideas') {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a senior social media marketing strategist for SpontiCoupon — a deal marketplace connecting local businesses with customers through flash deals (Sponti Deals) and ongoing deals (Steady Deals).

BUSINESS CONTEXT:
- Vendors (local businesses) pay $49-$499/month subscription to list deals
- Customers browse and claim deals for free, redeem via QR code
- SpontiCoupon is launching in Orlando, FL and expanding
- Website: sponticoupon.com
- Brand colors: Orange (primary), Blue (secondary)
- Tagline ideas: "Deals That Move" / "Your Local Deal Marketplace"

CAMPAIGN: "${campaign || topic}"

Generate 5 social media post ideas for this campaign. For each post, provide:
1. A short title (5-8 words)
2. The full caption text (150-300 chars, with emojis — NEVER purple/violet emojis)
3. Image suggestion (describe what image would work best)
4. Best time to post (day/time)
5. Target audience (vendors, customers, or both)

Return as JSON array:
[{"title":"...","caption":"...","image_suggestion":"...","best_time":"...","target":"vendors|customers|both"}]

Return ONLY valid JSON, no markdown fences.`,
      });

      const text = (result.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        const ideas = JSON.parse(text);
        return NextResponse.json({ ideas });
      } catch {
        return NextResponse.json({ ideas: [], raw: result.text });
      }
    }

    // Default mode: generate a single caption
    const campaignContext = campaign ? `\nCAMPAIGN TYPE: ${campaign}\n` : '';

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a senior social media marketing strategist for SpontiCoupon — a deal marketplace connecting local businesses with customers through flash deals and ongoing deals.

BUSINESS CONTEXT:
- SpontiCoupon is a subscription-based deal marketplace for local businesses
- Vendors pay $49-$499/month to list deals; customers claim deals for free
- Two deal types: Sponti Deals (flash, 4-24 hours, urgency) and Steady Deals (ongoing)
- Launching in Orlando, FL — expanding to more cities
- Website: sponticoupon.com
- Current promotions: Founders 20 (first 20 vendors get lifetime discount), Launch Special pricing
- Value prop for vendors: reach new customers, fill empty seats, boost foot traffic
- Value prop for customers: save money at local restaurants, salons, shops, services
${campaignContext}
TASK: Generate ONE high-engagement social media caption about: "${topic}"

MARKETING RULES:
- Use proven engagement tactics: questions, CTAs, urgency, social proof, FOMO
- Use relevant emojis (fire, money, food, celebration — NEVER purple/violet emojis)
- Include 3-5 hashtags: always #SpontiCoupon plus relevant ones like #LocalDeals #SmallBusiness #Orlando #SupportLocal #DealsNearMe
- Caption length: 150-350 characters (optimal for engagement)
- End with a strong call to action
- If targeting vendors: emphasize ROI, new customers, easy setup, affordable pricing
- If targeting customers: emphasize savings, local discovery, exclusive deals
- Match the tone to the campaign: launch = exciting, founders = exclusive, engagement = conversational

Return ONLY the caption text, nothing else.`,
    });

    return NextResponse.json({ caption: result.text?.trim() || '' });
  } catch (err) {
    console.error('Caption generation error:', err);
    return NextResponse.json({ error: 'Failed to generate caption' }, { status: 500 });
  }
}

// POST — Publish promotional post to brand accounts
export async function POST(request: NextRequest) {
  const admin = await verifyAdminFromRequest();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { caption, image_url, platforms } = await request.json();
  if (!caption) return NextResponse.json({ error: 'Caption required' }, { status: 400 });
  if (!platforms || platforms.length === 0) return NextResponse.json({ error: 'At least one platform required' }, { status: 400 });

  const serviceClient = await createServiceRoleClient();

  // Get brand connections
  const { data: connections } = await serviceClient
    .from('social_connections')
    .select('*')
    .eq('is_brand_account', true)
    .eq('is_active', true);

  if (!connections || connections.length === 0) {
    return NextResponse.json({ error: 'No brand accounts connected' }, { status: 400 });
  }

  const results: { platform: string; success: boolean; error?: string; url?: string }[] = [];

  for (const platform of platforms) {
    const conn = connections.find((c: Record<string, unknown>) => c.platform === platform);
    if (!conn) {
      results.push({ platform, success: false, error: 'No brand account connected for ' + platform });
      continue;
    }

    let accessToken: string;
    try {
      accessToken = decrypt(conn.access_token as string);
    } catch {
      results.push({ platform, success: false, error: 'Failed to decrypt token' });
      continue;
    }

    try {
      if (platform === 'facebook') {
        // Facebook: image post or text post
        let postData: Record<string, string>;
        let endpoint: string;

        if (image_url) {
          endpoint = `${META_GRAPH_URL}/${conn.platform_page_id}/photos`;
          postData = { url: image_url, caption, access_token: accessToken };
        } else {
          endpoint = `${META_GRAPH_URL}/${conn.platform_page_id}/feed`;
          postData = { message: caption, access_token: accessToken };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData),
        });
        const data = await res.json();

        if (data.error) {
          results.push({ platform, success: false, error: data.error.message });
        } else {
          const postId = data.id || data.post_id;
          const postUrl = `https://www.facebook.com/${postId}`;

          // Log to social_posts
          await serviceClient.from('social_posts').insert({
            platform: 'facebook',
            account_type: 'brand',
            caption,
            image_url: image_url || null,
            status: 'posted',
            platform_post_id: postId,
            platform_post_url: postUrl,
            posted_at: new Date().toISOString(),
          });

          results.push({ platform, success: true, url: postUrl });
        }
      }

      if (platform === 'instagram') {
        if (!image_url) {
          results.push({ platform: 'instagram', success: false, error: 'Instagram requires an image URL' });
          continue;
        }

        // Step 1: Create container
        const containerRes = await fetch(`${META_GRAPH_URL}/${conn.platform_page_id}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url,
            caption,
            access_token: accessToken,
          }),
        });
        const containerData = await containerRes.json();

        if (containerData.error) {
          results.push({ platform: 'instagram', success: false, error: containerData.error.message });
          continue;
        }

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Step 2: Publish
        const publishRes = await fetch(`${META_GRAPH_URL}/${conn.platform_page_id}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: containerData.id,
            access_token: accessToken,
          }),
        });
        const publishData = await publishRes.json();

        if (publishData.error) {
          results.push({ platform: 'instagram', success: false, error: publishData.error.message });
          continue;
        }

        // Fetch permalink
        let postUrl = 'https://www.instagram.com/sponticoupon/';
        try {
          const permalinkRes = await fetch(`${META_GRAPH_URL}/${publishData.id}?fields=permalink&access_token=${accessToken}`);
          const permalinkData = await permalinkRes.json();
          if (permalinkData.permalink) postUrl = permalinkData.permalink;
        } catch {
          // Use default URL
        }

        // Log to social_posts
        await serviceClient.from('social_posts').insert({
          platform: 'instagram',
          account_type: 'brand',
          caption,
          image_url,
          status: 'posted',
          platform_post_id: publishData.id,
          platform_post_url: postUrl,
          posted_at: new Date().toISOString(),
        });

        results.push({ platform: 'instagram', success: true, url: postUrl });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({ platform, success: false, error: message });
    }
  }

  return NextResponse.json({ results });
}
