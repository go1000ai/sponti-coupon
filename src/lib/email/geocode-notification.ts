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
 * Sent when a vendor's address couldn't be precisely geocoded.
 * Their location falls back to zip code center but they need to fix it.
 */
export async function sendGeocodeFailureEmail(params: {
  vendorEmail: string;
  vendorName: string;
  address: string;
}) {
  const { vendorEmail, vendorName, address } = params;
  const settingsUrl = `${APP_URL}/vendor/settings`;

  try {
    await getResend().emails.send({
      from: `SpontiCoupon <${FROM}>`,
      to: vendorEmail,
      subject: 'Action Needed: We couldn\'t verify your exact address — SpontiCoupon',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #E8632B, #FF8F65); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Address Verification Needed</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">SpontiCoupon</p>
          </div>

          <div style="padding: 32px 24px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 20px;">Hi ${vendorName},</p>

            <p style="color: #555; font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
              We were unable to pinpoint the exact location for the address you provided:
            </p>

            <div style="background: #fff3cd; border-left: 4px solid #E8632B; border-radius: 0 8px 8px 0; padding: 16px; margin: 0 0 20px;">
              <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">${address}</p>
            </div>

            <p style="color: #555; font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
              <strong>What this means:</strong> Your deals will still appear on the map, but your location is estimated based on your zip code.
              Customers searching nearby may not see your deals accurately.
            </p>

            <p style="color: #555; font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
              <strong>To fix this:</strong> Please go to your Vendor Settings and double-check your street address,
              city, state, and zip code. Common issues include:
            </p>

            <ul style="color: #555; font-size: 14px; line-height: 1.8; margin: 0 0 24px; padding-left: 20px;">
              <li>Misspelled street names (e.g., "Dehaven" instead of "De Haven")</li>
              <li>Missing apartment/suite numbers</li>
              <li>Abbreviated street names that don't match records</li>
              <li>Incorrect zip code for the area</li>
            </ul>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${settingsUrl}" style="background: #E8632B; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Update My Address
              </a>
            </div>

            <p style="color: #999; font-size: 13px; line-height: 1.5; margin: 24px 0 0; text-align: center;">
              Once you correct your address, your map location will automatically update.
            </p>
          </div>

          ${FOOTER}
        </div>
      `,
    });
  } catch (err) {
    console.error('[geocode-notification] Failed to send email:', err);
  }
}
