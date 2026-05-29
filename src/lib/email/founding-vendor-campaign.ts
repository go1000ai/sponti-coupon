import { Resend } from 'resend';
import crypto from 'crypto';

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not configured');
  return new Resend(key);
}

export interface FoundingVendorEmailParams {
  to: string;
  businessName?: string | null;
  firstName?: string | null;
  signupUrl: string;
  unsubscribeUrl: string;
  spotsRemaining?: number;
}

export const FOUNDING_VENDOR_SUBJECT =
  'You’re invited: 3 months free on SpontiCoupon — no credit card';

export const FOUNDING_VENDOR_FROM = 'Heriberto Santiago <hsantiago@sponticoupon.com>';
export const FOUNDING_VENDOR_REPLY_TO = 'hsantiago@sponticoupon.com';

export async function sendFoundingVendorEmail(params: FoundingVendorEmailParams) {
  const html = buildFoundingVendorHtml(params);
  const text = buildFoundingVendorText(params);

  const { data, error } = await getResendClient().emails.send({
    from: FOUNDING_VENDOR_FROM,
    replyTo: FOUNDING_VENDOR_REPLY_TO,
    to: [params.to],
    subject: FOUNDING_VENDOR_SUBJECT,
    html,
    text,
    headers: {
      'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });

  if (error) throw new Error(`founding-vendor-campaign: ${error.message}`);
  return data;
}

export function buildCampaignUnsubscribeUrl(email: string, baseUrl: string) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET is not configured');
  const token = crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex');
  const params = new URLSearchParams({ email, token });
  return `${baseUrl}/unsubscribe/campaign?${params.toString()}`;
}

export function buildFoundingVendorText({
  businessName,
  firstName,
  signupUrl,
  unsubscribeUrl,
  spotsRemaining,
}: FoundingVendorEmailParams) {
  const greeting = firstName
    ? `Hi ${firstName},`
    : businessName
      ? `Hi ${businessName} team,`
      : 'Hi there,';

  const spotsLine = typeof spotsRemaining === 'number'
    ? `Only ${spotsRemaining} of 15 founding-vendor spots are still open.`
    : 'Only 15 founding-vendor spots total.';

  return [
    greeting,
    '',
    'I’m Heriberto, founder of SpontiCoupon — a deal marketplace built for local businesses in your area.',
    '',
    'I’m picking 15 founding vendors to get the platform off the ground, and I want yours to be one of them.',
    '',
    'What you get:',
    '  • 3 months FREE on our Business plan',
    '  • No credit card required at signup',
    '  • 150 deals/month (50 Sponti Deals + 100 Steady Deals)',
    '  • We post your deals on our own Facebook and Instagram',
    '  • Zero commission. You keep 100% of every sale.',
    '  • 20% off forever when you stay on after the trial',
    '',
    `${spotsLine} Claim yours here (no card needed):`,
    signupUrl,
    '',
    'If you don’t get customers in 3 months, walk away. No risk. No charge. No follow-up.',
    '',
    'Reply to this email if you have questions — or text/call me at (321) 335-0773. I answer personally.',
    '',
    'Heriberto Santiago',
    'Founder, SpontiCoupon',
    '(321) 335-0773',
    '',
    'P.S. Founding-vendor spots usually fill in under 2 weeks. Grab yours before they’re gone.',
    '',
    '—',
    `Unsubscribe: ${unsubscribeUrl}`,
    'SpontiCoupon • Online Commerce Hub, LLC • Orlando, FL 32801 • (321) 335-0773',
  ].join('\n');
}

export function buildFoundingVendorHtml({
  businessName,
  firstName,
  signupUrl,
  unsubscribeUrl,
  spotsRemaining,
}: FoundingVendorEmailParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';
  const logoUrl = `${appUrl}/logo.png`;
  const greeting = firstName
    ? `Hi ${esc(firstName)},`
    : businessName
      ? `Hi ${esc(businessName)} team,`
      : 'Hi there,';

  const spotsBadge = typeof spotsRemaining === 'number'
    ? `Only <strong>${spotsRemaining} of 15</strong> founding spots left`
    : 'Only <strong>15 founding spots</strong> total';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(FOUNDING_VENDOR_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f8f9fa;">
    3 months free on the Business plan. No credit card. 15 founding vendors only.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">

        <!-- Logo -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <a href="${esc(appUrl)}" target="_blank" style="text-decoration:none;">
              <img src="${esc(logoUrl)}" alt="SpontiCoupon" width="160" style="display:block;max-width:160px;height:auto;" />
            </a>
          </td>
        </tr>

        <!-- Main card -->
        <tr>
          <td style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

            <!-- Orange hero -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="background:linear-gradient(135deg,#E8632B,#FF8F65);padding:36px 32px 28px;text-align:center;">
                  <div style="display:inline-block;background:rgba(255,255,255,0.18);color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:6px 12px;border-radius:999px;margin-bottom:14px;">
                    Founding Vendor Invitation
                  </div>
                  <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;line-height:1.2;">
                    3 Months Free.<br/>No Credit Card.
                  </h1>
                  <p style="margin:10px 0 0;color:rgba(255,255,255,0.92);font-size:14px;">
                    ${spotsBadge}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Body -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding:32px;">

                  <p style="margin:0 0 16px;color:#1a1a2e;font-size:16px;line-height:1.6;">${greeting}</p>

                  <p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.65;">
                    I&rsquo;m Heriberto, founder of <strong>SpontiCoupon</strong> &mdash; a deal marketplace built for local
                    businesses like yours. We help you fill quiet hours and bring in new customers without
                    discounting your way to zero.
                  </p>

                  <p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.65;">
                    I&rsquo;m picking <strong>15 founding vendors</strong> to launch with us, and I&rsquo;d love yours to be one of them.
                  </p>

                  <!-- Value box -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fff8f3;border:1px solid #ffd9c2;border-radius:12px;margin-bottom:28px;">
                    <tr>
                      <td style="padding:20px 22px;">
                        <p style="margin:0 0 12px;color:#E8632B;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                          What you get
                        </p>
                        ${row('3 months FREE on our Business plan')}
                        ${row('No credit card required at signup')}
                        ${row('150 deals/month &mdash; 50 Sponti Deals + 100 Steady Deals')}
                        ${row('We post your deals to our own Facebook and Instagram')}
                        ${row('Zero commissions. You keep 100% of every sale.')}
                        ${row('20% off forever when you stay on after the trial')}
                      </td>
                    </tr>
                  </table>

                  <!-- CTA -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr><td align="center" style="padding-bottom:10px;">
                      <a href="${esc(signupUrl)}" target="_blank"
                         style="display:inline-block;background:linear-gradient(135deg,#E8632B,#FF8F65);color:#fff;font-size:16px;font-weight:800;text-decoration:none;padding:16px 44px;border-radius:12px;letter-spacing:0.3px;box-shadow:0 6px 18px rgba(232,99,43,0.25);">
                        Claim My 3 Free Months
                      </a>
                    </td></tr>
                    <tr><td align="center">
                      <p style="margin:0;color:#888;font-size:12px;">
                        No credit card &middot; full access &middot; cancel anytime
                      </p>
                    </td></tr>
                  </table>

                  <!-- Risk-free framing -->
                  <p style="margin:28px 0 16px;color:#444;font-size:15px;line-height:1.65;">
                    <strong>The risk is on me.</strong> If you don&rsquo;t get customers in 3 months, walk away &mdash;
                    no charge, no follow-up, no card on file. If you do, you keep going at the lowest price
                    we&rsquo;ll ever offer.
                  </p>

                  <p style="margin:0 0 8px;color:#444;font-size:15px;line-height:1.65;">
                    Questions? Reply to this email &mdash; or text/call me at
                    <a href="tel:+13213350773" style="color:#E8632B;text-decoration:none;font-weight:600;">(321) 335-0773</a>.
                    I answer personally.
                  </p>

                  <p style="margin:24px 0 0;color:#1a1a2e;font-size:15px;line-height:1.5;">
                    Heriberto Santiago<br/>
                    <span style="color:#888;font-size:13px;">Founder, SpontiCoupon &bull; (321) 335-0773</span>
                  </p>

                  <!-- P.S. urgency -->
                  <p style="margin:24px 0 0;padding-top:18px;border-top:1px dashed #e5e7eb;color:#666;font-size:14px;font-style:italic;line-height:1.55;">
                    <strong style="color:#E8632B;font-style:normal;">P.S.</strong>
                    Founding-vendor spots usually fill in under 2 weeks. Grab yours before they&rsquo;re gone &mdash;
                    <a href="${esc(signupUrl)}" style="color:#E8632B;text-decoration:underline;">claim it here</a>.
                  </p>

                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer (CAN-SPAM) -->
        <tr>
          <td style="padding:28px 16px;text-align:center;">
            <p style="margin:0 0 8px;color:#999;font-size:12px;line-height:1.5;">
              You received this email because we identified your business as a potential SpontiCoupon vendor partner.
            </p>
            <p style="margin:0 0 14px;color:#999;font-size:12px;line-height:1.5;">
              Not interested? <a href="${esc(unsubscribeUrl)}" style="color:#E8632B;text-decoration:underline;">Unsubscribe</a>
              &mdash; we&rsquo;ll never email you again.
            </p>
            <p style="margin:0 0 6px;color:#bbb;font-size:11px;line-height:1.4;">
              SpontiCoupon &bull; Online Commerce Hub, LLC &bull; Orlando, FL 32801 &bull; (321) 335-0773
            </p>
            <p style="margin:0;color:#ccc;font-size:11px;">
              &copy; ${new Date().getFullYear()} SpontiCoupon. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}

function row(text: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
      <tr>
        <td valign="top" width="22" style="padding-top:3px;">
          <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#E8632B;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:16px;">&#10003;</span>
        </td>
        <td style="color:#333;font-size:14px;line-height:1.55;">${text}</td>
      </tr>
    </table>
  `;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
