import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimitDb } from '@/lib/rate-limit';
import { selfHealAccountIfNeeded } from '@/lib/auth/self-heal';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per 15 minutes per IP (cross-instance via Postgres)
    const limited = await rateLimitDb(request, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
    if (limited) return limited;

    const { email, password, timezone } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Collect cookies that Supabase sets during auth
    const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookies) {
            cookies.forEach((cookie) => {
              cookiesToSet.push(cookie);
            });
          },
        },
      }
    );

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 });
    }

    if (!data.user || !data.session) {
      return NextResponse.json({ error: 'Login failed' }, { status: 401 });
    }

    // Get role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    let role = profile?.role || null;

    // Self-heal vendors/customers whose /auth/callback never created their
    // profile + role-specific record (e.g. Supabase email template redirect
    // bypassed our callback). Idempotent: only acts when records are missing
    // AND user.user_metadata identifies the account type.
    if (!role) {
      const healedRole = await selfHealAccountIfNeeded(data.user);
      if (healedRole) role = healedRole;
    }

    // Update user timezone on each login (handles moves/travel)
    if (timezone && typeof timezone === 'string') {
      const { createServiceRoleClient } = await import('@/lib/supabase/server');
      const svc = await createServiceRoleClient();
      const table = role === 'vendor' ? 'vendors' : 'customers';
      await svc.from(table).update({ timezone }).eq('id', data.user.id);
    }

    // Get subscription info for vendors
    let subscription_status = null;
    let subscription_tier = null;
    if (role === 'vendor') {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('subscription_status, subscription_tier')
        .eq('id', data.user.id)
        .single();

      subscription_status = vendor?.subscription_status || null;
      subscription_tier = vendor?.subscription_tier || null;
    }

    const response = NextResponse.json({
      user: { id: data.user.id, email: data.user.email },
      role,
      subscription_status,
      subscription_tier,
    });

    // Apply all auth cookies to the response
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Record<string, string>);
    });

    return response;
  } catch (error) {
    console.error('[/api/auth/login] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
