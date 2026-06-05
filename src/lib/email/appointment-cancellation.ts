import { Resend } from 'resend';
import { format, parseISO } from 'date-fns';

const getResendClient = () => new Resend(process.env.RESEND_API_KEY);

interface AppointmentCancellationParams {
  to: string;
  recipientName: string;
  businessName: string;
  dealTitle: string;
  appointmentDate: string;  // ISO
  appointmentEnd: string;   // ISO
  cancelledBy: 'vendor' | 'customer';
  reason?: string;
  isVendorCopy?: boolean;
  customerName?: string;
}

export async function sendAppointmentCancellationEmail(params: AppointmentCancellationParams) {
  const {
    to, businessName, dealTitle,
    appointmentDate, appointmentEnd,
    cancelledBy, reason, isVendorCopy, customerName,
  } = params;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sponticoupon.com';
  const date = parseISO(appointmentDate);
  const end = parseISO(appointmentEnd);
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  const formattedTime = `${format(date, 'h:mm a')} — ${format(end, 'h:mm a')}`;

  const byLabel = cancelledBy === 'vendor' ? businessName : (customerName || 'the customer');

  const subject = isVendorCopy
    ? `Appointment Cancelled: ${customerName} — ${dealTitle}`
    : `Appointment Cancelled — ${businessName}`;

  const subheading = isVendorCopy
    ? `${customerName}'s appointment has been cancelled`
    : `Your appointment at ${businessName} has been cancelled`;

  const reasonSection = reason ? `
    <div style="margin-top:16px;padding:12px 16px;background:#f3f4f6;border-radius:8px;">
      <p style="margin:0;font-size:12px;color:#6b7280;font-weight:600;">Reason</p>
      <p style="margin:4px 0 0;font-size:14px;color:#374151;">${reason}</p>
    </div>
  ` : '';

  const ctaPath = isVendorCopy ? 'vendor/appointments' : 'dashboard/my-deals';
  const ctaLabel = isVendorCopy ? 'View Appointments' : 'Browse Deals';

  const html = `
    <div style="max-width:500px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="text-align:center;padding:24px 0;">
        <h1 style="margin:0;font-size:24px;color:#E8632B;">SpontiCoupon</h1>
      </div>
      <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="width:48px;height:48px;background:#fee2e2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <span style="font-size:24px;">✕</span>
          </div>
          <h2 style="margin:0;font-size:20px;color:#111827;">Appointment Cancelled</h2>
          <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">${subheading}</p>
          <p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">Cancelled by ${byLabel}</p>
        </div>

        <div style="background:#f9fafb;border-radius:8px;padding:16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Deal</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;">${dealTitle}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Date</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;text-decoration:line-through;color:#9ca3af;">${formattedDate}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Time</td>
            <td style="padding:8px 0;font-size:14px;text-decoration:line-through;color:#9ca3af;">${formattedTime}</td></tr>
          </table>
        </div>

        ${reasonSection}

        <div style="margin-top:20px;text-align:center;">
          <a href="https://sponticoupon.com/${ctaPath}"
             style="display:inline-block;background:#E8632B;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            ${ctaLabel}
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
    console.error('Failed to send appointment cancellation email:', err);
    return { success: false, error: err };
  }
}
