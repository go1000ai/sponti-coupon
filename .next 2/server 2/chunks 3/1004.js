"use strict";exports.id=1004,exports.ids=[1004],exports.modules={41004:(t,e,o)=>{o.d(e,{sendSupportNotification:()=>i});let d=new(o(82591)).R(process.env.RESEND_API_KEY);async function i(t){let{ticketId:e,subject:o,category:i,userEmail:r,userRole:p,adminUrl:s}=t,l=process.env.RESEND_FROM_EMAIL||"deals@sponticoupon.com",n=process.env.ADMIN_EMAIL||"admin@sponticoupon.com";try{await d.emails.send({from:`SpontiCoupon Support <${l}>`,to:n,subject:`[Support] New Ticket: ${o}`,html:`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E8632B;">New Support Ticket</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Ticket ID</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${e.slice(0,8)}...</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Subject</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${o}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Category</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${i}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">From</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${r} (${p})</td>
            </tr>
          </table>
          <a href="${s}" style="display: inline-block; background: #E8632B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Ticket</a>
        </div>
      `})}catch(t){console.error("[Support Email] Failed to send notification:",t)}}}};