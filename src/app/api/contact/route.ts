import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimitDb } from '@/lib/rate-limit';
import { sendNewLeadNotification } from '@/lib/email/new-lead-notification';

export async function POST(request: NextRequest) {
  // 5 contact submissions per 15 minutes per IP (cross-instance via Postgres)
  const limited = await rateLimitDb(request, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    const { name, email, phone, businessName, locations, message, plan, turnstileToken } = body;

    if (!name || !email || !businessName) {
      return NextResponse.json(
        { error: 'Name, email, and business name are required' },
        { status: 400 },
      );
    }

    // Verify Turnstile CAPTCHA if configured
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      if (!turnstileToken) {
        return NextResponse.json({ error: 'CAPTCHA verification required' }, { status: 400 });
      }
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: turnstileSecret, response: turnstileToken }),
      });
      const verify = await verifyRes.json();
      if (!verify.success) {
        return NextResponse.json({ error: 'CAPTCHA verification failed' }, { status: 403 });
      }
    }

    const supabase = await createServiceRoleClient();

    // Store in contact_inquiries table
    const { data: inquiry, error } = await supabase
      .from('contact_inquiries')
      .insert({
        name,
        email,
        phone: phone || null,
        business_name: businessName,
        locations: locations || null,
        message: message || null,
        plan: plan || 'enterprise',
        status: 'new',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to store contact inquiry:', error);
      // Don't fail the request — still show success to user
    }

    // Notify admin (fire-and-forget) — routes to LEAD_NOTIFICATION_EMAIL.
    // Without this, contact-form inquiries land silently in the DB.
    const noteParts = [
      plan ? `Plan: ${plan}` : null,
      locations ? `Locations: ${locations}` : null,
      message ? `Message: ${message}` : null,
    ].filter(Boolean);
    sendNewLeadNotification({
      leadId: inquiry?.id || 'contact_inquiry',
      email,
      name: name || null,
      phone: phone || null,
      businessName: businessName || null,
      source: 'contact_form',
      notes: noteParts.length ? noteParts.join(' • ') : null,
    }).catch((err) => {
      console.error('[Contact] Lead notification failed:', err);
    });

    // TODO: Integrate with Go High-Level webhook here
    // Example: await fetch('https://hooks.gohighlevel.com/...', { method: 'POST', body: JSON.stringify(body) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
