import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface DealForEmail {
  title: string;
  slug: string;
  original_price: number | null;
  deal_price: number | null;
  discount_percentage: number | null;
  image_url: string | null;
  vendor_name: string;
}

interface SendDealLinkParams {
  callerName: string;
  callerEmail: string;
  deals: DealForEmail[];
}

export async function sendDealLinkEmail(params: SendDealLinkParams) {
  const { callerName, callerEmail, deals } = params;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'deals@sponticoupon.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

  const firstName = callerName?.split(' ')[0] || 'there';

  const dealCards = deals.map((deal) => {
    const dealUrl = `${appUrl}/deals/${deal.slug}`;
    const priceInfo = deal.deal_price != null && deal.original_price != null
      ? `<span style="text-decoration: line-through; color: #999;">$${deal.original_price.toFixed(2)}</span> <span style="color: #E8632B; font-weight: bold; font-size: 18px;">$${deal.deal_price.toFixed(2)}</span>`
      : deal.discount_percentage
        ? `<span style="color: #E8632B; font-weight: bold; font-size: 18px;">${deal.discount_percentage}% OFF</span>`
        : '';

    return `
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 16px;">
        ${deal.image_url ? `<img src="${deal.image_url}" alt="${deal.title}" style="width: 100%; height: 200px; object-fit: cover;" />` : ''}
        <div style="padding: 16px;">
          <p style="color: #666; font-size: 13px; margin: 0 0 4px;">${deal.vendor_name}</p>
          <h3 style="margin: 0 0 8px; color: #111; font-size: 18px;">${deal.title}</h3>
          ${priceInfo ? `<p style="margin: 0 0 12px;">${priceInfo}</p>` : ''}
          <a href="${dealUrl}" style="display: inline-block; background: #E8632B; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">View Deal</a>
        </div>
      </div>
    `;
  }).join('');

  const subject = deals.length === 1
    ? `Here's the deal you asked about: ${deals[0].title}`
    : `Here are the ${deals.length} deals you asked about`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
      <div style="background: linear-gradient(135deg, #E8632B, #d4551f); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">SpontiCoupon</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 15px;">Your deals, delivered.</p>
      </div>

      <div style="padding: 24px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Hi ${firstName}! As promised on the phone, here ${deals.length === 1 ? 'is the deal' : 'are the deals'} you were interested in:
        </p>

        ${dealCards}

        <div style="margin-top: 24px; padding: 16px; background: #FFF7ED; border-radius: 8px; border-left: 4px solid #E8632B;">
          <p style="margin: 0; color: #333; font-size: 14px;">
            <strong>How it works:</strong> Click the button above to view the deal, then claim it for free. You'll get a QR code to redeem at the business.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

        <p style="font-size: 14px; color: #333; margin-bottom: 8px;">
          Want to see more deals near you?
        </p>
        <a href="${appUrl}/deals" style="display: inline-block; background: #29ABE2; color: white; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Browse All Deals</a>
      </div>

      <div style="padding: 20px 24px; background: #f9fafb; text-align: center; border-radius: 0 0 12px 12px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          SpontiCoupon by Online Commerce Hub, LLC<br />
          <a href="${appUrl}/privacy" style="color: #999;">Privacy</a> &middot;
          <a href="${appUrl}/terms" style="color: #999;">Terms</a>
        </p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: `SpontiCoupon <${fromEmail}>`,
    to: callerEmail,
    subject,
    html,
  });
}
