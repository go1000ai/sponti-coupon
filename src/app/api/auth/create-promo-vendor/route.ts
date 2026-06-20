import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyNewSignup } from '@/lib/email/admin-notification';

const VALID_PROMOS: Record<string, { tier: string; freeMonths: number; maxUses?: number }> = {
  PUERTORICO6: { tier: 'business', freeMonths: 3 },
  FOUNDING15: { tier: 'business', freeMonths: 3 },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { promoCode, businessName, phone, address, city, state, zip, category } = body;

    // Validate promo code
    const normalizedPromo = (promoCode || '').toUpperCase();
    const promo = VALID_PROMOS[normalizedPromo];
    if (!promo) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
    }

    const adminClient = await createServiceRoleClient();

    // Enforce maxUses cap
    if (promo.maxUses) {
      const { count } = await adminClient
        .from('vendors')
        .select('id', { count: 'exact', head: true })
        .eq('promo_code', normalizedPromo);
      if ((count ?? 0) >= promo.maxUses) {
        return NextResponse.json({
          error: 'This founding offer is fully claimed. Please choose a plan to continue.',
          capReached: true,
        }, { status: 409 });
      }
    }

    // Check if profile already exists
    const { data: existing } = await adminClient
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ alreadyExists: true, role: 'vendor' });
    }

    // Create user profile
    await adminClient.from('user_profiles').insert({
      id: user.id,
      role: 'vendor',
    });

    // Calculate promo expiry
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + promo.freeMonths);

    // Auto-geocode
    let lat: number | null = null;
    let lng: number | null = null;
    let locationEstimated = false;

    if (address && city && state && zip) {
      const headers = { 'User-Agent': 'SpontiCoupon/1.0' };
      const base = 'https://nominatim.openstreetmap.org/search';

      // Strategy 1: Structured search
      try {
        const params = new URLSearchParams({
          street: address, city, state, postalcode: zip, country: 'US', format: 'json', limit: '1',
        });
        const res = await fetch(`${base}?${params}`, { headers, signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data?.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      } catch { /* continue */ }

      // Strategy 2: Free-form
      if (!lat) {
        try {
          const q = encodeURIComponent(`${address}, ${city}, ${state} ${zip}, USA`);
          const res = await fetch(`${base}?q=${q}&format=json&limit=1`, { headers, signal: AbortSignal.timeout(5000) });
          const data = await res.json();
          if (data?.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
          }
        } catch { /* continue */ }
      }

      // Strategy 3: City fallback
      if (!lat) {
        try {
          const q = encodeURIComponent(`${city}, ${state} ${zip}, USA`);
          const res = await fetch(`${base}?q=${q}&format=json&limit=1`, { headers, signal: AbortSignal.timeout(5000) });
          const data = await res.json();
          if (data?.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
            locationEstimated = true;
          }
        } catch { /* continue */ }
      }
    }

    // Create vendor record with promo
    await adminClient.from('vendors').insert({
      id: user.id,
      business_name: businessName || 'My Business',
      email: user.email || '',
      phone: phone || null,
      address: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      lat,
      lng,
      location_estimated: locationEstimated,
      category: category || null,
      timezone: state === 'PR' ? 'America/Puerto_Rico' : 'America/New_York',
      subscription_tier: promo.tier,
      subscription_status: 'active',
      promo_code: normalizedPromo,
      promo_expires_at: expiresAt.toISOString(),
    });

    // Notify admin
    notifyNewSignup({
      email: user.email || '',
      accountType: 'vendor',
      businessName,
      city,
      state,
      subscriptionTier: `${promo.tier} (PROMO: ${normalizedPromo} - ${promo.freeMonths}mo free)`,
    }).catch(() => {});

    return NextResponse.json({ success: true, role: 'vendor' });
  } catch (error: unknown) {
    console.error('[create-promo-vendor] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create vendor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
