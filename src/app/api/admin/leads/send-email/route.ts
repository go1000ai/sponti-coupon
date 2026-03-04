import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

// ---------------------------------------------------------------------------
// Email signature — appended to every vendor outreach email
// ---------------------------------------------------------------------------
const EMAIL_SIGNATURE = `
<div style="margin-top:40px;padding-top:24px;border-top:2px solid #e5e7eb;font-family:sans-serif;">

  <!-- Logo + contact block -->
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
    <tr>
      <td style="vertical-align:middle;padding-right:20px;border-right:3px solid #E8632B;width:130px;">
        <img src="https://sponticoupon.com/logo.png" alt="SpontiCoupon" width="120" style="display:block;height:auto;" />
      </td>
      <td style="vertical-align:middle;padding-left:20px;">
        <p style="margin:0 0 3px;font-size:16px;font-weight:700;color:#E8632B;letter-spacing:-0.3px;">SpontiCoupon Team</p>
        <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Local Deal Platform</p>
        <p style="margin:0 0 4px;font-size:13px;color:#374151;">
          ✉&nbsp;
          <a href="mailto:info@sponticoupon.com" style="color:#29ABE2;text-decoration:none;font-weight:500;">info@sponticoupon.com</a>
        </p>
        <p style="margin:0;font-size:13px;color:#374151;">
          🌐&nbsp;
          <a href="https://sponticoupon.com" style="color:#29ABE2;text-decoration:none;font-weight:500;">sponticoupon.com</a>
        </p>
      </td>
    </tr>
  </table>

  <!-- Value prop box -->
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;margin-top:16px;">
    <tr>
      <td style="background:#fff8f5;border:1px solid #fde8d8;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#E8632B;">Why partner with SpontiCoupon?</p>
        <p style="margin:0 0 7px;font-size:13px;color:#374151;line-height:1.5;">
          <span style="color:#E8632B;font-weight:700;">✓</span>&nbsp;
          <strong>Reach local customers</strong> who are actively searching for deals in your area
        </p>
        <p style="margin:0 0 7px;font-size:13px;color:#374151;line-height:1.5;">
          <span style="color:#E8632B;font-weight:700;">✓</span>&nbsp;
          <strong>Zero upfront cost</strong> — only pay when customers claim your offer
        </p>
        <p style="margin:0 0 7px;font-size:13px;color:#374151;line-height:1.5;">
          <span style="color:#E8632B;font-weight:700;">✓</span>&nbsp;
          <strong>Two deal types:</strong> Sponti (flash sales) &amp; Steady (ongoing offers)
        </p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.5;">
          <span style="color:#E8632B;font-weight:700;">✓</span>&nbsp;
          <strong>Auto social media posts</strong> to Facebook, Instagram &amp; more — included
        </p>
      </td>
    </tr>
  </table>

  <!-- Footer disclaimer -->
  <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;line-height:1.5;">
    You received this email because we believe SpontiCoupon could be a great fit for your business.
    If you're not interested, simply ignore this message — no hard feelings!
  </p>

</div>
`;

// POST /api/admin/leads/send-email
// Body: { leadId, toEmail, subject, body }
// Sends outreach email via Resend and marks lead as contacted
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'info@sponticoupon.com';

  const { leadId, toEmail, subject, body } = await request.json() as {
    leadId: string;
    toEmail: string;
    subject: string;
    body: string;
  };

  if (!leadId || !toEmail || !subject || !body) {
    return NextResponse.json({ error: 'leadId, toEmail, subject, and body are required' }, { status: 400 });
  }

  // Send the email
  const { error: sendError } = await resend.emails.send({
    from: `SpontiCoupon <${fromEmail}>`,
    to: toEmail,
    replyTo: fromEmail,
    subject,
    html:
      `<div style="max-width:560px;margin:0 auto;">` +
      body
        .split('\n')
        .map((line) => `<p style="margin:0 0 12px;font-family:sans-serif;font-size:15px;color:#333;line-height:1.6">${line || '&nbsp;'}</p>`)
        .join('') +
      EMAIL_SIGNATURE +
      `</div>`,
    text: body + '\n\n—\nSpontiCoupon Team\ninfo@sponticoupon.com\nsponticoupon.com',
  });

  if (sendError) {
    console.error('[send-email] Resend error:', sendError);
    return NextResponse.json({ error: sendError.message || 'Failed to send email' }, { status: 502 });
  }

  // Update lead: save email address, mark sent timestamp, set status to contacted
  const serviceClient = await createServiceRoleClient();
  const { data: lead, error: updateError } = await serviceClient
    .from('vendor_leads')
    .update({
      email: toEmail,
      email_sent_at: new Date().toISOString(),
      status: 'contacted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .select()
    .single();

  if (updateError) {
    console.error('[send-email] DB update error:', updateError);
    // Email was sent — don't fail the request, just log
  }

  return NextResponse.json({ success: true, lead });
}
