import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendGeocodeFailureEmail } from '@/lib/email/geocode-notification';

interface GeocodeResult {
  lat: number;
  lng: number;
  estimated: boolean; // true = zip/city fallback, false = exact address match
}

// Geocode an address using OpenStreetMap Nominatim (structured + free-form + fallback)
async function geocode(address: string, city: string, state: string, zip: string): Promise<GeocodeResult | null> {
  const headers = { 'User-Agent': 'SpontiCoupon/1.0' };
  const base = 'https://nominatim.openstreetmap.org/search';

  // Strategy 1: Structured search (best for fuzzy/misspelled addresses)
  try {
    const params = new URLSearchParams({
      street: address,
      city,
      state,
      postalcode: zip,
      country: 'US',
      format: 'json',
      limit: '1',
    });
    const res = await fetch(`${base}?${params}`, { headers });
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), estimated: false };
    }
  } catch { /* continue */ }

  // Strategy 2: Free-form full address query
  try {
    const q = encodeURIComponent(`${address}, ${city}, ${state} ${zip}, USA`);
    const res = await fetch(`${base}?q=${q}&format=json&limit=1`, { headers });
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), estimated: false };
    }
  } catch { /* continue */ }

  // Strategy 3: City + state + zip fallback (approximate — location is estimated)
  try {
    const q = encodeURIComponent(`${city}, ${state} ${zip}, USA`);
    const res = await fetch(`${base}?q=${q}&format=json&limit=1`, { headers });
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), estimated: true };
    }
  } catch { /* continue */ }

  return null;
}

// POST /api/vendor/geocode — Geocode vendor's address and update lat/lng
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get vendor's current address + email
  const { data: vendor } = await supabase
    .from('vendors')
    .select('address, city, state, zip, email, business_name')
    .eq('id', user.id)
    .single();

  if (!vendor?.address || !vendor?.city || !vendor?.state || !vendor?.zip) {
    return NextResponse.json({ error: 'Complete address is required' }, { status: 400 });
  }

  const result = await geocode(vendor.address, vendor.city, vendor.state, vendor.zip);

  if (!result) {
    // Total failure — no coords at all
    return NextResponse.json({ error: 'Could not geocode address. Please verify your address is correct.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vendors')
    .update({
      lat: result.lat,
      lng: result.lng,
      location_estimated: result.estimated,
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update coordinates' }, { status: 500 });
  }

  // If location is estimated, email the vendor to fix their address
  if (result.estimated && vendor.email) {
    sendGeocodeFailureEmail({
      vendorEmail: vendor.email,
      vendorName: vendor.business_name || 'Vendor',
      address: `${vendor.address}, ${vendor.city}, ${vendor.state} ${vendor.zip}`,
    }).catch(() => {}); // fire-and-forget
  }

  return NextResponse.json({
    lat: result.lat,
    lng: result.lng,
    estimated: result.estimated,
  });
}
