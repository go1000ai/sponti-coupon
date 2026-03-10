import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // 5 contact submissions per 15 minutes per IP
  const limited = rateLimit(request, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
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
    const { error } = await supabase.from('contact_inquiries').insert({
      name,
      email,
      phone: phone || null,
      business_name: businessName,
      locations: locations || null,
      message: message || null,
      plan: plan || 'enterprise',
      status: 'new',
    });

    if (error) {
      console.error('Failed to store contact inquiry:', error);
      // Don't fail the request — still show success to user
    }

    // TODO: Integrate with Go High-Level webhook here
    // Example: await fetch('https://hooks.gohighlevel.com/...', { method: 'POST', body: JSON.stringify(body) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
