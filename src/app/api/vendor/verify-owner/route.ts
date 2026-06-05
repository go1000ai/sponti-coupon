import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/vendor/verify-owner  { password }
 * Confirms the currently-logged-in owner's account password — used to exit
 * the locked redeem kiosk so staff can't leave redeem-only mode on their own.
 * Uses a throwaway anon client so the active session/cookies are untouched.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { password } = await request.json();
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ ok: false, error: 'Password required.' }, { status: 400 });
  }

  const probe = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await probe.auth.signInWithPassword({ email: user.email, password });
  // Clean up the probe session immediately.
  if (data?.session) { try { await probe.auth.signOut(); } catch { /* ignore */ } }

  if (error || !data?.user) {
    return NextResponse.json({ ok: false, error: 'Incorrect password.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
