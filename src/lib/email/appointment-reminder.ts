import { Resend } from 'resend';
import { format, parseISO } from 'date-fns';

const getResendClient = () => new Resend(process.env.RESEND_API_KEY);

interface AppointmentReminderParams {
  to: string;
  recipientName: string;
  businessName: string;
  dealTitle: string;
  appointmentDate: string;  // ISO
  appointmentEnd: string;   // ISO
  address?: string;
  phone?: string;
  hoursUntil: number;  // 24 or 1
  isVendorCopy?: boolean;
  customerName?: string;
}

export async function sendAppointmentReminderEmail(params: AppointmentReminderParams) {
  const {
    to, businessName, dealTitle,
    appointmentDate, appointmentEnd, address, phone,
    hoursUntil, isVendorCopy, customerName,
  } = params;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sponticoupon.com';
  const date = parseISO(appointmentDate);
  const end = parseISO(appointmentEnd);
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  const formattedTime = `${format(date, 'h:mm a')} — ${format(end, 'h:mm a')}`;

  const urgency = hoursUntil <= 1 ? '1 hour' : '24 hours';
  const emoji = hoursUntil <= 1 ? '⏰' : '📅';

  const subject = isVendorCopy
    ? `${emoji} Appointment in ${urgency}: ${customerName} — ${dealTitle}`
    : `${emoji} Appointment Reminder — ${urgency} until your appointment`;

  const html = `
    <div style="max-width:500px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="text-align:center;padding:24px 0;">
        <h1 style="margin:0;font-size:24px;color:#E8632B;">SpontiCoupon</h1>
      </div>
      <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
        <div style="text-align:center;margin-bottom:20px;">
          <p style="font-size:36px;margin:0;">${emoji}</p>
          <h2 style="margin:8px 0 0;font-size:20px;color:#111827;">
            ${hoursUntil <= 1 ? 'Your appointment is coming up!' : 'Appointment Tomorrow'}
          </h2>
          <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">
            ${isVendorCopy
              ? `${customerName} has an appointment in ${urgency}`
              : `Your appointment at ${businessName} is in ${urgency}`
            }
          </p>
        </div>

        <div style="background:#fff7ed;border-radius:8px;padding:16px;border:1px solid #fed7aa;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#9a3412;font-size:14px;font-weight:600;">Deal</td>
            <td style="padding:6px 0;font-size:14px;font-weight:600;">${dealTitle}</td></tr>
            <tr><td style="padding:6px 0;color:#9a3412;font-size:14px;font-weight:600;">Date</td>
            <td style="padding:6px 0;font-size:14px;">${formattedDate}</td></tr>
            <tr><td style="padding:6px 0;color:#9a3412;font-size:14px;font-weight:600;">Time</td>
            <td style="padding:6px 0;font-size:14px;font-weight:700;color:#E8632B;">${formattedTime}</td></tr>
            ${address ? `<tr><td style="padding:6px 0;color:#9a3412;font-size:14px;font-weight:600;">Location</td>
            <td style="padding:6px 0;font-size:14px;">${address}</td></tr>` : ''}
            ${phone ? `<tr><td style="padding:6px 0;color:#9a3412;font-size:14px;font-weight:600;">Phone</td>
            <td style="padding:6px 0;font-size:14px;">${phone}</td></tr>` : ''}
          </table>
        </div>

        <div style="margin-top:20px;text-align:center;">
          <a href="https://sponticoupon.com/${isVendorCopy ? 'vendor/appointments' : 'dashboard/appointments'}"
             style="display:inline-block;background:#E8632B;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            View Details
          </a>
        </div>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
        SpontiCoupon — Local deals, real savings
      </p>
    </div>
  `;

  try {
    await getResendClient().emails.send({
      from: `SpontiCoupon <${fromEmail}>`,
      to: [to],
      subject,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to send appointment reminder email:', err);
    return { success: false, error: err };
  }
}
