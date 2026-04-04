import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { parseISO, addMinutes, format } from 'date-fns';

/**
 * POST /api/appointments
 * Create a new appointment.
 * Body: { deal_id, claim_id?, start_time (ISO), customer_notes? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { deal_id, claim_id, start_time, customer_notes } = body;

  if (!deal_id || !start_time) {
    return NextResponse.json({ error: 'deal_id and start_time are required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // 1. Get deal + vendor settings
  const { data: deal } = await serviceClient
    .from('deals')
    .select('id, vendor_id, requires_appointment, appointment_availability_override, timezone, status')
    .eq('id', deal_id)
    .single();

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  if (!deal.requires_appointment) return NextResponse.json({ error: 'Deal does not require appointments' }, { status: 400 });
  if (deal.status !== 'active') return NextResponse.json({ error: 'Deal is not active' }, { status: 400 });

  // Prevent vendor from booking their own deal
  if (deal.vendor_id === user.id) {
    return NextResponse.json({ error: 'Cannot book your own deal' }, { status: 400 });
  }

  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('appointment_settings')
    .eq('id', deal.vendor_id)
    .single();

  if (!vendor?.appointment_settings?.enabled) {
    return NextResponse.json({ error: 'Vendor does not accept appointments' }, { status: 400 });
  }

  const settings = vendor.appointment_settings;
  const startDate = parseISO(start_time);
  const endDate = addMinutes(startDate, settings.slot_duration_minutes);
  const appointmentDate = format(startDate, 'yyyy-MM-dd');

  // 2. Check if date is blocked
  const { data: blocked } = await serviceClient
    .from('vendor_blocked_dates')
    .select('id')
    .eq('vendor_id', deal.vendor_id)
    .eq('blocked_date', appointmentDate)
    .maybeSingle();

  if (blocked) {
    return NextResponse.json({ error: 'This date is not available' }, { status: 400 });
  }

  // 3. Check slot availability (race-condition safe: count in query)
  const { data: overlapping } = await serviceClient
    .from('appointments')
    .select('id')
    .eq('vendor_id', deal.vendor_id)
    .eq('appointment_date', appointmentDate)
    .in('status', ['pending', 'confirmed'])
    .lt('start_time', endDate.toISOString())
    .gt('end_time', startDate.toISOString());

  if ((overlapping?.length || 0) >= settings.max_concurrent) {
    return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 });
  }

  // 4. Check customer doesn't already have an active appointment for this deal
  const { data: existingAppt } = await serviceClient
    .from('appointments')
    .select('id')
    .eq('deal_id', deal_id)
    .eq('customer_id', user.id)
    .in('status', ['pending', 'confirmed'])
    .maybeSingle();

  if (existingAppt) {
    return NextResponse.json({ error: 'You already have an active appointment for this deal' }, { status: 409 });
  }

  // 5. Create the appointment
  const { data: appointment, error: insertError } = await serviceClient
    .from('appointments')
    .insert({
      deal_id,
      vendor_id: deal.vendor_id,
      customer_id: user.id,
      claim_id: claim_id || null,
      appointment_date: appointmentDate,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      status: 'pending',
      customer_notes: customer_notes || null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create appointment:', insertError);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }

  // 6. If claim_id provided, link appointment to claim
  if (claim_id) {
    await serviceClient
      .from('claims')
      .update({ appointment_id: appointment.id })
      .eq('id', claim_id);
  }

  return NextResponse.json({ appointment }, { status: 201 });
}

/**
 * GET /api/appointments?status=upcoming|past|cancelled&role=vendor|customer
 * List appointments for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'upcoming';
  const role = searchParams.get('role');

  // Determine if user is vendor or customer
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isVendor = role === 'vendor' || profile?.role === 'vendor';
  const filterColumn = isVendor ? 'vendor_id' : 'customer_id';

  let query = supabase
    .from('appointments')
    .select(`
      *,
      deal:deals(id, title, image_url, deal_price, original_price, timezone),
      vendor:vendors(id, business_name, address, city, state, zip, phone, logo_url),
      customer:customers(id, email, first_name, last_name, phone)
    `)
    .eq(filterColumn, user.id);

  const now = new Date().toISOString();

  if (status === 'upcoming') {
    query = query
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', now)
      .order('start_time', { ascending: true });
  } else if (status === 'past') {
    query = query
      .in('status', ['completed', 'no_show'])
      .order('start_time', { ascending: false });
  } else if (status === 'cancelled') {
    query = query
      .in('status', ['cancelled', 'rescheduled'])
      .order('updated_at', { ascending: false });
  } else {
    // All appointments
    query = query.order('start_time', { ascending: false });
  }

  const { data: appointments, error } = await query.limit(100);

  if (error) {
    console.error('Failed to fetch appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }

  return NextResponse.json({ appointments: appointments || [] });
}
