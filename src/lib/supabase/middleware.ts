import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes
  const protectedVendorPaths = ['/vendor/dashboard', '/vendor/deals', '/vendor/analytics', '/vendor/scan'];
  const protectedCustomerPaths = ['/my-deals', '/account'];
  const protectedAdminPaths = ['/admin'];
  const authPaths = ['/auth/login', '/auth/signup', '/auth/vendor-signup'];

  const path = request.nextUrl.pathname;

  if (!user) {
    if (protectedVendorPaths.some(p => path.startsWith(p)) ||
        protectedCustomerPaths.some(p => path.startsWith(p)) ||
        protectedAdminPaths.some(p => path.startsWith(p))) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (user && authPaths.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}
