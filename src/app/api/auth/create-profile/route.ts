import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyNewSignup } from '@/lib/email/admin-notification';

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { accountType, ...profileData } = body;

    if (!accountType || !['customer', 'vendor'].includes(accountType)) {
      return NextResponse.json({ error: 'Invalid account type' }, { status: 400 });
    }

    // Use service role client to bypass RLS
    const adminClient = await createServiceRoleClient();

    // Check if profile already exists
    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      // Profile already exists — return the role
      const { data: profile } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      return NextResponse.json({ role: profile?.role, alreadyExists: true });
    }

    // Create user profile
    await adminClient.from('user_profiles').insert({
      id: user.id,
      role: accountType,
    });

    if (accountType === 'vendor') {
      const isOnline = profileData.businessType === 'online';

      // Validate required address fields for physical vendors
      if (!isOnline && (!profileData.address || !profileData.city || !profileData.state || !profileData.zip)) {
        return NextResponse.json({ error: 'Business address is required (address, city, state, ZIP)' }, { status: 400 });
      }

      // Auto-geocode the vendor address (skip for online-only vendors)
      let lat: number | null = null;
      let lng: number | null = null;
      if (!isOnline && profileData.address && profileData.city) {
        try {
          const query = encodeURIComponent(`${profileData.address}, ${profileData.city}, ${profileData.state} ${profileData.zip}, USA`);
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
            { headers: { 'User-Agent': 'SpontiCoupon/1.0' }, signal: AbortSignal.timeout(5000) }
          );
          if (!geoRes.ok) throw new Error('Geocoding request failed');
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lng = parseFloat(geoData[0].lon);
          }
        } catch {
          // Geocoding failed — vendor can update later from settings
        }
      }

      await adminClient.from('vendors').insert({
        id: user.id,
        business_name: profileData.businessName || 'My Business',
        email: user.email || '',
        phone: profileData.phone || null,
        address: profileData.address || null,
        city: profileData.city || null,
        state: profileData.state || null,
        zip: profileData.zip || null,
        lat,
        lng,
        category: profileData.category || null,
        business_type: isOnline ? 'online' : 'physical',
        subscription_tier: 'starter',
        subscription_status: 'incomplete',
      });
    } else {
      await adminClient.from('customers').insert({
        id: user.id,
        email: user.email || '',
        first_name: profileData.firstName || null,
        last_name: profileData.lastName || null,
        phone: profileData.phone || null,
        city: profileData.city || null,
        state: profileData.state || null,
        zip: profileData.zip || null,
      });
    }

    // Fire-and-forget: notify admin of new signup
    notifyNewSignup({
      email: user.email || '',
      accountType,
      name: accountType === 'customer' ? [profileData.firstName, profileData.lastName].filter(Boolean).join(' ') : undefined,
      businessName: accountType === 'vendor' ? profileData.businessName : undefined,
      city: profileData.city,
      state: profileData.state,
      subscriptionTier: accountType === 'vendor' ? 'starter' : undefined,
    }).catch(() => {});

    return NextResponse.json({ role: accountType, created: true });
  } catch (error: unknown) {
    console.error('Profile creation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
