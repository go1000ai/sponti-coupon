import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, businessName, locations, message, plan } = body;

    if (!name || !email || !businessName) {
      return NextResponse.json(
        { error: 'Name, email, and business name are required' },
        { status: 400 },
      );
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
