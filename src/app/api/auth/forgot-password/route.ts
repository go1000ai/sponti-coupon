import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimitDb } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email/password-reset';

// POST /api/auth/forgot-password — Send password reset email
//
// We mint the recovery link via the admin API and deliver it through Resend,
// instead of Supabase's built-in resetPasswordForEmail (whose default SMTP is
// rate-limited and unreliable for production delivery).
export async function POST(request: NextRequest) {
  // Rate limit: 3 attempts per hour per IP (cross-instance via Postgres)
  const limited = await rateLimitDb(request, { maxRequests: 3, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const supabase = await createServiceRoleClient();

    // Generate a recovery link without sending Supabase's own email.
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/auth/reset-password` },
    });

    const actionLink = data?.properties?.action_link;

    if (actionLink) {
      await sendPasswordResetEmail({ email, resetLink: actionLink });
      return NextResponse.json({ success: true });
    }

    // No link generated. The usual reason is that the email isn't a registered
    // user — surface that to the caller so the UI can prompt them to sign up.
    const code = (error as { code?: string } | null)?.code;
    const status = (error as { status?: number } | null)?.status;
    const notFound =
      code === 'user_not_found' ||
      status === 404 ||
      /not\s*found|no\s*user|user.*does.*not.*exist/i.test(error?.message || '');

    if (notFound) {
      return NextResponse.json(
        { success: false, notFound: true, error: 'This email is not in the database. Please start a new account.' },
        { status: 404 },
      );
    }

    // Unexpected error (not a "missing user") — log it but don't leak details.
    console.error('[forgot-password] generateLink error:', error?.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    // e.g. Resend delivery threw. Log, but don't surface internals.
    console.error('[forgot-password] failed to send reset email:', err);
    return NextResponse.json({ success: true });
  }
}
