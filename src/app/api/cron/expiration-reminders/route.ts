import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendExpirationReminderEmail } from '@/lib/email/expiration-reminder';

const MAX_EMAILS_PER_CYCLE = 50;

// GET /api/cron/expiration-reminders — Send deal expiration reminder emails
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[cron/expiration-reminders] RESEND_API_KEY not configured');
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
  }

  const serviceClient = await createServiceRoleClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const now = new Date();

  let sent3d = 0;
  let sent1d = 0;
  const errors: string[] = [];

  // ── 3-day reminders ──
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: claims3d, error: err3d } = await serviceClient
    .from('claims')
    .select(`
      id,
      customer_id,
      deal:deals(id, title, expires_at, vendor_id, vendor:vendors(business_name)),
      customer:customers(id, email, first_name, last_name, review_email_opt_out)
    `)
    .eq('redeemed', false)
    .is('expiration_reminder_3d_sent_at', null)
    .limit(MAX_EMAILS_PER_CYCLE);

  if (err3d) {
    console.error('[cron/expiration-reminders] Error fetching 3-day claims:', err3d);
    errors.push(`3d query: ${err3d.message}`);
  }

  if (claims3d) {
    for (const claim of claims3d) {
      try {
        const customer = claim.customer as unknown as {
          id: string; email: string; first_name: string | null; last_name: string | null; review_email_opt_out: boolean;
        } | null;
        const deal = claim.deal as unknown as {
          id: string; title: string; expires_at: string; vendor_id: string; vendor: { business_name: string } | null;
        } | null;

        if (!customer?.email || !deal?.title || !deal.expires_at) continue;

        // Check deal actually expires within the 3-day window (between now and 3 days)
        const expiresDate = new Date(deal.expires_at);
        if (expiresDate <= now || expiresDate > new Date(threeDaysFromNow)) continue;

        // Calculate days left
        const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        // Skip if 1 day or less — that's handled by the 1-day reminder
        if (daysLeft <= 1) continue;

        // Skip opted-out customers but mark as sent
        if (customer.review_email_opt_out) {
          await serviceClient
            .from('claims')
            .update({ expiration_reminder_3d_sent_at: now.toISOString() })
            .eq('id', claim.id);
          continue;
        }

        const customerName = customer.first_name
          ? `${customer.first_name}${customer.last_name ? ` ${customer.last_name}` : ''}`
          : customer.email.split('@')[0];
        const businessName = deal.vendor?.business_name || 'the business';

        await sendExpirationReminderEmail({
          to: customer.email,
          customerName,
          businessName,
          dealTitle: deal.title,
          expiresAt: deal.expires_at,
          daysLeft,
          dealUrl: `${appUrl}/dashboard/my-deals`,
          customerId: customer.id,
        });

        // Insert in-app notification
        await serviceClient.from('notifications').insert({
          customer_id: customer.id,
          type: 'deal_expiring',
          title: `Your deal expires in ${daysLeft} days`,
          message: `"${deal.title}" at ${businessName} expires soon. Redeem it before it's too late!`,
          channel: 'in_app',
          read: false,
        });

        // Mark as sent
        await serviceClient
          .from('claims')
          .update({ expiration_reminder_3d_sent_at: now.toISOString() })
          .eq('id', claim.id);

        sent3d++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[cron/expiration-reminders] 3d error for claim ${claim.id}:`, msg);
        errors.push(`3d claim ${claim.id}: ${msg}`);
      }
    }
  }

  // ── 1-day reminders ──
  const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();

  const { data: claims1d, error: err1d } = await serviceClient
    .from('claims')
    .select(`
      id,
      customer_id,
      deal:deals(id, title, expires_at, vendor_id, vendor:vendors(business_name)),
      customer:customers(id, email, first_name, last_name, review_email_opt_out)
    `)
    .eq('redeemed', false)
    .is('expiration_reminder_1d_sent_at', null)
    .limit(MAX_EMAILS_PER_CYCLE);

  if (err1d) {
    console.error('[cron/expiration-reminders] Error fetching 1-day claims:', err1d);
    errors.push(`1d query: ${err1d.message}`);
  }

  if (claims1d) {
    for (const claim of claims1d) {
      try {
        const customer = claim.customer as unknown as {
          id: string; email: string; first_name: string | null; last_name: string | null; review_email_opt_out: boolean;
        } | null;
        const deal = claim.deal as unknown as {
          id: string; title: string; expires_at: string; vendor_id: string; vendor: { business_name: string } | null;
        } | null;

        if (!customer?.email || !deal?.title || !deal.expires_at) continue;

        // Check deal expires within 1 day
        const expiresDate = new Date(deal.expires_at);
        if (expiresDate <= now || expiresDate > new Date(oneDayFromNow)) continue;

        // Skip opted-out customers but mark as sent
        if (customer.review_email_opt_out) {
          await serviceClient
            .from('claims')
            .update({ expiration_reminder_1d_sent_at: now.toISOString() })
            .eq('id', claim.id);
          continue;
        }

        const customerName = customer.first_name
          ? `${customer.first_name}${customer.last_name ? ` ${customer.last_name}` : ''}`
          : customer.email.split('@')[0];
        const businessName = deal.vendor?.business_name || 'the business';

        await sendExpirationReminderEmail({
          to: customer.email,
          customerName,
          businessName,
          dealTitle: deal.title,
          expiresAt: deal.expires_at,
          daysLeft: 1,
          dealUrl: `${appUrl}/dashboard/my-deals`,
          customerId: customer.id,
        });

        // Insert in-app notification — urgent
        await serviceClient.from('notifications').insert({
          customer_id: customer.id,
          type: 'deal_expiring',
          title: 'Your deal expires tomorrow!',
          message: `"${deal.title}" at ${businessName} expires tomorrow. This is your last chance to redeem it!`,
          channel: 'in_app',
          read: false,
        });

        await serviceClient
          .from('claims')
          .update({ expiration_reminder_1d_sent_at: now.toISOString() })
          .eq('id', claim.id);

        sent1d++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[cron/expiration-reminders] 1d error for claim ${claim.id}:`, msg);
        errors.push(`1d claim ${claim.id}: ${msg}`);
      }
    }
  }

  return NextResponse.json({
    sent_3d: sent3d,
    sent_1d: sent1d,
    errors: errors.length > 0 ? errors : undefined,
  });
}
