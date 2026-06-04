import { createServiceRoleClient } from '@/lib/supabase/server';
import { notifyNewSignup } from '@/lib/email/admin-notification';

/**
 * Self-heal a vendor or customer account whose /auth/callback never ran
 * (e.g. Supabase email template redirected straight to home instead of /auth/callback).
 *
 * When a user's email is confirmed in auth.users but their user_profile +
 * vendors/customers rows are missing, this reconstructs them from
 * user.user_metadata. Idempotent — safe to call on every login.
 *
 * Returns the resolved role ('vendor' | 'customer' | null).
 */

type PromoConfig = { tier: string; freeMonths: number; maxUses?: number };

const VALID_PROMOS: Record<string, PromoConfig> = {
  PUERTORICO6: { tier: 'business', freeMonths: 3 },
  FOUNDING15: { tier: 'business', freeMonths: 3, maxUses: 15 },
};

interface AuthUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

export async function selfHealAccountIfNeeded(user: AuthUser): Promise<'vendor' | 'customer' | null> {
  const meta = (user.user_metadata || {}) as Record<string, string | undefined | boolean>;
  const accountType = meta.account_type;

  // Only self-heal vendors/customers that have rich metadata from signup
  if (accountType !== 'vendor' && accountType !== 'customer') return null;

  const adminClient = await createServiceRoleClient();

  // Check if profile already exists — if so, nothing to heal
  const { data: existingProfile } = await adminClient
    .from('user_profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (existingProfile?.role) {
    // Profile already correct — nothing to do
    return existingProfile.role as 'vendor' | 'customer';
  }

  // No profile (or profile with null role). Check if the role-specific table
  // (vendors/customers) already has the row — if so, just fix the profile.
  const tableName = accountType === 'vendor' ? 'vendors' : 'customers';
  const { data: existingRoleRow } = await adminClient
    .from(tableName)
    .select('id')
    .eq('id', user.id)
    .single();

  if (existingRoleRow) {
    await adminClient.from('user_profiles').upsert({ id: user.id, role: accountType });
    return accountType;
  }

  // Both rows missing — full self-heal from auth metadata.
  const email = user.email || (meta.email as string) || '';

  if (accountType === 'vendor') {
    const promoCode = ((meta.promo as string) || '').toUpperCase();
    let promoConfig: PromoConfig | null = VALID_PROMOS[promoCode] || null;

    // Enforce maxUses cap
    if (promoConfig?.maxUses) {
      const { count } = await adminClient
        .from('vendors')
        .select('id', { count: 'exact', head: true })
        .eq('promo_code', promoCode);
      if ((count ?? 0) >= promoConfig.maxUses) {
        console.log(`[self-heal] Promo ${promoCode} cap reached (${count}/${promoConfig.maxUses}) — falling back to paid signup`);
        promoConfig = null;
      }
    }

    const businessName = (meta.business_name as string) || 'My Business';
    const phone = (meta.phone as string) || null;
    const address = (meta.address as string) || null;
    const city = (meta.city as string) || null;
    const state = (meta.state as string) || null;
    const zip = (meta.zip as string) || null;
    const category = (meta.category as string) || null;
    const businessType = (meta.business_type as string) || 'physical';
    const vendorTz = (meta.timezone as string) || (state === 'PR' ? 'America/Puerto_Rico' : 'America/New_York');

    let promoExpiresAt: string | null = null;
    if (promoConfig) {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + promoConfig.freeMonths);
      promoExpiresAt = expiry.toISOString();
    }

    await adminClient.from('user_profiles').upsert({ id: user.id, role: 'vendor' });

    await adminClient.from('vendors').insert({
      id: user.id,
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

    notifyNewSignup({
      email,
      accountType: 'vendor',
      businessName,
      city: city || undefined,
      state: state || undefined,
      subscriptionTier: promoConfig
        ? `${promoConfig.tier} (PROMO: ${promoCode} — ${promoConfig.freeMonths}mo free) [self-healed]`
        : 'starter (pending checkout) [self-healed]',
    }).catch(() => {});

    return 'vendor';
  }

  // Customer self-heal
  const firstName = (meta.first_name as string) || null;
  const lastName = (meta.last_name as string) || null;
  const phone = (meta.phone as string) || null;
  const city = (meta.city as string) || null;
  const state = (meta.state as string) || null;
  const zip = (meta.zip as string) || null;
  const customerTz = (meta.timezone as string) || 'America/New_York';

  await adminClient.from('user_profiles').upsert({ id: user.id, role: 'customer' });

  await adminClient.from('customers').insert({
    id: user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    phone,
    city,
    state,
    zip,
    timezone: customerTz,
  });

  notifyNewSignup({
    email,
    accountType: 'customer',
    name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
    city: city || undefined,
    state: state || undefined,
  }).catch(() => {});

  return 'customer';
}
