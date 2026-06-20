import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// Geocode a US zip → { lat, lng } via OpenStreetMap Nominatim (same approach as vendor signup)
async function geocodeZip(zip: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const params = new URLSearchParams({ postalcode: zip, country: 'US', format: 'json', limit: '1' });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'SpontiCoupon/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
}

// GET /api/customer/preferences — current prefs + the category list for the picker
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const admin = await createServiceRoleClient();
  const [{ data: customer }, { data: categories }] = await Promise.all([
    admin.from('customers')
      .select('preferred_categories, email_preferred_deals, location_zip, deal_radius_miles, lat, lng')
      .eq('id', user.id).single(),
    admin.from('categories').select('name, icon, slug').order('name'),
  ]);

  return NextResponse.json({
    preferred_categories: customer?.preferred_categories || [],
    email_preferred_deals: customer?.email_preferred_deals ?? true,
    location_zip: customer?.location_zip || '',
    deal_radius_miles: customer?.deal_radius_miles ?? 50,
    has_location: !!(customer?.lat && customer?.lng),
    categories: categories || [],
  });
}

// PATCH /api/customer/preferences — save categories, email toggle, zip (geocoded), radius
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (Array.isArray(body.preferred_categories)) {
    update.preferred_categories = body.preferred_categories.filter((c: unknown) => typeof c === 'string');
  }
  if (typeof body.email_preferred_deals === 'boolean') {
    update.email_preferred_deals = body.email_preferred_deals;
  }
  if (typeof body.deal_radius_miles === 'number') {
    update.deal_radius_miles = body.deal_radius_miles;
  }
  if (typeof body.location_zip === 'string') {
    const zip = body.location_zip.trim();
    update.location_zip = zip || null;
    if (zip) {
      const geo = await geocodeZip(zip);
      if (geo) { update.lat = geo.lat; update.lng = geo.lng; }
    } else {
      update.lat = null; update.lng = null;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const admin = await createServiceRoleClient();
  const { error } = await admin.from('customers').update(update).eq('id', user.id);
  if (error) {
    console.error('[customer/preferences PATCH]', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }

  return NextResponse.json({ success: true, geocoded: 'lat' in update });
}
