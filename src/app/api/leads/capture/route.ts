import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimitDb } from '@/lib/rate-limit';
import { sendNewLeadNotification } from '@/lib/email/new-lead-notification';

// POST /api/leads/capture — Save prospect lead + fire GHL webhook
export async function POST(request: NextRequest) {
  // Cross-instance via Postgres — prevents bots from scattering submissions across instances.
  const limited = await rateLimitDb(request, { maxRequests: 10, windowMs: 60 * 60 * 1000, identifier: 'lead-capture' });
  if (limited) return limited;

  let body: { name?: string; email?: string; phone?: string; business_name?: string; source?: string; notes?: string; sms_consent?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, email, phone, business_name, source, notes, sms_consent } = body;

  if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  // Reject oversized fields so they can't be relayed to the admin email / GHL webhook.
  const overLimit = [
    [name, 200], [phone, 40], [business_name, 200], [source, 80], [notes, 2000],
  ].some(([v, max]) => typeof v === 'string' && v.length > (max as number));
  if (overLimit) {
    return NextResponse.json({ error: 'One or more fields exceed the maximum length' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // Save to prospect_leads table
  const { data: lead, error } = await supabase
    .from('prospect_leads')
    .insert({
      name: name?.trim() || null,
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      business_name: business_name?.trim() || null,
      source: source || 'olivia_chat',
      notes: notes?.trim() || null,
    })
    .select('id')
    .single();

  if (error) {
    // Duplicate email within 24h — not an error, just skip
    if (error.code === '23505') {
      return NextResponse.json({ success: true, message: 'Already captured' });
    }
    console.error('[Lead Capture] DB error:', error.message);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }

  // Fire email notification (fire-and-forget) — admin gets pinged on every new lead
  sendNewLeadNotification({
    leadId: lead.id,
    email: email.trim().toLowerCase(),
    name: name?.trim() || null,
    phone: phone?.trim() || null,
    businessName: business_name?.trim() || null,
    source: source || 'olivia_chat',
    notes: notes?.trim() || null,
  }).catch((err) => {
    console.error('[Lead Capture] Email notification failed:', err);
  });

  // Fire GHL webhook (fire-and-forget)
  const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
  if (ghlWebhookUrl) {
    fetch(ghlWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name?.trim() || '',
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || '',
        business_name: business_name?.trim() || '',
        source: source || 'olivia_chat',
        notes: notes?.trim() || '',
        lead_id: lead.id,
        sms_consent: !!sms_consent,
        sms_consent_date: sms_consent ? new Date().toISOString() : null,
        captured_at: new Date().toISOString(),
      }),
    }).then(async (res) => {
      if (res.ok) {
        // Mark as synced
        await supabase
          .from('prospect_leads')
          .update({ ghl_synced: true })
          .eq('id', lead.id);
      } else {
        console.error('[Lead Capture] GHL webhook failed:', res.status);
      }
    }).catch((err) => {
      console.error('[Lead Capture] GHL webhook error:', err.message);
    });
  }

  return NextResponse.json({ success: true, lead_id: lead.id });
}
