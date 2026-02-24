import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

    await supabase.auth.signOut();

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
