import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Geocode an address using OpenStreetMap Nominatim (structured + free-form + fallback)
async function geocode(address: string, city: string, state: string, zip: string): Promise<{ lat: number; lng: number } | null> {
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
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* continue */ }

  // Strategy 2: Free-form full address query
  try {
    const q = encodeURIComponent(`${address}, ${city}, ${state} ${zip}, USA`);
    const res = await fetch(`${base}?q=${q}&format=json&limit=1`, { headers });
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* continue */ }

  // Strategy 3: City + state + zip fallback (approximate)
  try {
    const q = encodeURIComponent(`${city}, ${state} ${zip}, USA`);
    const res = await fetch(`${base}?q=${q}&format=json&limit=1`, { headers });
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
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

  // Get vendor's current address
  const { data: vendor } = await supabase
    .from('vendors')
    .select('address, city, state, zip')
    .eq('id', user.id)
    .single();

  if (!vendor?.address || !vendor?.city || !vendor?.state || !vendor?.zip) {
    return NextResponse.json({ error: 'Complete address is required' }, { status: 400 });
  }

  const coords = await geocode(vendor.address, vendor.city, vendor.state, vendor.zip);

  if (!coords) {
    return NextResponse.json({ error: 'Could not geocode address. Please verify your address is correct.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vendors')
    .update({ lat: coords.lat, lng: coords.lng })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update coordinates' }, { status: 500 });
  }

  return NextResponse.json({ lat: coords.lat, lng: coords.lng });
}
