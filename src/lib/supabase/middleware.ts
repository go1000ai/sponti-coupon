import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/* ── Inactivity timeout: 1 hour (in milliseconds) ── */
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const ACTIVITY_COOKIE = 'sb-last-activity';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes — use prefixes to catch ALL sub-routes
  const protectedPrefixes = ['/vendor', '/admin', '/dashboard'];

  const path = request.nextUrl.pathname;

  if (!user) {
    // Clear activity cookie when not authenticated
    response.cookies.delete(ACTIVITY_COOKIE);

    if (protectedPrefixes.some(p => path.startsWith(p))) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ── Inactivity timeout enforcement (server-side) ──
  if (user) {
    const lastActivityStr = request.cookies.get(ACTIVITY_COOKIE)?.value;
    const now = Date.now();

    if (lastActivityStr) {
      const lastActivity = parseInt(lastActivityStr, 10);
      if (!isNaN(lastActivity) && now - lastActivity > INACTIVITY_TIMEOUT_MS) {
        // Session expired due to inactivity — sign out and redirect
        await supabase.auth.signOut();

        const isProtected = protectedPrefixes.some(p => path.startsWith(p));
        const redirectUrl = new URL('/auth/login', request.url);
        if (isProtected) {
          redirectUrl.searchParams.set('redirect', path);
        }
        redirectUrl.searchParams.set('reason', 'inactivity');

        const expiredResponse = NextResponse.redirect(redirectUrl);
        // Clear the activity cookie
        expiredResponse.cookies.delete(ACTIVITY_COOKIE);
        return expiredResponse;
      }
    }

    // Update the last activity timestamp on every authenticated request
    response.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: INACTIVITY_TIMEOUT_MS / 1000, // Auto-expires with the timeout
    });
  }

  // Don't block auth pages — let users always access login/signup
  // The login page itself handles redirecting if already authenticated

  return response;
}
