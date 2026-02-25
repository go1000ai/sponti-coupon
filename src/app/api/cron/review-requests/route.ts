import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendReviewRequestEmail } from '@/lib/email/review-request';

const MAX_EMAILS_PER_CYCLE = 50;

// GET /api/cron/review-requests — Cron-triggered: send review request emails
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure Resend is configured
  if (!process.env.RESEND_API_KEY) {
    console.error('[cron/review-requests] RESEND_API_KEY not configured');
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
  }

  const serviceClient = await createServiceRoleClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Find redeemed claims where:
  // - redeemed = true
  // - redeemed_at is at least 24 hours ago
  // - review_request_sent_at is NULL (not yet sent)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: claims, error: claimsError } = await serviceClient
    .from('claims')
    .select(`
      id,
      customer_id,
      deal_id,
      redeemed_at,
      customer:customers(id, email, first_name, last_name, review_email_opt_out),
      deal:deals(id, title, vendor_id, vendor:vendors(business_name))
    `)
    .eq('redeemed', true)
    .is('review_request_sent_at', null)
    .not('redeemed_at', 'is', null)
    .lte('redeemed_at', twentyFourHoursAgo)
    .limit(MAX_EMAILS_PER_CYCLE);

  if (claimsError) {
    console.error('[cron/review-requests] Error fetching claims:', claimsError);
    return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
  }

  if (!claims || claims.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No pending review requests' });
  }

  let sent = 0;
  let skippedOptOut = 0;
  const errors: string[] = [];

  for (const claim of claims) {
    try {
      // Extract nested data safely
      const customer = claim.customer as unknown as {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        review_email_opt_out: boolean;
      } | null;
      const deal = claim.deal as unknown as {
        id: string;
        title: string;
        vendor_id: string;
        vendor: { business_name: string } | null;
      } | null;

      if (!customer?.email || !deal?.title) {
        console.warn(`[cron/review-requests] Skipping claim ${claim.id}: missing customer email or deal title`);
        continue;
      }

      // Respect unsubscribe — skip opted-out customers but mark as sent
      if (customer.review_email_opt_out) {
        await serviceClient
          .from('claims')
          .update({ review_request_sent_at: new Date().toISOString() })
          .eq('id', claim.id);
        skippedOptOut++;
        continue;
      }

      // Check if customer already reviewed this deal (skip if they have)
      const { data: existingReview } = await serviceClient
        .from('reviews')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('deal_id', deal.id)
        .single();

      if (existingReview) {
        // Already reviewed — mark as sent so we don't query again
        await serviceClient
          .from('claims')
          .update({ review_request_sent_at: new Date().toISOString() })
          .eq('id', claim.id);
        continue;
      }

      const customerName = customer.first_name
        ? `${customer.first_name}${customer.last_name ? ` ${customer.last_name}` : ''}`
        : customer.email.split('@')[0];

      const businessName = deal.vendor?.business_name || 'the business';
      const reviewUrl = `${appUrl}/deals/${deal.id}`;

      await sendReviewRequestEmail({
        to: customer.email,
        customerName,
        businessName,
        dealTitle: deal.title,
        reviewUrl,
        customerId: customer.id,
      });

      // Insert in-app review request + thank-you notifications
      const { error: notifError } = await serviceClient
        .from('notifications')
        .insert([
          {
            customer_id: customer.id,
            type: 'review_request',
            title: `How was your experience at ${businessName}?`,
            message: `We'd love to hear about your experience with "${deal.title}". Leave a review to help other customers!`,
            channel: 'in_app',
            read: false,
          },
          {
            customer_id: customer.id,
            type: 'welcome',
            title: `Thank you for visiting ${businessName}!`,
            message: `Thanks for redeeming "${deal.title}". We appreciate your business and hope to see you again soon!`,
            channel: 'in_app',
            read: false,
          },
        ]);

      if (notifError) {
        console.warn(`[cron/review-requests] Failed to insert notifications for claim ${claim.id}:`, notifError.message);
      }

      // Mark review request as sent
      await serviceClient
        .from('claims')
        .update({ review_request_sent_at: new Date().toISOString() })
        .eq('id', claim.id);

      sent++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[cron/review-requests] Failed to send for claim ${claim.id}:`, errorMsg);
      errors.push(`claim ${claim.id}: ${errorMsg}`);
      // Continue processing remaining claims
    }
  }

  return NextResponse.json({
    sent,
    total_eligible: claims.length,
    skipped_opt_out: skippedOptOut,
    errors: errors.length > 0 ? errors : undefined,
  });
}
