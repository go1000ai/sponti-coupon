import { Resend } from 'resend';

let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

interface PaymentNotificationParams {
  vendorEmail: string;
  vendorName: string;
  customerName: string;
  customerEmail: string;
  dealTitle: string;
  amount: number;
  processor: string;
  paymentReference: string;
  dashboardUrl: string;
}

export async function sendPaymentNotification(params: PaymentNotificationParams) {
  const {
    vendorEmail, vendorName, customerName, customerEmail,
    dealTitle, amount, processor, paymentReference, dashboardUrl,
  } = params;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'deals@sponticoupon.com';

  try {
    await getResend().emails.send({
      from: `SpontiCoupon <${fromEmail}>`,
      to: vendorEmail,
      subject: `New Payment: $${amount.toFixed(2)} for "${dealTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #E8632B, #FF8F65); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Payment Received</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">SpontiCoupon</p>
          </div>

          <div style="padding: 32px 24px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 20px;">
              Hi ${vendorName},
            </p>

            <p style="color: #555; font-size: 15px; line-height: 1.5; margin: 0 0 24px;">
              A customer has sent a payment for one of your deals. Here are the details:
            </p>

            <div style="background: #f8f9fa; border-left: 4px solid #E8632B; border-radius: 0 8px 8px 0; padding: 20px; margin: 0 0 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #888; font-size: 13px;">Deal</td>
                  <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">${dealTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #888; font-size: 13px;">Amount</td>
                  <td style="padding: 6px 0; color: #E8632B; font-size: 18px; font-weight: 700; text-align: right;">$${amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #888; font-size: 13px;">Payment Method</td>
                  <td style="padding: 6px 0; color: #333; font-size: 14px; text-align: right;">${processor}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #888; font-size: 13px;">Reference Code</td>
                  <td style="padding: 6px 0; color: #333; font-size: 16px; font-weight: 700; font-family: monospace; text-align: right;">${paymentReference}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #888; font-size: 13px;">Customer</td>
                  <td style="padding: 6px 0; color: #333; font-size: 14px; text-align: right;">${customerName} (${customerEmail})</td>
                </tr>
              </table>
            </div>

            <p style="color: #555; font-size: 14px; line-height: 1.5; margin: 0 0 24px;">
              Check your ${processor} account for the payment with reference code <strong>${paymentReference}</strong>.
              The customer has received their redemption code and may visit your location to redeem.
            </p>

            <div style="text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #E8632B; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
                View Dashboard
              </a>
            </div>
          </div>

          <div style="padding: 20px 24px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #aaa; font-size: 12px; margin: 0;">
              SpontiCoupon &bull; Orlando, FL 32801
            </p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error('[Payment Email] Failed to send vendor notification:', error);
  }
}
