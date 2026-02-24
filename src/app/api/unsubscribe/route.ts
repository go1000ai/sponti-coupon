import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateUnsubscribeToken } from '@/lib/email/review-request';

// POST /api/unsubscribe — Process unsubscribe request (called from unsubscribe page)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, token } = body as { id: string; token: string };

  if (!id || !token) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Verify the token to prevent abuse
  const expectedToken = generateUnsubscribeToken(id);
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Invalid unsubscribe link' }, { status: 403 });
  }

  const serviceClient = await createServiceRoleClient();

  // Set review_email_opt_out = true
  const { error } = await serviceClient
    .from('customers')
    .update({ review_email_opt_out: true })
    .eq('id', id);

  if (error) {
    console.error('[unsubscribe] Error opting out:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// GET /api/unsubscribe — One-click unsubscribe (RFC 8058 / List-Unsubscribe header)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const token = searchParams.get('token');

  if (!id || !token) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Verify the token
  const expectedToken = generateUnsubscribeToken(id);
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Invalid unsubscribe link' }, { status: 403 });
  }

  const serviceClient = await createServiceRoleClient();

  await serviceClient
    .from('customers')
    .update({ review_email_opt_out: true })
    .eq('id', id);

  // Redirect to the unsubscribe confirmation page
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${appUrl}/unsubscribe?id=${id}&token=${token}&done=1`);
}
