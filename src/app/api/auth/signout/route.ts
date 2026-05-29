import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
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

    // Use local scope — only clear cookies for THIS browser session. Global scope (the
    // default) makes a network call to Supabase to revoke all refresh tokens; on edge that
    // network call can hang or fail silently. We only need the cookies cleared here.
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) {
      console.error('[/api/auth/signout] Supabase signOut error:', signOutError.message);
      // Continue regardless — even without a successful Supabase call, we still want to
      // clear the cookies we have on hand so the browser is logged out.
    }

    const response = NextResponse.json({ success: true });

    // Apply cookie deletions (Supabase clears session cookies on sign-out)
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Record<string, string>);
    });

    return response;
  } catch (error) {
    console.error('[/api/auth/signout] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
