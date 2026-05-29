import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendTrialEndingEmail, sendTrialExpiredEmail } from '@/lib/email/trial-lifecycle';

const WARNING_WINDOW_DAYS = 15;
const MAX_PER_CYCLE = 100;

// GET /api/cron/promo-expiry — warn vendors 15 days before promo end; cut off when expired
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
  }

  const supabase = await createServiceRoleClient();
  const now = new Date();
  const warningCutoff = new Date(now.getTime() + WARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  let warned = 0;
  let expired = 0;
  const errors: string[] = [];

  // ── Warning emails: promo ends within next 15 days, not yet warned ──
  const { data: warnVendors, error: warnErr } = await supabase
    .from('vendors')
    .select('id, email, business_name, promo_expires_at')
    .not('promo_code', 'is', null)
    .eq('subscription_status', 'active')
    .is('trial_warning_sent_at', null)
    .gt('promo_expires_at', nowIso)
    .lte('promo_expires_at', warningCutoff)
    .limit(MAX_PER_CYCLE);

  if (warnErr) {
    errors.push(`warn-query: ${warnErr.message}`);
  } else if (warnVendors) {
    for (const v of warnVendors) {
      try {
        if (!v.email || !v.promo_expires_at) continue;
        const daysLeft = Math.max(1, Math.ceil(
          (new Date(v.promo_expires_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        ));
        await sendTrialEndingEmail({
          to: v.email,
          businessName: v.business_name || 'there',
          expiresAt: v.promo_expires_at,
          daysLeft,
        });
        await supabase
          .from('vendors')
          .update({ trial_warning_sent_at: nowIso })
          .eq('id', v.id);
        warned++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`warn ${v.id}: ${msg}`);
      }
    }
  }

  // ── Expiry: promo already ended, still active → cancel + final email ──
  const { data: expVendors, error: expErr } = await supabase
    .from('vendors')
    .select('id, email, business_name, promo_expires_at')
    .not('promo_code', 'is', null)
    .eq('subscription_status', 'active')
    .lte('promo_expires_at', nowIso)
    .limit(MAX_PER_CYCLE);

  if (expErr) {
    errors.push(`exp-query: ${expErr.message}`);
  } else if (expVendors) {
    for (const v of expVendors) {
      try {
        if (!v.promo_expires_at) continue;
        await supabase
          .from('vendors')
          .update({
            subscription_status: 'canceled',
            trial_expired_email_sent_at: v.email ? nowIso : null,
          })
          .eq('id', v.id);

        if (v.email) {
          await sendTrialExpiredEmail({
            to: v.email,
            businessName: v.business_name || 'there',
            expiresAt: v.promo_expires_at,
          });
        }
        expired++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`exp ${v.id}: ${msg}`);
      }
    }
  }

  return NextResponse.json({
    warned,
    expired,
    errors: errors.length ? errors : undefined,
  });
}
