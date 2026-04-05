import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateTimeSlots, getDayOfWeek, isWithinBookingWindow } from '@/lib/appointments/slot-generator';
import { parseISO } from 'date-fns';

/**
 * GET /api/appointments/slots?deal_id=X&date=YYYY-MM-DD
 * Returns available time slots for a given deal on a given date.
 * Public endpoint (no auth required — customers need to see slots before claiming).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dealId = searchParams.get('deal_id');
  const dateStr = searchParams.get('date');

  if (!dealId || !dateStr) {
    return NextResponse.json({ error: 'deal_id and date are required' }, { status: 400 });
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // 1. Get deal with vendor info
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, vendor_id, requires_appointment, appointment_availability_override, timezone, expires_at, status')
    .eq('id', dealId)
    .single();

  if (dealError || !deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  if (!deal.requires_appointment) {
    return NextResponse.json({ error: 'This deal does not require appointments' }, { status: 400 });
  }

  if (deal.status !== 'active') {
    return NextResponse.json({ error: 'Deal is not active' }, { status: 400 });
  }

  // 2. Get vendor appointment settings
  const { data: vendor } = await supabase
    .from('vendors')
    .select('appointment_settings, business_hours')
    .eq('id', deal.vendor_id)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  const settings = vendor.appointment_settings;
  if (!settings?.enabled) {
    return NextResponse.json({ error: 'Vendor does not accept appointments' }, { status: 400 });
  }

  // 3. Check date is within booking window
  const targetDate = parseISO(dateStr);
  if (!isWithinBookingWindow(targetDate, settings.advance_booking_days)) {
    return NextResponse.json({
      error: `Can only book up to ${settings.advance_booking_days} days in advance`,
      slots: [],
    }, { status: 400 });
  }

  // Check date isn't after deal expires
  const dealExpiry = parseISO(deal.expires_at);
  if (targetDate > dealExpiry) {
    return NextResponse.json({
      error: 'Date is after deal expiration',
      slots: [],
    }, { status: 400 });
  }

  // 4. Check if date is blocked
  const { data: blockedDate } = await supabase
    .from('vendor_blocked_dates')
    .select('id')
    .eq('vendor_id', deal.vendor_id)
    .eq('blocked_date', dateStr)
    .maybeSingle();

  if (blockedDate) {
    return NextResponse.json({
      slots: [],
      date: dateStr,
      deal_id: dealId,
      blocked: true,
      message: 'This date is not available',
    });
  }

  // 5. Get vendor availability for this day of week
  // Use noon to avoid UTC midnight timezone issues
  const localDate = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = localDate.getDay();

  const { data: availability } = await supabase
    .from('vendor_availability')
    .select('*')
    .eq('vendor_id', deal.vendor_id)
    .eq('day_of_week', dayOfWeek)
    .maybeSingle();

  // 6. Get existing appointments for this date
  const { data: existingAppointments } = await supabase
    .from('appointments')
    .select('start_time, end_time, status')
    .eq('vendor_id', deal.vendor_id)
    .eq('appointment_date', dateStr)
    .in('status', ['pending', 'confirmed']);

  // 7. Generate slots
  const slots = generateTimeSlots({
    date: targetDate,
    vendorAvailability: availability || null,
    dealOverride: deal.appointment_availability_override,
    settings,
    existingAppointments: existingAppointments || [],
    timezone: deal.timezone || 'America/New_York',
  });

  return NextResponse.json({
    slots,
    date: dateStr,
    deal_id: dealId,
    settings: {
      slot_duration_minutes: settings.slot_duration_minutes,
      buffer_minutes: settings.buffer_minutes,
      max_concurrent: settings.max_concurrent,
    },
  });
}
