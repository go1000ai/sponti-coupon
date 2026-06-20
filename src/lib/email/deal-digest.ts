import { Resend } from 'resend';

let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@sponticoupon.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface DigestDeal {
  title: string;
  businessName: string;
  dealPrice: number;
  originalPrice: number;
  discountPercentage: number;
  imageUrl: string;
  url: string;
  distanceMiles?: number | null;
}

/**
 * Daily "new deals in your area & categories" digest, sent via Resend.
 * Branded to match SpontiCoupon's other transactional emails.
 */
export async function sendDealDigestEmail(params: {
  to: string;
  customerName: string;
  deals: DigestDeal[];
}) {
  const { to, customerName, deals } = params;
  const logoUrl = `${APP_URL}/logo.png`;
  const settingsUrl = `${APP_URL}/dashboard/settings`;
  const count = deals.length;

  const dealRows = deals.map((d) => `
    <tr>
      <td style="padding: 0 0 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          <tr>
            <td width="120" style="vertical-align: top;">
              <img src="${esc(d.imageUrl)}" alt="${esc(d.title)}" width="120" height="100" style="display: block; width: 120px; height: 100px; object-fit: cover;" />
            </td>
            <td style="padding: 12px 16px; vertical-align: top;">
              <p style="margin: 0 0 2px; color: #1a1a2e; font-size: 15px; font-weight: 700; line-height: 1.3;">${esc(d.title)}</p>
              <p style="margin: 0 0 6px; color: #888; font-size: 12px;">${esc(d.businessName)}${d.distanceMiles != null ? ` &bull; ${d.distanceMiles.toFixed(0)} mi away` : ''}</p>
              <p style="margin: 0 0 8px;">
                <span style="color: #FF6B35; font-size: 16px; font-weight: 700;">$${d.dealPrice.toFixed(2)}</span>
                <span style="color: #bbb; font-size: 13px; text-decoration: line-through; margin-left: 6px;">$${d.originalPrice.toFixed(2)}</span>
                <span style="color: #2e7d32; font-size: 12px; font-weight: 700; margin-left: 6px;">${Math.round(d.discountPercentage)}% off</span>
              </p>
              <a href="${esc(d.url)}" style="display: inline-block; background-color: #FF6B35; color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 7px 16px; border-radius: 8px;">View Deal</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New deals for you</title></head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center" style="padding: 40px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">
        <tr><td align="center" style="padding-bottom: 28px;">
          <a href="${esc(APP_URL)}"><img src="${esc(logoUrl)}" alt="SpontiCoupon" width="170" style="display: block; max-width: 170px; height: auto;" /></a>
        </td></tr>
        <tr><td style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td bgcolor="#FF6B35" style="background-color: #FF6B35; background-image: linear-gradient(135deg, #FF6B35, #FF8F65); padding: 28px 32px; text-align: center;">
              <div style="font-size: 36px; margin-bottom: 6px;">&#127881;</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 21px; font-weight: 700;">${count} new deal${count !== 1 ? 's' : ''} in your area</h1>
            </td>
          </tr></table>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="padding: 28px 28px 8px;">
            <p style="margin: 0 0 18px; color: #555; font-size: 15px; line-height: 1.6;">Hi ${esc(customerName)}, fresh deals just dropped that match what you&rsquo;re into:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${dealRows}</table>
            <div style="text-align: center; padding: 8px 0 4px;">
              <a href="${esc(APP_URL)}/dashboard/for-you" style="display: inline-block; color: #FF6B35; font-size: 14px; font-weight: 600; text-decoration: none;">See all your deals &rarr;</a>
            </div>
          </td></tr></table>
        </td></tr>
        <tr><td align="center" style="padding: 24px 16px;">
          <p style="margin: 0 0 8px; color: #999; font-size: 12px;">Don&rsquo;t want these? You can turn them off anytime in <a href="${esc(settingsUrl)}" style="color: #FF6B35; font-weight: 600;">Settings &rarr; Notifications</a> — no need to fully unsubscribe.</p>
          <p style="margin: 0; color: #bbb; font-size: 11px;">SpontiCoupon &bull; Online Commerce Hub, LLC &bull; 3801 Avalon Park Blvd East, Suite 200, Orlando, FL 32828</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

  await getResend().emails.send({
    from: `SpontiCoupon <${FROM}>`,
    to,
    subject: `🎟️ ${count} new deal${count !== 1 ? 's' : ''} near you`,
    html,
    headers: {
      'List-Unsubscribe': `<${settingsUrl}>`,
    },
  });
}
