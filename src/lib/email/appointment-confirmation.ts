import { Resend } from 'resend';
import { format, parseISO } from 'date-fns';

const getResendClient = () => new Resend(process.env.RESEND_API_KEY);

interface AppointmentConfirmationParams {
  to: string;
  recipientName: string;
  businessName: string;
  dealTitle: string;
  appointmentDate: string;  // ISO
  appointmentEnd: string;   // ISO
  address?: string;
  phone?: string;
  customerNotes?: string;
  isVendorCopy?: boolean;
  customerName?: string;
  customerEmail?: string;
}

export async function sendAppointmentConfirmationEmail(params: AppointmentConfirmationParams) {
  const {
    to, recipientName, businessName, dealTitle,
    appointmentDate, appointmentEnd, address, phone,
    customerNotes, isVendorCopy, customerName, customerEmail,
  } = params;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sponticoupon.com';
  const date = parseISO(appointmentDate);
  const end = parseISO(appointmentEnd);
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  const formattedTime = `${format(date, 'h:mm a')} — ${format(end, 'h:mm a')}`;

  const subject = isVendorCopy
    ? `New Appointment: ${customerName} — ${dealTitle}`
    : `Appointment Confirmed — ${businessName}`;

  const customerSection = isVendorCopy ? `
    <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Customer</td>
    <td style="padding:8px 0;font-size:14px;font-weight:600;">${customerName} (${customerEmail})</td></tr>
  ` : '';

  const notesSection = customerNotes ? `
    <div style="margin-top:16px;padding:12px 16px;background:#fef3c7;border-radius:8px;">
      <p style="margin:0;font-size:12px;color:#92400e;font-weight:600;">Customer Notes</p>
      <p style="margin:4px 0 0;font-size:14px;color:#78350f;">${customerNotes}</p>
    </div>
  ` : '';

  const html = `
    <div style="max-width:500px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="text-align:center;padding:24px 0;">
        <h1 style="margin:0;font-size:24px;color:#E8632B;">SpontiCoupon</h1>
      </div>
      <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="width:48px;height:48px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <span style="font-size:24px;">✓</span>
          </div>
          <h2 style="margin:0;font-size:20px;color:#111827;">
            ${isVendorCopy ? 'New Appointment Booked' : 'Appointment Confirmed!'}
          </h2>
          <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">
            ${isVendorCopy ? `${customerName} has booked an appointment` : `Your appointment at ${businessName} is confirmed`}
          </p>
        </div>

        <div style="background:#f9fafb;border-radius:8px;padding:16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Deal</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;">${dealTitle}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Date</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;">${formattedDate}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Time</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;color:#E8632B;">${formattedTime}</td></tr>
            ${address ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Location</td>
            <td style="padding:8px 0;font-size:14px;">${address}</td></tr>` : ''}
            ${phone ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Phone</td>
            <td style="padding:8px 0;font-size:14px;">${phone}</td></tr>` : ''}
            ${customerSection}
          </table>
        </div>

        ${notesSection}

        <div style="margin-top:20px;text-align:center;">
          <a href="https://sponticoupon.com/${isVendorCopy ? 'vendor/appointments' : 'dashboard/appointments'}"
             style="display:inline-block;background:#E8632B;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            ${isVendorCopy ? 'View Appointments' : 'View My Appointments'}
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
    console.error('Failed to send appointment confirmation email:', err);
    return { success: false, error: err };
  }
}
