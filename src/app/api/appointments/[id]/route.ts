import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/appointments/[id]
 * Get a single appointment detail.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(`
      *,
      deal:deals(id, title, image_url, deal_price, original_price, timezone, vendor_id),
      vendor:vendors(id, business_name, address, city, state, zip, phone, logo_url, email),
      customer:customers(id, email, first_name, last_name, phone)
    `)
    .eq('id', id)
    .single();

  if (error || !appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }

  // Verify user has access (customer or vendor)
  if (appointment.customer_id !== user.id && appointment.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ appointment });
}

/**
 * PATCH /api/appointments/[id]
 * Update an appointment (cancel, confirm, complete, reschedule, add notes).
 * Body: { action: 'cancel' | 'confirm' | 'complete' | 'no_show', reason?, vendor_notes?, customer_notes? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = await createServiceRoleClient();

  // Get appointment
  const { data: appointment } = await serviceClient
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }

  // Verify access
  const isCustomer = appointment.customer_id === user.id;
  const isVendor = appointment.vendor_id === user.id;
  if (!isCustomer && !isVendor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { action, reason, vendor_notes, customer_notes } = body;

  const updates: Record<string, unknown> = {};

  switch (action) {
    case 'cancel': {
      if (!['pending', 'confirmed'].includes(appointment.status)) {
        return NextResponse.json({ error: 'Cannot cancel this appointment' }, { status: 400 });
      }

      // Check minimum cancellation notice (customers only)
      if (isCustomer) {
        const { data: vendor } = await serviceClient
          .from('vendors')
          .select('appointment_settings')
          .eq('id', appointment.vendor_id)
          .single();

        const minCancelHours = vendor?.appointment_settings?.min_cancel_hours || 24;
        const appointmentTime = new Date(appointment.start_time);
        const hoursUntil = (appointmentTime.getTime() - Date.now()) / (1000 * 60 * 60);

        if (hoursUntil < minCancelHours) {
          return NextResponse.json({
            error: `Cancellations require at least ${minCancelHours} hours notice`,
          }, { status: 400 });
        }
      }

      updates.status = 'cancelled';
      updates.cancelled_by = isVendor ? 'vendor' : 'customer';
      updates.cancellation_reason = reason || null;
      break;
    }

    case 'confirm': {
      if (!isVendor) {
        return NextResponse.json({ error: 'Only vendors can confirm appointments' }, { status: 403 });
      }
      if (appointment.status !== 'pending') {
        return NextResponse.json({ error: 'Can only confirm pending appointments' }, { status: 400 });
      }
      updates.status = 'confirmed';
      break;
    }

    case 'complete': {
      if (!isVendor) {
        return NextResponse.json({ error: 'Only vendors can mark appointments complete' }, { status: 403 });
      }
      if (!['confirmed', 'pending'].includes(appointment.status)) {
        return NextResponse.json({ error: 'Cannot complete this appointment' }, { status: 400 });
      }
      updates.status = 'completed';
      break;
    }

    case 'no_show': {
      if (!isVendor) {
        return NextResponse.json({ error: 'Only vendors can mark no-shows' }, { status: 403 });
      }
      updates.status = 'no_show';
      break;
    }

    default: {
      // Just updating notes
      if (vendor_notes !== undefined && isVendor) {
        updates.vendor_notes = vendor_notes;
      }
      if (customer_notes !== undefined && isCustomer) {
        updates.customer_notes = customer_notes;
      }
      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid action or updates provided' }, { status: 400 });
      }
    }
  }

  const { data: updated, error: updateError } = await serviceClient
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Failed to update appointment:', updateError);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }

  // TODO: Send notification emails (confirmation, cancellation)
  // TODO: Update Google Calendar event if connected

  return NextResponse.json({ appointment: updated });
}
