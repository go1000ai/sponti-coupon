import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface NewLeadNotificationParams {
  leadId: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  businessName?: string | null;
  source: string;
  notes?: string | null;
  capturedAt?: string;
}

function prettySource(source: string): string {
  return source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function sendNewLeadNotification(params: NewLeadNotificationParams) {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'notifications@sponticoupon.com';
  const recipient = process.env.LEAD_NOTIFICATION_EMAIL || 'hsantiago@sponticoupon.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

  const subject = `New lead: ${params.businessName || params.name || params.email} (${prettySource(params.source)})`;

  const rows: Array<[string, string]> = [
    ['Source', prettySource(params.source)],
    ['Email', params.email],
  ];
  if (params.name) rows.push(['Name', params.name]);
  if (params.businessName) rows.push(['Business', params.businessName]);
  if (params.phone) rows.push(['Phone', params.phone]);
  if (params.notes) rows.push(['Notes', params.notes]);
  rows.push(['Captured', params.capturedAt || new Date().toISOString()]);

  const tableRows = rows
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #555; width: 130px; vertical-align: top;">${k}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #eee; color: #111; word-break: break-word;">${escapeHtml(v)}</td>
        </tr>`,
    )
    .join('');

  try {
    await resend.emails.send({
      from: `SpontiCoupon Leads <${fromEmail}>`,
      to: recipient,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #E8632B 0%, #FF8F65 100%); color: white; padding: 18px 24px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 800;">New lead captured</h1>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.95;">${prettySource(params.source)}</p>
          </div>
          <div style="background: white; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px; padding: 4px 16px 16px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              ${tableRows}
            </table>
            <div style="margin-top: 18px; text-align: center;">
              <a href="${appUrl}/admin/prospects" style="display: inline-block; background: #111827; color: white; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 14px;">
                Open in admin
              </a>
            </div>
          </div>
          <p style="text-align: center; color: #999; font-size: 11px; margin-top: 16px;">
            Lead ID: ${params.leadId}
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[New Lead Notification] Email send failed:', err);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
