import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const accountType = searchParams.get('type') || 'customer';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error, data: sessionData } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData.user) {
      const userId = sessionData.user.id;
      const email = sessionData.user.email || '';

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
          const businessName = searchParams.get('businessName') || 'My Business';
          const phone = searchParams.get('phone') || null;
          const address = searchParams.get('address') || null;
          const city = searchParams.get('city') || null;
          const state = searchParams.get('state') || null;
          const zip = searchParams.get('zip') || null;
          const category = searchParams.get('category') || null;

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
            subscription_status: 'trialing',
          });
        } else {
          const firstName = searchParams.get('firstName') || null;
          const lastName = searchParams.get('lastName') || null;
          const phone = searchParams.get('phone') || null;
          const city = searchParams.get('city') || null;
          const state = searchParams.get('state') || null;
          const zip = searchParams.get('zip') || null;

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
        // Check if a plan was selected — redirect to Stripe checkout
        const plan = searchParams.get('plan');
        const interval = searchParams.get('interval') || 'month';

        if (plan && plan !== 'starter') {
          // Redirect to an intermediate page that will create the Stripe checkout
          const checkoutParams = new URLSearchParams({
            tier: plan,
            interval,
          });
          return NextResponse.redirect(
            `${origin}/vendor/dashboard?checkout=${checkoutParams.toString()}`
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
