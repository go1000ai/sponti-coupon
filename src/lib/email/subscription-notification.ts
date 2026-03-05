import { Resend } from 'resend';

let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

const FROM = process.env.RESEND_FROM_EMAIL || 'billing@sponticoupon.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

const FOOTER = `
  <div style="padding: 20px 24px; border-top: 1px solid #eee; text-align: center;">
    <p style="color: #aaa; font-size: 12px; margin: 0;">
      SpontiCoupon &bull; Online Commerce Hub, LLC &bull; Orlando, FL 32801<br>
      <a href="${APP_URL}/privacy" style="color: #aaa;">Privacy Policy</a> &bull;
      <a href="${APP_URL}/terms" style="color: #aaa;">Terms of Service</a>
    </p>
  </div>
`;

/**
 * Sent after checkout.session.completed / customer.subscription.created
 * Required by: FTC Negative Option Rule, NY GBL § 527, WA RCW 19.316
 */
export async function sendSubscriptionConfirmationEmail(params: {
  vendorEmail: string;
  vendorName: string;
  tier: string;
  interval: string;
  pricePerPeriod: number;
  accessEndDate?: string; // ISO date — for trial end date if known
}) {
  const { vendorEmail, vendorName, tier, interval, pricePerPeriod, accessEndDate } = params;
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  const periodLabel = interval === 'year' ? 'year' : 'month';
  const cancelUrl = `${APP_URL}/vendor/subscription`;

  try {
    await getResend().emails.send({
      from: `SpontiCoupon Billing <${FROM}>`,
      to: vendorEmail,
      subject: `Subscription Confirmed: ${tierName} Plan — SpontiCoupon`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #E8632B, #FF8F65); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Confirmed</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">SpontiCoupon</p>
          </div>

          <div style="padding: 32px 24px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 20px;">Hi ${vendorName},</p>

            <p style="color: #555; font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
              Thank you for subscribing to SpontiCoupon. Your <strong>${tierName} Plan</strong> is now active.
            </p>

            <div style="background: #f8f9fa; border-left: 4px solid #E8632B; border-radius: 0 8px 8px 0; padding: 20px; margin: 0 0 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #888; font-size: 13px;">Plan</td>
                  <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">${tierName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #888; font-size: 13px;">Billing</td>
                  <td style="padding: 6px 0; color: #E8632B; font-size: 15px; font-weight: 700; text-align: right;">$${pricePerPeriod}/${periodLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #888; font-size: 13px;">Renewal</td>
                  <td style="padding: 6px 0; color: #333; font-size: 14px; text-align: right;">Auto-renews every ${periodLabel} until cancelled</td>
                </tr>
                ${accessEndDate ? `
                <tr>
                  <td style="padding: 6px 0; color: #888; font-size: 13px;">Trial ends</td>
                  <td style="padding: 6px 0; color: #333; font-size: 14px; text-align: right;">${accessEndDate}</td>
                </tr>` : ''}
              </table>
            </div>

            <div style="background: #fff8f0; border: 1px solid #fde8d8; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
              <p style="color: #7c4a1e; font-size: 13px; margin: 0; line-height: 1.6;">
                <strong>How to cancel:</strong> You may cancel at any time before your next billing date with no penalty.
                Visit <a href="${cancelUrl}" style="color: #E8632B;">Vendor Dashboard → Subscription → Cancel Plan</a>,
                or email <a href="mailto:billing@sponticoupon.com" style="color: #E8632B;">billing@sponticoupon.com</a>.
                Your access continues until the end of the current period.
              </p>
            </div>

            <div style="text-align: center;">
              <a href="${APP_URL}/vendor/dashboard" style="display: inline-block; background: #E8632B; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
                Go to Dashboard
              </a>
            </div>
          </div>
          ${FOOTER}
        </div>
      `,
    });
  } catch (error) {
    console.error('[Subscription Email] Failed to send confirmation:', error);
  }
}

/**
 * Sent after customer.subscription.deleted
 * Required by: FTC Negative Option Rule (click-to-cancel confirmation)
 */
export async function sendCancellationConfirmationEmail(params: {
  vendorEmail: string;
  vendorName: string;
  tier: string;
  accessEndDate: string; // Human-readable date
}) {
  const { vendorEmail, vendorName, tier, accessEndDate } = params;
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);

  try {
    await getResend().emails.send({
      from: `SpontiCoupon Billing <${FROM}>`,
      to: vendorEmail,
      subject: `Cancellation Confirmed — SpontiCoupon ${tierName} Plan`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #374151; padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Cancellation Confirmed</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 14px;">SpontiCoupon</p>
          </div>

          <div style="padding: 32px 24px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 20px;">Hi ${vendorName},</p>

            <p style="color: #555; font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
              Your <strong>${tierName} Plan</strong> subscription has been cancelled. No further charges will be made.
            </p>

            <div style="background: #f8f9fa; border-left: 4px solid #6b7280; border-radius: 0 8px 8px 0; padding: 20px; margin: 0 0 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #888; font-size: 13px;">Plan cancelled</td>
                  <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">${tierName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #888; font-size: 13px;">Access continues until</td>
                  <td style="padding: 6px 0; color: #E8632B; font-size: 15px; font-weight: 700; text-align: right;">${accessEndDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #888; font-size: 13px;">Future charges</td>
                  <td style="padding: 6px 0; color: #16a34a; font-size: 14px; font-weight: 600; text-align: right;">None</td>
                </tr>
              </table>
            </div>

            <p style="color: #555; font-size: 14px; line-height: 1.5; margin: 0 0 24px;">
              Your deals and data remain accessible until ${accessEndDate}. After that, your deals will be deactivated
              and your vendor dashboard will be read-only. Your account and data are retained for 30 days before deletion
              unless you request earlier removal.
            </p>

            <p style="color: #555; font-size: 14px; line-height: 1.5; margin: 0 0 24px;">
              Changed your mind? You can reactivate at any time from your
              <a href="${APP_URL}/vendor/subscription" style="color: #E8632B;">Subscription page</a>.
            </p>

            <div style="text-align: center;">
              <a href="${APP_URL}/vendor/subscription" style="display: inline-block; background: #E8632B; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
                Reactivate Subscription
              </a>
            </div>
          </div>
          ${FOOTER}
        </div>
      `,
    });
  } catch (error) {
    console.error('[Subscription Email] Failed to send cancellation confirmation:', error);
  }
}
