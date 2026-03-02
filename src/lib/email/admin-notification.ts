const RESEND_API_URL = 'https://api.resend.com/emails';

function getAdminEmail() {
  return process.env.ADMIN_NOTIFICATION_EMAIL || 'info@Go1000.ai';
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL || 'deals@sponticoupon.com';
}

async function sendEmail(subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `SpontiCoupon <${getFromEmail()}>`,
      to: getAdminEmail(),
      subject,
      html,
    }),
  });
}

interface NewSignupParams {
  email: string;
  accountType: 'customer' | 'vendor';
  name?: string;
  businessName?: string;
  city?: string;
  state?: string;
  subscriptionTier?: string;
}

interface NewDealParams {
  dealTitle: string;
  dealType: 'sponti_coupon' | 'regular';
  vendorName: string;
  originalPrice: number;
  dealPrice: number;
  discountPercent: number;
  expiresAt: string;
  dealId: string;
}

export async function notifyNewSignup(params: NewSignupParams) {
  const { email, accountType, name, businessName, city, state, subscriptionTier } = params;
  const label = accountType === 'vendor' ? 'Vendor' : 'Customer';
  const displayName = accountType === 'vendor' ? (businessName || email) : (name || email);
  const location = [city, state].filter(Boolean).join(', ');

  try {
    await sendEmail(
      `New ${label} Signup: ${displayName}`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #E8632B; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">New ${label} Signup</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Type</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${label}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td>
              </tr>
              ${accountType === 'vendor' && businessName ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Business</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${businessName}</td>
              </tr>` : ''}
              ${accountType === 'vendor' && subscriptionTier ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Plan</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)}</td>
              </tr>` : ''}
              ${accountType === 'customer' && name ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Name</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td>
              </tr>` : ''}
              ${location ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Location</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${location}</td>
              </tr>` : ''}
            </table>
            <a href="https://sponticoupon.com/admin" style="display: inline-block; background: #E8632B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Admin Dashboard</a>
          </div>
        </div>
      `,
    );
  } catch (error) {
    console.error('[Admin Email] Failed to send signup notification:', error);
  }
}

export async function notifyNewDeal(params: NewDealParams) {
  const { dealTitle, dealType, vendorName, originalPrice, dealPrice, discountPercent, expiresAt } = params;
  const typeLabel = dealType === 'sponti_coupon' ? 'Sponti Coupon' : 'Steady Deal';
  const typeColor = dealType === 'sponti_coupon' ? '#E8632B' : '#29ABE2';

  try {
    await sendEmail(
      `New ${typeLabel}: ${dealTitle} by ${vendorName}`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${typeColor}; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">New ${typeLabel} Created</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Deal</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${dealTitle}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Vendor</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${vendorName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Price</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><s>$${originalPrice.toFixed(2)}</s> → <strong>$${dealPrice.toFixed(2)}</strong> (${Math.round(discountPercent)}% off)</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Expires</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
              </tr>
            </table>
            <a href="https://sponticoupon.com/admin/deals" style="display: inline-block; background: ${typeColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View in Admin</a>
          </div>
        </div>
      `,
    );
  } catch (error) {
    console.error('[Admin Email] Failed to send deal notification:', error);
  }
}
