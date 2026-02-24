import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

// Geocode an address using OpenStreetMap Nominatim (free, no API key needed)
async function geocodeAddress(address: string, city: string, state: string, zip: string): Promise<{ lat: number; lng: number } | null> {
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

// GET /api/vendor/locations — List all locations for the current vendor
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service role client to ensure we can read locations
  const serviceClient = await createServiceRoleClient();
  const { data: locations, error } = await serviceClient
    .from('vendor_locations')
    .select('*')
    .eq('vendor_id', user.id)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ locations: locations || [] });
}

// POST /api/vendor/locations — Add a new location (Business+ only)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check tier access
  const { data: vendor } = await supabase
    .from('vendors')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const tier = (vendor?.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].multi_location) {
    return NextResponse.json(
      { error: 'Multi-location support requires a Business plan or higher.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, address, city, state, zip, phone } = body;
  let { lat, lng } = body;

  if (!name || !address || !city || !state || !zip) {
    return NextResponse.json({ error: 'Name, address, city, state, and zip are required.' }, { status: 400 });
  }

  // Auto-geocode if lat/lng not provided
  if (!lat || !lng) {
    const coords = await geocodeAddress(address, city, state, zip);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  // Use service role client to bypass RLS for insert
  const serviceClient = await createServiceRoleClient();
  const { data: location, error } = await serviceClient
    .from('vendor_locations')
    .insert({
      vendor_id: user.id,
      name,
      address,
      city,
      state,
      zip,
      lat: lat || 0,
      lng: lng || 0,
      phone: phone || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ location });
}

// PUT /api/vendor/locations — Update a location
export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, name, address, city, state, zip, phone } = body;
  let { lat, lng } = body;

  if (!id) {
    return NextResponse.json({ error: 'Location ID is required.' }, { status: 400 });
  }

  // Auto-geocode if lat/lng not provided
  if (!lat || !lng) {
    const coords = await geocodeAddress(address, city, state, zip);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  // Use service role client to bypass RLS for update
  const serviceClient = await createServiceRoleClient();
  const { data: location, error } = await serviceClient
    .from('vendor_locations')
    .update({
      name,
      address,
      city,
      state,
      zip,
      lat: lat || 0,
      lng: lng || 0,
      phone: phone || null,
    })
    .eq('id', id)
    .eq('vendor_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ location });
}

// DELETE /api/vendor/locations — Delete a location
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Location ID is required.' }, { status: 400 });
  }

  // Use service role client to bypass RLS for delete
  const serviceClient = await createServiceRoleClient();
  const { error } = await serviceClient
    .from('vendor_locations')
    .delete()
    .eq('id', id)
    .eq('vendor_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
