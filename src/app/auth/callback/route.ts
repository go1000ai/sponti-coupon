import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { notifyNewSignup } from '@/lib/email/admin-notification';

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

      // Check for promo signup (e.g., Puerto Rico launch, Founding Vendor)
      const promoCode = (searchParams.get('promo') || meta.promo || '').toUpperCase();
      type PromoConfig = { tier: string; freeMonths: number; maxUses?: number };
      const VALID_PROMOS: Record<string, PromoConfig> = {
        PUERTORICO6: { tier: 'business', freeMonths: 3 },
        FOUNDING15: { tier: 'business', freeMonths: 3, maxUses: 15 },
      };
      let promoConfig: PromoConfig | null = VALID_PROMOS[promoCode] || null;

      // Enforce maxUses cap (count vendors already redeeming this code)
      if (promoConfig?.maxUses) {
        const { count } = await adminClient
          .from('vendors')
          .select('id', { count: 'exact', head: true })
          .eq('promo_code', promoCode);
        if ((count ?? 0) >= promoConfig.maxUses) {
          console.log(`[AUTH CALLBACK] Promo ${promoCode} cap reached (${count}/${promoConfig.maxUses}) — falling back to paid signup`);
          promoConfig = null;
        }
      }

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
          const businessType = searchParams.get('businessType') || meta.business_type || 'physical';

          const vendorTz = meta.timezone || (state === 'PR' ? 'America/Puerto_Rico' : 'America/New_York');

          // Calculate promo expiry if applicable
          let promoExpiresAt: string | null = null;
          if (promoConfig) {
            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + promoConfig.freeMonths);
            promoExpiresAt = expiry.toISOString();
          }

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
            business_type: businessType,
            timezone: vendorTz,
            subscription_tier: promoConfig ? promoConfig.tier : 'starter',
            subscription_status: promoConfig ? 'active' : 'incomplete',
            ...(promoConfig ? { promo_code: promoCode, promo_expires_at: promoExpiresAt } : {}),
          });

          // Admin notification — fire-and-forget so a Resend hiccup doesn't break signup
          notifyNewSignup({
            email,
            accountType: 'vendor',
            businessName,
            city: city || undefined,
            state: state || undefined,
            subscriptionTier: promoConfig
              ? `${promoConfig.tier} (PROMO: ${promoCode} — ${promoConfig.freeMonths}mo free)`
              : 'starter (pending checkout)',
          }).catch(() => {});
        } else {
          const firstName = searchParams.get('firstName') || meta.first_name || null;
          const lastName = searchParams.get('lastName') || meta.last_name || null;
          const phone = searchParams.get('phone') || meta.phone || null;
          const city = searchParams.get('city') || meta.city || null;
          const state = searchParams.get('state') || meta.state || null;
          const zip = searchParams.get('zip') || meta.zip || null;
          const customerTz = meta.timezone || 'America/New_York';

          await adminClient.from('customers').insert({
            id: userId,
            email,
            first_name: firstName,
            last_name: lastName,
            phone,
            city,
            state,
            zip,
            timezone: customerTz,
          });

          // Admin notification for new customer
          notifyNewSignup({
            email,
            accountType: 'customer',
            name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
            city: city || undefined,
            state: state || undefined,
          }).catch(() => {});
        }
      }

      // Redirect based on account type
      if (accountType === 'vendor') {
        const plan = searchParams.get('plan') || meta.plan || null;
        const interval = searchParams.get('interval') || meta.interval || 'month';

        console.log('[AUTH CALLBACK] Vendor redirect — Plan:', plan, 'Interval:', interval, 'Promo:', promoCode);

        // Promo vendors go straight to dashboard (no payment needed)
        if (promoConfig) {
          return NextResponse.redirect(`${origin}/vendor/dashboard?welcome=true`);
        }

        if (plan && plan !== 'starter') {
          // Redirect to the subscribe page which handles Stripe checkout client-side
          const subscribeParams = new URLSearchParams({ plan, interval });
          if (promoCode) subscribeParams.set('promo', promoCode);
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
