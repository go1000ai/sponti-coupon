import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { FOUNDING_VENDOR_HTML } from './template';

const BATCH_SIZE = 73;
const SUBJECT = "You're invited: 3 months free on SpontiCoupon — no credit card";
const EMAIL_FROM = 'Heriberto Santiago <hsantiago@sponticoupon.com>';
const GHL_BASE = 'https://services.leadconnectorhq.com';

function htmlEsc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function personalize(template: string, row: { first_name: string | null; company_name: string | null; contact_name: string | null }): string {
  const first = (row.first_name || '').trim();
  const company = (row.company_name || row.contact_name || '').trim();
  let greeting: string;
  if (first && first.toLowerCase() !== company.toLowerCase() && !first.startsWith('(')) {
    greeting = `Hi ${htmlEsc(first)},`;
  } else if (company) {
    greeting = `Hi ${htmlEsc(company)} team,`;
  } else {
    greeting = 'Hi there,';
  }
  return template.replace('Hi Maria,', greeting);
}

async function sendViaGHL(contactId: string, html: string): Promise<{ ok: true; messageId?: string } | { ok: false; status: number; error: string }> {
  const key = process.env.GHL_API_KEY;
  if (!key) return { ok: false, status: 500, error: 'GHL_API_KEY not configured' };

  const res = await fetch(`${GHL_BASE}/conversations/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Version': '2021-07-28',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (server) SpontiCoupon/1.0',
    },
    body: JSON.stringify({ type: 'Email', contactId, subject: SUBJECT, html, emailFrom: EMAIL_FROM }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, status: res.status, error: errBody.slice(0, 300) };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: true, messageId: data.messageId || data.emailMessageId || data.id || undefined };
}

export async function GET(request: NextRequest) {
  // Cron auth — Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  // Pull next BATCH_SIZE pending recipients, ordered by email for stability
  const { data: pending, error: pendingErr } = await supabase
    .from('founding_vendor_queue')
    .select('id, ghl_contact_id, email, first_name, company_name, contact_name, attempts')
    .eq('status', 'pending')
    .order('email', { ascending: true })
    .limit(BATCH_SIZE);

  if (pendingErr) {
    return NextResponse.json({ error: pendingErr.message }, { status: 500 });
  }
  if (!pending || pending.length === 0) {
    return NextResponse.json({ message: 'Queue empty — campaign complete', sent: 0, failed: 0 });
  }

  // Determine batch_day = max(batch_day) + 1 across previously sent rows
  const { data: prev } = await supabase
    .from('founding_vendor_queue')
    .select('batch_day')
    .not('batch_day', 'is', null)
    .order('batch_day', { ascending: false })
    .limit(1);
  const batchDay = ((prev?.[0]?.batch_day ?? 0) as number) + 1;

  const template = FOUNDING_VENDOR_HTML;
  const now = new Date().toISOString();
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of pending) {
    const html = personalize(template, row);
    const result = await sendViaGHL(row.ghl_contact_id, html);

    if (result.ok) {
      await supabase.from('founding_vendor_queue').update({
        status: 'sent',
        attempts: row.attempts + 1,
        sent_at: now,
        ghl_message_id: result.messageId || null,
        batch_day: batchDay,
        last_error: null,
      }).eq('id', row.id);
      sent++;
    } else if (result.status === 400 && /unsubscrib/i.test(result.error)) {
      await supabase.from('founding_vendor_queue').update({
        status: 'skipped_unsubscribed',
        attempts: row.attempts + 1,
        last_error: result.error,
        batch_day: batchDay,
      }).eq('id', row.id);
      skipped++;
    } else {
      await supabase.from('founding_vendor_queue').update({
        attempts: row.attempts + 1,
        last_error: `HTTP ${result.status}: ${result.error}`,
        // Stay 'pending' so we retry — unless we've already tried 3 times
        ...(row.attempts + 1 >= 3 ? { status: 'failed' } : {}),
      }).eq('id', row.id);
      failed++;
      if (errors.length < 5) errors.push(`${row.email}: HTTP ${result.status}`);
    }

    // Gentle pacing — 600ms between calls
    await new Promise(r => setTimeout(r, 600));
  }

  // Snapshot the remaining counts
  const { count: remainingPending } = await supabase
    .from('founding_vendor_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  return NextResponse.json({
    batch_day: batchDay,
    sent,
    skipped_unsubscribed: skipped,
    failed,
    remaining_pending: remainingPending ?? 0,
    errors: errors.length ? errors : undefined,
  });
}
