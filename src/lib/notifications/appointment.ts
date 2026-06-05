import type { SupabaseClient } from '@supabase/supabase-js';
import { format, parseISO } from 'date-fns';
import { sendAppointmentConfirmationEmail } from '@/lib/email/appointment-confirmation';
import { sendAppointmentCancellationEmail } from '@/lib/email/appointment-cancellation';
import { createNotifications } from './create';

type AppointmentEvent = 'requested' | 'confirmed' | 'cancelled';

interface NotifyOptions {
  cancelledBy?: 'vendor' | 'customer';
  reason?: string;
}

/**
 * Notify BOTH parties (customer + vendor) of an appointment event, via email
 * and the in-app notification feed. Best-effort: never throws, so it can't
 * break the booking/confirm/cancel request that triggered it.
 */
export async function notifyAppointmentEvent(
  supabase: SupabaseClient,
  appointmentId: string,
  event: AppointmentEvent,
  opts: NotifyOptions = {}
): Promise<void> {
  try {
    const { data: appt } = await supabase
      .from('appointments')
      .select(`
        id, customer_id, vendor_id, start_time, end_time, customer_notes,
        deal:deals(title),
        vendor:vendors(business_name, address, city, state, zip, phone, email),
        customer:customers(email, first_name, last_name)
      `)
      .eq('id', appointmentId)
      .single();

    if (!appt) return;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const deal = (Array.isArray(appt.deal) ? appt.deal[0] : appt.deal) as any;
    const vendor = (Array.isArray(appt.vendor) ? appt.vendor[0] : appt.vendor) as any;
    const customer = (Array.isArray(appt.customer) ? appt.customer[0] : appt.customer) as any;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const dealTitle = deal?.title || 'your deal';
    const businessName = vendor?.business_name || 'the business';
    const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim()
      || customer?.email
      || 'Customer';
    const address = [vendor?.address, vendor?.city, vendor?.state, vendor?.zip].filter(Boolean).join(', ') || undefined;
    const whenLabel = format(parseISO(appt.start_time), 'EEE, MMM d · h:mm a');

    const emailBase = {
      businessName,
      dealTitle,
      appointmentDate: appt.start_time as string,
      appointmentEnd: appt.end_time as string,
      address,
      phone: vendor?.phone || undefined,
    };

    const emails: Promise<unknown>[] = [];

    if (event === 'requested') {
      if (customer?.email) {
        emails.push(sendAppointmentConfirmationEmail({
          ...emailBase, to: customer.email, recipientName: customerName,
          customerNotes: appt.customer_notes || undefined, pending: true,
        }));
      }
      if (vendor?.email) {
        emails.push(sendAppointmentConfirmationEmail({
          ...emailBase, to: vendor.email, recipientName: businessName,
          isVendorCopy: true, customerName, customerEmail: customer?.email,
          customerNotes: appt.customer_notes || undefined, pending: true,
        }));
      }
      await createNotifications([
        {
          userId: appt.customer_id, type: 'appointment_requested',
          title: 'Appointment requested',
          body: `Awaiting confirmation from ${businessName} — ${whenLabel}.`,
          link: '/dashboard/appointments',
        },
        {
          userId: appt.vendor_id, type: 'appointment_requested',
          title: 'New appointment request',
          body: `${customerName} requested ${dealTitle} — ${whenLabel}. Confirm it.`,
          link: '/vendor/appointments',
        },
      ]);
    } else if (event === 'confirmed') {
      if (customer?.email) {
        emails.push(sendAppointmentConfirmationEmail({
          ...emailBase, to: customer.email, recipientName: customerName,
          customerNotes: appt.customer_notes || undefined, pending: false,
        }));
      }
      if (vendor?.email) {
        emails.push(sendAppointmentConfirmationEmail({
          ...emailBase, to: vendor.email, recipientName: businessName,
          isVendorCopy: true, customerName, customerEmail: customer?.email, pending: false,
        }));
      }
      await createNotifications([
        {
          userId: appt.customer_id, type: 'appointment_confirmed',
          title: 'Appointment confirmed',
          body: `${businessName} confirmed your appointment — ${whenLabel}.`,
          link: '/dashboard/appointments',
        },
        {
          userId: appt.vendor_id, type: 'appointment_confirmed',
          title: 'Appointment confirmed',
          body: `${customerName}'s appointment is confirmed — ${whenLabel}.`,
          link: '/vendor/appointments',
        },
      ]);
    } else if (event === 'cancelled') {
      const cancelledBy = opts.cancelledBy || 'customer';
      if (customer?.email) {
        emails.push(sendAppointmentCancellationEmail({
          ...emailBase, to: customer.email, recipientName: customerName,
          cancelledBy, reason: opts.reason, customerName,
        }));
      }
      if (vendor?.email) {
        emails.push(sendAppointmentCancellationEmail({
          ...emailBase, to: vendor.email, recipientName: businessName,
          cancelledBy, reason: opts.reason, isVendorCopy: true, customerName,
        }));
      }
      await createNotifications([
        {
          userId: appt.customer_id, type: 'appointment_cancelled',
          title: 'Appointment cancelled',
          body: `Your appointment with ${businessName} (${whenLabel}) was cancelled.`,
          link: '/dashboard/appointments',
        },
        {
          userId: appt.vendor_id, type: 'appointment_cancelled',
          title: 'Appointment cancelled',
          body: `${customerName}'s appointment (${whenLabel}) was cancelled.`,
          link: '/vendor/appointments',
        },
      ]);
    }

    await Promise.allSettled(emails);
  } catch (err) {
    console.error('[notifyAppointmentEvent] failed:', err);
  }
}
