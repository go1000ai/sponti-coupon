import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketingRunType, AgentRunResult, MarketingContentItem } from './types';
import { selectDealForPromotion } from './deal-selector';
import { generateDealPromotion } from './deal-promotion-generator';
import { generateBrandContent, getSuggestedContentType } from './brand-content-generator';
import { getOptimalPostTime } from './scheduler';
import { postMarketingContent } from './poster';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Main marketing agent orchestrator.
 * Called by the cron job or manually from admin.
 *
 * Flow:
 * 1. Post any scheduled items whose time has arrived
 * 2. Generate a deal promotion and auto-schedule it
 * 3. Generate brand content and put it in the approval queue (draft)
 */
export async function runMarketingAgent(
  supabase: SupabaseClient,
  runType: MarketingRunType
): Promise<AgentRunResult> {
  const startTime = Date.now();
  const runId = `${new Date().toISOString().slice(0, 10)}_${runType}`;
  const errors: string[] = [];
  let dealsAnalyzed = 0;
  let promotionsGenerated = 0;
  let brandContentGenerated = 0;
  let autoPosted = 0;
  let queuedForApproval = 0;

  // Record the run start
  await supabase.from('marketing_agent_runs').upsert({
    run_id: runId,
    run_type: runType,
    started_at: new Date().toISOString(),
  }, { onConflict: 'run_id' });

  // ─── Step 1: Post scheduled items whose time has arrived ───
  try {
    const { data: scheduledItems } = await supabase
      .from('marketing_content_queue')
      .select('*')
      .in('status', ['approved', 'scheduled'])
      .lte('scheduled_for', new Date().toISOString())
      .not('scheduled_for', 'is', null);

    if (scheduledItems?.length) {
      for (const item of scheduledItems) {
        try {
          const result = await postMarketingContent(supabase, item as MarketingContentItem);
          if (result.success) autoPosted++;
          else errors.push(...result.errors);
        } catch (err) {
          errors.push(`Post failed for ${item.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }
    }
  } catch (err) {
    errors.push(`Step 1 error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  // ─── Step 2: Generate deal promotion (auto-scheduled) ───
  try {
    const dealTarget = await selectDealForPromotion(supabase, runType);
    dealsAnalyzed++;

    if (dealTarget) {
      // Fetch full deal info for content generation
      const { data: dealData } = await supabase
        .from('deals')
        .select('title, description, deal_type, original_price, deal_price, end_date, image_url, vendor_id, vendors!inner(business_name, city, state, category)')
        .eq('id', dealTarget.dealId)
        .single();

      if (dealData) {
        const vendor = (dealData as Record<string, unknown>).vendors as Record<string, unknown>;
        const content = await generateDealPromotion(
          {
            title: dealData.title,
            description: dealData.description,
            deal_type: dealData.deal_type,
            original_price: dealData.original_price,
            deal_price: dealData.deal_price,
            end_date: dealData.end_date,
            category: (vendor?.category as string) || null,
            image_url: dealData.image_url,
            vendor_name: (vendor?.business_name as string) || 'Local Business',
            vendor_city: (vendor?.city as string) || null,
            vendor_state: (vendor?.state as string) || null,
          },
          dealTarget.reason,
          runType
        );

        // Get optimal post time (15 min from now for deal promotions)
        const { scheduledFor, reason } = await getOptimalPostTime(supabase, runType, 'facebook');

        // Generate image URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';
        const imageUrl = `${appUrl}/api/social/generate-image?deal_id=${dealTarget.dealId}`;

        await supabase.from('marketing_content_queue').insert({
          content_type: 'deal_promotion',
          platforms: ['facebook', 'instagram'],
          caption_facebook: content.facebook,
          caption_instagram: content.instagram,
          hashtags: content.hashtags,
          image_url: imageUrl,
          deal_id: dealTarget.dealId,
          vendor_id: dealData.vendor_id,
          ai_reasoning: content.reasoning,
          ai_content_score: content.contentScore,
          target_audience: content.targetAudience,
          language: 'bilingual',
          scheduled_for: scheduledFor.toISOString(),
          optimal_time_reason: reason,
          status: 'scheduled', // Auto-scheduled, no approval needed
          generated_by_run: runId,
        });

        promotionsGenerated++;
      }
    }
  } catch (err) {
    errors.push(`Step 2 error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  // ─── Step 3: Generate brand content (approval queue) ───
  // Only for morning and evening runs (or manual)
  if (runType === 'morning' || runType === 'evening' || runType === 'manual') {
    try {
      const contentType = getSuggestedContentType();
      const now = new Date();
      const dayOfWeek = DAYS[now.getDay()];
      const timeSlot = runType === 'morning' ? 'morning' : runType === 'evening' ? 'evening' : 'afternoon';

      // Get context data
      const { count: activeDealsCount } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get top categories
      const { data: catData } = await supabase
        .from('deals')
        .select('vendors!inner(category)')
        .eq('status', 'active')
        .limit(50);

      const categories: Record<string, number> = {};
      for (const d of catData || []) {
        const cat = ((d as Record<string, unknown>).vendors as Record<string, unknown>)?.category as string;
        if (cat) categories[cat] = (categories[cat] || 0) + 1;
      }
      const topCategories = Object.entries(categories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([k]) => k);

      // Get recent post types to avoid repetition
      const { data: recentPosts } = await supabase
        .from('marketing_content_queue')
        .select('content_type')
        .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      const recentPostTypes = Array.from(new Set((recentPosts || []).map(p => p.content_type)));

      // For vendor spotlight, pick a vendor
      let vendorName: string | undefined;
      let vendorDescription: string | undefined;
      if (contentType === 'vendor_spotlight') {
        const { data: vendors } = await supabase
          .from('vendors')
          .select('business_name, description')
          .eq('subscription_status', 'active')
          .limit(10);
        if (vendors?.length) {
          const random = vendors[Math.floor(Math.random() * vendors.length)];
          vendorName = random.business_name;
          vendorDescription = random.description;
        }
      }

      const content = await generateBrandContent({
        contentType,
        dayOfWeek,
        timeSlot,
        activeDealsCount: activeDealsCount || 0,
        topCategories,
        recentPostTypes,
        vendorName,
        vendorDescription,
      });

      await supabase.from('marketing_content_queue').insert({
        content_type: contentType,
        platforms: ['facebook', 'instagram'],
        caption_facebook: content.facebook,
        caption_instagram: content.instagram,
        hashtags: content.hashtags,
        image_prompt: content.imagePrompt,
        ai_reasoning: content.reasoning,
        ai_content_score: content.contentScore,
        target_audience: content.targetAudience,
        language: 'bilingual',
        status: 'draft', // Goes to approval queue
        generated_by_run: runId,
      });

      brandContentGenerated++;
      queuedForApproval++;
    } catch (err) {
      errors.push(`Step 3 error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  // ─── Record run results ───
  const durationMs = Date.now() - startTime;

  await supabase.from('marketing_agent_runs').update({
    deals_analyzed: dealsAnalyzed,
    promotions_generated: promotionsGenerated,
    brand_content_generated: brandContentGenerated,
    auto_posted: autoPosted,
    queued_for_approval: queuedForApproval,
    errors: errors.length > 0 ? errors : null,
    completed_at: new Date().toISOString(),
    duration_ms: durationMs,
  }).eq('run_id', runId);

  return {
    runId,
    runType,
    dealsAnalyzed,
    promotionsGenerated,
    brandContentGenerated,
    autoPosted,
    queuedForApproval,
    errors,
    durationMs,
  };
}
