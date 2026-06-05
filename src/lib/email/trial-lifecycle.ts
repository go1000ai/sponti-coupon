import { Resend } from 'resend';

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not configured');
  return new Resend(key);
}

interface TrialEmailParams {
  to: string;
  businessName: string;
  expiresAt: string;
  daysLeft: number;
}

const BRAND_ORANGE = '#E8632B';

export async function sendTrialEndingEmail(params: TrialEmailParams) {
  const { to, businessName, expiresAt, daysLeft } = params;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sponticoupon.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

  const subject = `Your free 3 months end in ${daysLeft} days — keep your deals live`;
  const html = endingHtml({ businessName, expiresAt, daysLeft, appUrl });

  const { data, error } = await getResendClient().emails.send({
    from: `SpontiCoupon <${fromEmail}>`,
    to: [to],
    subject,
    html,
  });
  if (error) throw new Error(`trial-ending: ${error.message}`);
  return data;
}

export async function sendTrialExpiredEmail(params: Omit<TrialEmailParams, 'daysLeft'>) {
  const { to, businessName, expiresAt } = params;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sponticoupon.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

  const subject = `Your founding-vendor trial ended — reactivate to keep posting`;
  const html = expiredHtml({ businessName, expiresAt, appUrl });

  const { data, error } = await getResendClient().emails.send({
    from: `SpontiCoupon <${fromEmail}>`,
    to: [to],
    subject,
    html,
  });
  if (error) throw new Error(`trial-expired: ${error.message}`);
  return data;
}

function endingHtml({
  businessName,
  expiresAt,
  daysLeft,
  appUrl,
}: {
  businessName: string;
  expiresAt: string;
  daysLeft: number;
  appUrl: string;
}) {
  const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const subscribeUrl = `${appUrl}/pricing`;
  return baseShell({
    appUrl,
    headerEmoji: '&#9203;',
    headerText: `${daysLeft} days left on your free trial`,
    body: `
      <p style="margin:0 0 16px;color:#333;font-size:16px;line-height:1.6;">Hi ${esc(businessName)},</p>
      <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
        Your 3 free months as a SpontiCoupon Founding Vendor end on
        <strong style="color:${BRAND_ORANGE};">${esc(expirationDate)}</strong>.
      </p>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
        To keep your deals live and customers flowing, pick a plan now. As a founding vendor,
        you keep <strong>20% off forever</strong> on Pro or Business when you subscribe before your trial ends.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td align="center">
          <a href="${esc(subscribeUrl)}" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#FF8F65);color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;">
            Pick My Plan
          </a>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:#888;font-size:13px;line-height:1.5;">
        Questions? Just reply to this email — we read every one.
      </p>
    `,
  });
}

function expiredHtml({
  businessName,
  expiresAt,
  appUrl,
}: {
  businessName: string;
  expiresAt: string;
  appUrl: string;
}) {
  const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const subscribeUrl = `${appUrl}/pricing`;
  return baseShell({
    appUrl,
    headerEmoji: '&#128276;',
    headerText: 'Your free trial has ended',
    body: `
      <p style="margin:0 0 16px;color:#333;font-size:16px;line-height:1.6;">Hi ${esc(businessName)},</p>
      <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
        Your founding-vendor free period ended on <strong>${esc(expirationDate)}</strong>.
        Your deals are paused, but your account, your saved settings, and your customer reviews are all still here.
      </p>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
        Pick any plan to reactivate immediately — you keep <strong>20% off forever</strong> as a founding vendor.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td align="center">
          <a href="${esc(subscribeUrl)}" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#FF8F65);color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;">
            Reactivate My Account
          </a>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;color:#888;font-size:13px;line-height:1.5;">
        Not ready yet? Reply to this email and tell us what would help — we'll work with you.
      </p>
    `,
  });
}

function baseShell({
  appUrl,
  headerEmoji,
  headerText,
  body,
}: {
  appUrl: string;
  headerEmoji: string;
  headerText: string;
  body: string;
}) {
  const logoUrl = `${appUrl}/logo.png`;
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:32px;">
          <a href="${esc(appUrl)}"><img src="${esc(logoUrl)}" alt="SpontiCoupon" width="180" style="display:block;max-width:180px;height:auto;" /></a>
        </td></tr>
        <tr><td style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="background:linear-gradient(135deg,#FF6B35,#FF8F65);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">${headerEmoji}</div>
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;line-height:1.3;">${esc(headerText)}</h1>
            </td></tr>
            <tr><td style="padding:32px;">${body}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 16px;text-align:center;">
          <p style="margin:0 0 8px;color:#bbb;font-size:11px;line-height:1.4;">SpontiCoupon &bull; 3801 Avalon Park Blvd East, Suite 200, Orlando, FL 32828</p>
          <p style="margin:0;color:#ccc;font-size:11px;">&copy; ${new Date().getFullYear()} Online Commerce Hub, LLC DBA SpontiCoupon</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
