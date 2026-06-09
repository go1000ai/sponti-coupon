import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Convenience redirect for the /qr vendor shortlink: phone keyboards
  // auto-capitalize, so forward /QR, /Qr, /qR to the real lowercase page.
  // Exact JS match (with the !== '/qr' guard) avoids the redirect loop that
  // next.config redirects() would cause via case-insensitive matching.
  const { pathname } = request.nextUrl;
  if (pathname !== '/qr' && pathname.toLowerCase() === '/qr') {
    const url = request.nextUrl.clone();
    url.pathname = '/qr';
    return NextResponse.redirect(url, 308);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
