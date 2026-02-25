import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Geocode an address using OpenStreetMap Nominatim
async function geocode(address: string, city: string, state: string, zip: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(`${address}, ${city}, ${state} ${zip}, USA`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { 'User-Agent': 'SpontiCoupon/1.0' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
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
