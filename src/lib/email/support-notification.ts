import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SupportNotificationParams {
  ticketId: string;
  subject: string;
  category: string;
  userEmail: string;
  userRole: string;
  adminUrl: string;
}

export async function sendSupportNotification(params: SupportNotificationParams) {
  const { ticketId, subject, category, userEmail, userRole, adminUrl } = params;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'deals@sponticoupon.com';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sponticoupon.com';

  try {
    await resend.emails.send({
      from: `SpontiCoupon Support <${fromEmail}>`,
      to: adminEmail,
      subject: `[Support] New Ticket: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E8632B;">New Support Ticket</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Ticket ID</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${ticketId.slice(0, 8)}...</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Subject</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Category</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${category}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">From</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${userEmail} (${userRole})</td>
            </tr>
          </table>
          <a href="${adminUrl}" style="display: inline-block; background: #E8632B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Ticket</a>
        </div>
      `,
    });
  } catch (error) {
    console.error('[Support Email] Failed to send notification:', error);
  }
}
