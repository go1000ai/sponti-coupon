import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendAppointmentReminderEmail } from '@/lib/email/appointment-reminder';

const MAX_EMAILS_PER_CYCLE = 50;

/**
 * GET /api/cron/appointment-reminders
 * Cron job: sends 24h and 1h reminders for confirmed appointments.
 * Also cleans up abandoned pending appointments (>30 min old).
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();
  const now = new Date();
  let emailsSent = 0;

  // ────────────────────────────────────────
  // 1. Send 24-hour reminders
  // ────────────────────────────────────────
  const twentyThreeHoursLater = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
  const twentyFiveHoursLater = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

  const { data: reminder24h } = await supabase
    .from('appointments')
    .select(`
      id, start_time, end_time, customer_notes,
      deal:deals(title, timezone),
      vendor:vendors(business_name, address, city, state, phone, email),
      customer:customers(email, first_name, last_name)
    `)
    .eq('status', 'confirmed')
    .is('reminder_24h_sent_at', null)
    .gte('start_time', twentyThreeHoursLater)
    .lte('start_time', twentyFiveHoursLater)
    .limit(MAX_EMAILS_PER_CYCLE);

  for (const appt of reminder24h || []) {
    const deal = (Array.isArray(appt.deal) ? appt.deal[0] : appt.deal) as { title: string; timezone: string } | null;
    const vendor = (Array.isArray(appt.vendor) ? appt.vendor[0] : appt.vendor) as { business_name: string; address: string; city: string; state: string; phone: string; email: string } | null;
    const customer = (Array.isArray(appt.customer) ? appt.customer[0] : appt.customer) as { email: string; first_name: string; last_name: string } | null;

    if (!deal || !vendor || !customer) continue;

    const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Customer';
    const address = [vendor.address, vendor.city, vendor.state].filter(Boolean).join(', ');

    // Send to customer
    await sendAppointmentReminderEmail({
      to: customer.email,
      recipientName: customerName,
      businessName: vendor.business_name,
      dealTitle: deal.title,
      appointmentDate: appt.start_time,
      appointmentEnd: appt.end_time,
      address,
      phone: vendor.phone || undefined,
      hoursUntil: 24,
    });

    // Send to vendor
    if (vendor.email) {
      await sendAppointmentReminderEmail({
        to: vendor.email,
        recipientName: vendor.business_name,
        businessName: vendor.business_name,
        dealTitle: deal.title,
        appointmentDate: appt.start_time,
        appointmentEnd: appt.end_time,
        hoursUntil: 24,
        isVendorCopy: true,
        customerName,
      });
    }

    // Mark sent
    await supabase
      .from('appointments')
      .update({ reminder_24h_sent_at: now.toISOString() })
      .eq('id', appt.id);

    emailsSent += 2;
  }

  // ────────────────────────────────────────
  // 2. Send 1-hour reminders
  // ────────────────────────────────────────
  const fiftyMinLater = new Date(now.getTime() + 50 * 60 * 1000).toISOString();
  const seventyMinLater = new Date(now.getTime() + 70 * 60 * 1000).toISOString();

  const { data: reminder1h } = await supabase
    .from('appointments')
    .select(`
      id, start_time, end_time,
      deal:deals(title, timezone),
      vendor:vendors(business_name, address, city, state, phone, email),
      customer:customers(email, first_name, last_name)
    `)
    .eq('status', 'confirmed')
    .is('reminder_1h_sent_at', null)
    .gte('start_time', fiftyMinLater)
    .lte('start_time', seventyMinLater)
    .limit(MAX_EMAILS_PER_CYCLE);

  for (const appt of reminder1h || []) {
    const deal = (Array.isArray(appt.deal) ? appt.deal[0] : appt.deal) as { title: string; timezone: string } | null;
    const vendor = (Array.isArray(appt.vendor) ? appt.vendor[0] : appt.vendor) as { business_name: string; address: string; city: string; state: string; phone: string; email: string } | null;
    const customer = (Array.isArray(appt.customer) ? appt.customer[0] : appt.customer) as { email: string; first_name: string; last_name: string } | null;

    if (!deal || !vendor || !customer) continue;

    const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Customer';
    const address = [vendor.address, vendor.city, vendor.state].filter(Boolean).join(', ');

    // Send to customer
    await sendAppointmentReminderEmail({
      to: customer.email,
      recipientName: customerName,
      businessName: vendor.business_name,
      dealTitle: deal.title,
      appointmentDate: appt.start_time,
      appointmentEnd: appt.end_time,
      address,
      phone: vendor.phone || undefined,
      hoursUntil: 1,
    });

    // Mark sent
    await supabase
      .from('appointments')
      .update({ reminder_1h_sent_at: now.toISOString() })
      .eq('id', appt.id);

    emailsSent++;
  }

  // ────────────────────────────────────────
  // 3. Clean up abandoned pending appointments (>30 min)
  // ────────────────────────────────────────
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

  const { data: abandoned } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancelled_by: 'system', cancellation_reason: 'Abandoned — no payment completed' })
    .eq('status', 'pending')
    .lt('created_at', thirtyMinAgo)
    .select('id');

  return NextResponse.json({
    success: true,
    reminders_24h: reminder24h?.length || 0,
    reminders_1h: reminder1h?.length || 0,
    emails_sent: emailsSent,
    abandoned_cleaned: abandoned?.length || 0,
  });
}
