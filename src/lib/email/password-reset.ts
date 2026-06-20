import { Resend } from 'resend';

let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

const FROM = process.env.RESEND_FROM_EMAIL || 'no-reply@sponticoupon.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sends a password-reset email via Resend.
 * We send the recovery link ourselves (instead of relying on Supabase's
 * default SMTP, which is heavily rate-limited and unreliable for production).
 * Branded to match SpontiCoupon's other transactional emails (logo + orange).
 */
export async function sendPasswordResetEmail(params: {
  email: string;
  resetLink: string;
}) {
  const { email, resetLink } = params;
  const logoUrl = `${APP_URL}/logo.png`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your SpontiCoupon password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="min-width: 320px;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">

          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${esc(APP_URL)}" target="_blank" style="text-decoration: none;">
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
                  <td bgcolor="#FF6B35" style="background-color: #FF6B35; background-image: linear-gradient(135deg, #FF6B35, #FF8F65); padding: 32px 32px 24px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 8px;">&#128273;</div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; line-height: 1.3;">
                      Reset your password
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Body Content -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 16px; color: #555; font-size: 15px; line-height: 1.6;">
                      We received a request to reset the password for
                      <strong style="color: #1a1a2e;">${esc(email)}</strong>.
                      Click the button below to choose a new password. This link will expire in 1 hour.
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 8px 0 28px;">
                          <a href="${esc(resetLink)}" target="_blank"
                             style="display: inline-block; background-color: #FF6B35; background-image: linear-gradient(135deg, #FF6B35, #FF8F65); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 36px; border-radius: 8px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 16px; color: #888; font-size: 13px; line-height: 1.6;">
                      If you didn&rsquo;t request this, you can safely ignore this email &mdash; your password won&rsquo;t change.
                    </p>
                    <p style="margin: 0; color: #888; font-size: 13px; line-height: 1.6; word-break: break-all;">
                      Or paste this link into your browser:<br>
                      <a href="${esc(resetLink)}" style="color: #FF6B35;">${esc(resetLink)}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 16px;">
              <p style="margin: 0; color: #aaa; font-size: 12px; line-height: 1.6;">
                SpontiCoupon &bull; Online Commerce Hub, LLC &bull; 3801 Avalon Park Blvd East, Suite 200, Orlando, FL 32828<br>
                <a href="${esc(APP_URL)}/privacy" style="color: #aaa;">Privacy Policy</a> &bull;
                <a href="${esc(APP_URL)}/terms" style="color: #aaa;">Terms of Service</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await getResend().emails.send({
    from: `SpontiCoupon <${FROM}>`,
    to: email,
    subject: 'Reset your SpontiCoupon password',
    html,
  });
}
