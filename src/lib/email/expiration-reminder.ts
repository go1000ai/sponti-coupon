import { Resend } from 'resend';
import crypto from 'crypto';

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not configured');
  return new Resend(key);
}

interface ExpirationReminderParams {
  to: string;
  customerName: string;
  businessName: string;
  dealTitle: string;
  expiresAt: string; // ISO date
  daysLeft: number;
  dealUrl: string;
  customerId: string;
}

function generateUnsubscribeToken(customerId: string): string {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET is not configured');
  return crypto.createHmac('sha256', secret).update(customerId).digest('hex');
}

export async function sendExpirationReminderEmail({
  to,
  customerName,
  businessName,
  dealTitle,
  expiresAt,
  daysLeft,
  dealUrl,
  customerId,
}: ExpirationReminderParams) {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sponticoupon.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const urgency = daysLeft <= 1 ? 'expires tomorrow' : `expires in ${daysLeft} days`;
  const subject = `Your deal ${urgency} — don't miss out!`;

  const unsubscribeToken = generateUnsubscribeToken(customerId);
  const unsubscribeUrl = `${appUrl}/unsubscribe?id=${customerId}&token=${unsubscribeToken}`;

  const html = buildEmailHtml({
    customerName,
    businessName,
    dealTitle,
    expiresAt,
    daysLeft,
    dealUrl,
    appUrl,
    unsubscribeUrl,
  });

  const { data, error } = await getResendClient().emails.send({
    from: `SpontiCoupon <${fromEmail}>`,
    to: [to],
    subject,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });

  if (error) {
    console.error('[sendExpirationReminderEmail] Error:', error);
    throw new Error(`Failed to send expiration reminder: ${error.message}`);
  }

  return data;
}

function buildEmailHtml({
  customerName,
  businessName,
  dealTitle,
  expiresAt,
  daysLeft,
  dealUrl,
  appUrl,
  unsubscribeUrl,
}: {
  customerName: string;
  businessName: string;
  dealTitle: string;
  expiresAt: string;
  daysLeft: number;
  dealUrl: string;
  appUrl: string;
  unsubscribeUrl: string;
}) {
  const logoUrl = `${appUrl}/logo.png`;
  const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const isUrgent = daysLeft <= 1;
  const headerEmoji = isUrgent ? '&#9200;' : '&#128276;'; // ⏰ or 🔔
  const headerText = isUrgent
    ? 'Your deal expires tomorrow!'
    : `Your deal expires in ${daysLeft} days`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deal Expiration Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="min-width: 320px;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${esc(appUrl)}" target="_blank" style="text-decoration: none;">
                <img src="${esc(logoUrl)}" alt="SpontiCoupon" width="180" style="display: block; max-width: 180px; height: auto;" />
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
              <!-- Orange gradient header -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(135deg, #FF6B35, #FF8F65); padding: 32px 32px 24px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 8px;">${headerEmoji}</div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; line-height: 1.3;">
                      ${esc(headerText)}
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 16px; color: #333; font-size: 16px; line-height: 1.6;">
                      Hi ${esc(customerName)},
                    </p>
                    <p style="margin: 0 0 16px; color: #555; font-size: 15px; line-height: 1.6;">
                      Just a friendly reminder &mdash; your deal <strong style="color: #1a1a2e;">${esc(dealTitle)}</strong> at
                      <strong style="color: #1a1a2e;">${esc(businessName)}</strong> expires on
                      <strong style="color: #E8632B;">${esc(expirationDate)}</strong>.
                    </p>
                    <p style="margin: 0 0 28px; color: #555; font-size: 15px; line-height: 1.6;">
                      ${isUrgent
                        ? 'This is your <strong style="color: #E8632B;">last chance</strong> &mdash; visit the business tomorrow to redeem your deal before it expires!'
                        : 'Don&rsquo;t let this great deal go to waste! Visit the business and redeem your coupon before time runs out.'}
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="${esc(dealUrl)}" target="_blank"
                             style="display: inline-block; background: linear-gradient(135deg, #FF6B35, #FF8F65); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 40px; border-radius: 12px; letter-spacing: 0.3px;">
                            View My Deal
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Deal info box -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 28px;">
                      <tr>
                        <td style="background-color: #f8f9fa; border-radius: 10px; padding: 16px 20px; border-left: 4px solid #FF6B35;">
                          <p style="margin: 0 0 4px; color: #888; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Your Deal
                          </p>
                          <p style="margin: 0; color: #1a1a2e; font-size: 15px; font-weight: 600;">
                            ${esc(dealTitle)}
                          </p>
                          <p style="margin: 4px 0 0; color: #888; font-size: 13px;">
                            at ${esc(businessName)} &bull; Expires ${esc(expirationDate)}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer — CAN-SPAM -->
          <tr>
            <td style="padding: 28px 16px; text-align: center;">
              <p style="margin: 0 0 8px; color: #999; font-size: 12px; line-height: 1.5;">
                You received this email because you claimed a deal on
                <a href="${esc(appUrl)}" style="color: #FF6B35; text-decoration: none;">SpontiCoupon</a>.
              </p>
              <p style="margin: 0 0 16px; color: #999; font-size: 12px; line-height: 1.5;">
                Don&rsquo;t want deal reminder emails?
                <a href="${esc(unsubscribeUrl)}" style="color: #FF6B35; text-decoration: underline;">Unsubscribe</a>
              </p>
              <p style="margin: 0 0 8px; color: #bbb; font-size: 11px; line-height: 1.4;">
                SpontiCoupon &bull; Orlando, FL 32801
              </p>
              <p style="margin: 0; color: #ccc; font-size: 11px;">
                &copy; ${new Date().getFullYear()} SpontiCoupon. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
