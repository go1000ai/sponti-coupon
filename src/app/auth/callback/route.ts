import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  console.log('[AUTH CALLBACK] Full URL:', request.url);
  console.log('[AUTH CALLBACK] Params:', Object.fromEntries(searchParams.entries()));

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error, data: sessionData } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData.user) {
      const userId = sessionData.user.id;
      const email = sessionData.user.email || '';
      const meta = sessionData.user.user_metadata || {};

      console.log('[AUTH CALLBACK] User metadata:', JSON.stringify(meta));

      // Resolve params from URL first, fall back to user metadata
      const accountType = searchParams.get('type') || meta.account_type || 'customer';

      // Use service role client to bypass RLS for profile creation
      const adminClient = await createServiceRoleClient();

      // Check if profile already exists (in case of duplicate callback)
      const { data: existingProfile } = await adminClient
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        // Create user profile
        await adminClient.from('user_profiles').insert({
          id: userId,
          role: accountType,
        });

        if (accountType === 'vendor') {
          const businessName = searchParams.get('businessName') || meta.business_name || 'My Business';
          const phone = searchParams.get('phone') || meta.phone || null;
          const address = searchParams.get('address') || meta.address || null;
          const city = searchParams.get('city') || meta.city || null;
          const state = searchParams.get('state') || meta.state || null;
          const zip = searchParams.get('zip') || meta.zip || null;
          const category = searchParams.get('category') || meta.category || null;

          await adminClient.from('vendors').insert({
            id: userId,
            business_name: businessName,
            email,
            phone,
            address,
            city,
            state,
            zip,
            category,
            subscription_tier: 'starter',
            subscription_status: 'incomplete',
          });
        } else {
          const firstName = searchParams.get('firstName') || meta.first_name || null;
          const lastName = searchParams.get('lastName') || meta.last_name || null;
          const phone = searchParams.get('phone') || meta.phone || null;
          const city = searchParams.get('city') || meta.city || null;
          const state = searchParams.get('state') || meta.state || null;
          const zip = searchParams.get('zip') || meta.zip || null;

          await adminClient.from('customers').insert({
            id: userId,
            email,
            first_name: firstName,
            last_name: lastName,
            phone,
            city,
            state,
            zip,
          });
        }
      }

      // Redirect based on account type
      if (accountType === 'vendor') {
        const plan = searchParams.get('plan') || meta.plan || null;
        const interval = searchParams.get('interval') || meta.interval || 'month';
        const promo = searchParams.get('promo') || meta.promo || '';

        console.log('[AUTH CALLBACK] Vendor redirect — Plan:', plan, 'Interval:', interval, 'Promo:', promo);

        if (plan && plan !== 'starter') {
          // Redirect to the subscribe page which handles Stripe checkout client-side
          const subscribeParams = new URLSearchParams({ plan, interval });
          if (promo) subscribeParams.set('promo', promo);
          return NextResponse.redirect(
            `${origin}/subscribe?${subscribeParams.toString()}`
          );
        }

        return NextResponse.redirect(`${origin}/vendor/dashboard`);
      } else {
        return NextResponse.redirect(`${origin}/deals`);
      }
    }
  }

  // Redirect to login on error
  return NextResponse.redirect(`${origin}/auth/login`);
}
