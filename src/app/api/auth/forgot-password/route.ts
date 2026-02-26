import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/auth/forgot-password — Send password reset email
export async function POST(request: NextRequest) {
  // Rate limit: 3 attempts per hour per IP
  const limited = rateLimit(request, { maxRequests: 3, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/reset-password`,
  });

  if (error) {
    console.error('Password reset error:', error);
    // Don't reveal whether the email exists — always return success
  }

  // Always return success to prevent email enumeration
  return NextResponse.json({ success: true });
}
