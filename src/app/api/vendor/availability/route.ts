import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/vendor/availability
 * Returns vendor's availability schedule + appointment settings.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get vendor record with appointment settings
  const { data: vendor } = await supabase
    .from('vendors')
    .select('appointment_settings')
    .eq('id', user.id)
    .single();

  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

  // Get availability rows
  const { data: availability } = await supabase
    .from('vendor_availability')
    .select('*')
    .eq('vendor_id', user.id)
    .order('day_of_week');

  return NextResponse.json({
    settings: vendor.appointment_settings,
    availability: availability || [],
  });
}

/**
 * POST /api/vendor/availability
 * Upserts all 7 days of availability + updates appointment settings.
 * Body: { settings: VendorAppointmentSettings, availability: Array<{ day_of_week, start_time, end_time, is_available }> }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { settings, availability } = body;

  if (!settings || !availability || !Array.isArray(availability)) {
    return NextResponse.json({ error: 'Missing settings or availability array' }, { status: 400 });
  }

  // Validate settings
  const validDurations = [15, 30, 45, 60];
  const validBuffers = [0, 5, 10, 15];

  if (!validDurations.includes(settings.slot_duration_minutes)) {
    return NextResponse.json({ error: 'Invalid slot duration' }, { status: 400 });
  }
  if (!validBuffers.includes(settings.buffer_minutes)) {
    return NextResponse.json({ error: 'Invalid buffer time' }, { status: 400 });
  }
  if (settings.max_concurrent < 1 || settings.max_concurrent > 50) {
    return NextResponse.json({ error: 'Max concurrent must be 1-50' }, { status: 400 });
  }
  if (settings.advance_booking_days < 1 || settings.advance_booking_days > 90) {
    return NextResponse.json({ error: 'Advance booking days must be 1-90' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Update vendor appointment settings
  const { error: settingsError } = await serviceClient
    .from('vendors')
    .update({ appointment_settings: settings })
    .eq('id', user.id);

  if (settingsError) {
    console.error('Failed to update appointment settings:', settingsError);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }

  // Upsert availability for each day
  // For closed days, use default times to satisfy the CHECK constraint (end_time > start_time)
  const upsertRows = availability.map((day: { day_of_week: number; start_time: string; end_time: string; is_available: boolean }) => ({
    vendor_id: user.id,
    day_of_week: day.day_of_week,
    start_time: (!day.is_available || !day.start_time || day.start_time === '00:00') ? '09:00' : day.start_time,
    end_time: (!day.is_available || !day.end_time || day.end_time === '00:00') ? '17:00' : day.end_time,
    is_available: day.is_available,
  }));

  const { error: availError } = await serviceClient
    .from('vendor_availability')
    .upsert(upsertRows, { onConflict: 'vendor_id,day_of_week' });

  if (availError) {
    console.error('Failed to update availability:', availError);
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
