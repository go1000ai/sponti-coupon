import { NextRequest, NextResponse } from 'next/server';
// import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/cron/vendor-roi-email — Monthly vendor ROI email digest (STUB)
// Schedule: 1st of each month at 10 AM UTC (add to vercel.json when ready)
// Cron: "0 10 1 * *"
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ──────────────────────────────────────────────────
  // STUB: Monthly Vendor ROI Email
  // ──────────────────────────────────────────────────
  // When ready to activate:
  //
  // 1. Uncomment createServiceRoleClient import above
  // 2. Query all vendors with active subscriptions
  // 3. For each vendor, fetch ROI metrics for the previous month:
  //    - Customers Sent (unique redeemed customers)
  //    - Repeat Customers (2+ redemptions)
  //    - Estimated Revenue (customers × avg_ticket_value)
  //    - Deal Views (from deal_views table)
  //    - Loyalty Active Customers (loyalty_cards count)
  // 4. Render HTML email template with metrics
  // 5. Send via Resend (getResendClient())
  // 6. Add to vercel.json crons: { "path": "/api/cron/vendor-roi-email", "schedule": "0 10 1 * *" }
  //
  // Template should include:
  //   - Header: "Your Monthly SpontiCoupon ROI Report"
  //   - Period: Previous month name + year
  //   - 5 metric cards (matching the ROI Dashboard)
  //   - CTA: "View Full Dashboard" → /vendor/dashboard
  //   - Footer: Unsubscribe link
  //
  // Feature gate: Only send to vendors with email_digest opt-in
  //   vendor.notification_preferences.email_digest === true
  // ──────────────────────────────────────────────────

  console.log('[cron/vendor-roi-email] Stub executed — email sending not yet implemented');

  return NextResponse.json({
    success: true,
    message: 'Vendor ROI email cron stub — not yet sending emails',
    sent: 0,
    skipped: 0,
  });
}
