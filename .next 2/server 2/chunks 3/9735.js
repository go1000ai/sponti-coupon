"use strict";exports.id=9735,exports.ids=[9735,5655],exports.modules={71615:(e,t,r)=>{var o=r(88757);r.o(o,"cookies")&&r.d(t,{cookies:function(){return o.cookies}})},33085:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"DraftMode",{enumerable:!0,get:function(){return a}});let o=r(45869),n=r(6278);class a{get isEnabled(){return this._provider.isEnabled}enable(){let e=o.staticGenerationAsyncStorage.getStore();return e&&(0,n.trackDynamicDataAccessed)(e,"draftMode().enable()"),this._provider.enable()}disable(){let e=o.staticGenerationAsyncStorage.getStore();return e&&(0,n.trackDynamicDataAccessed)(e,"draftMode().disable()"),this._provider.disable()}constructor(e){this._provider=e}}("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},88757:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{cookies:function(){return u},draftMode:function(){return f},headers:function(){return p}});let o=r(68996),n=r(53047),a=r(92044),s=r(72934),i=r(33085),l=r(6278),d=r(45869),c=r(54580);function p(){let e="headers",t=d.staticGenerationAsyncStorage.getStore();if(t){if(t.forceStatic)return n.HeadersAdapter.seal(new Headers({}));(0,l.trackDynamicDataAccessed)(t,e)}return(0,c.getExpectedRequestStore)(e).headers}function u(){let e="cookies",t=d.staticGenerationAsyncStorage.getStore();if(t){if(t.forceStatic)return o.RequestCookiesAdapter.seal(new a.RequestCookies(new Headers({})));(0,l.trackDynamicDataAccessed)(t,e)}let r=(0,c.getExpectedRequestStore)(e),n=s.actionAsyncStorage.getStore();return(null==n?void 0:n.isAction)||(null==n?void 0:n.isAppRoute)?r.mutableCookies:r.cookies}function f(){let e=(0,c.getExpectedRequestStore)("draftMode");return new i.DraftMode(e.draftMode)}("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},53047:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{HeadersAdapter:function(){return a},ReadonlyHeadersError:function(){return n}});let o=r(38238);class n extends Error{constructor(){super("Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers")}static callable(){throw new n}}class a extends Headers{constructor(e){super(),this.headers=new Proxy(e,{get(t,r,n){if("symbol"==typeof r)return o.ReflectAdapter.get(t,r,n);let a=r.toLowerCase(),s=Object.keys(e).find(e=>e.toLowerCase()===a);if(void 0!==s)return o.ReflectAdapter.get(t,s,n)},set(t,r,n,a){if("symbol"==typeof r)return o.ReflectAdapter.set(t,r,n,a);let s=r.toLowerCase(),i=Object.keys(e).find(e=>e.toLowerCase()===s);return o.ReflectAdapter.set(t,i??r,n,a)},has(t,r){if("symbol"==typeof r)return o.ReflectAdapter.has(t,r);let n=r.toLowerCase(),a=Object.keys(e).find(e=>e.toLowerCase()===n);return void 0!==a&&o.ReflectAdapter.has(t,a)},deleteProperty(t,r){if("symbol"==typeof r)return o.ReflectAdapter.deleteProperty(t,r);let n=r.toLowerCase(),a=Object.keys(e).find(e=>e.toLowerCase()===n);return void 0===a||o.ReflectAdapter.deleteProperty(t,a)}})}static seal(e){return new Proxy(e,{get(e,t,r){switch(t){case"append":case"delete":case"set":return n.callable;default:return o.ReflectAdapter.get(e,t,r)}}})}merge(e){return Array.isArray(e)?e.join(", "):e}static from(e){return e instanceof Headers?e:new a(e)}append(e,t){let r=this.headers[e];"string"==typeof r?this.headers[e]=[r,t]:Array.isArray(r)?r.push(t):this.headers[e]=t}delete(e){delete this.headers[e]}get(e){let t=this.headers[e];return void 0!==t?this.merge(t):null}has(e){return void 0!==this.headers[e]}set(e,t){this.headers[e]=t}forEach(e,t){for(let[r,o]of this.entries())e.call(t,o,r,this)}*entries(){for(let e of Object.keys(this.headers)){let t=e.toLowerCase(),r=this.get(t);yield[t,r]}}*keys(){for(let e of Object.keys(this.headers)){let t=e.toLowerCase();yield t}}*values(){for(let e of Object.keys(this.headers)){let t=this.get(e);yield t}}[Symbol.iterator](){return this.entries()}}},68996:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{MutableRequestCookiesAdapter:function(){return p},ReadonlyRequestCookiesError:function(){return s},RequestCookiesAdapter:function(){return i},appendMutableCookies:function(){return c},getModifiedCookieValues:function(){return d}});let o=r(92044),n=r(38238),a=r(45869);class s extends Error{constructor(){super("Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#cookiessetname-value-options")}static callable(){throw new s}}class i{static seal(e){return new Proxy(e,{get(e,t,r){switch(t){case"clear":case"delete":case"set":return s.callable;default:return n.ReflectAdapter.get(e,t,r)}}})}}let l=Symbol.for("next.mutated.cookies");function d(e){let t=e[l];return t&&Array.isArray(t)&&0!==t.length?t:[]}function c(e,t){let r=d(t);if(0===r.length)return!1;let n=new o.ResponseCookies(e),a=n.getAll();for(let e of r)n.set(e);for(let e of a)n.set(e);return!0}class p{static wrap(e,t){let r=new o.ResponseCookies(new Headers);for(let t of e.getAll())r.set(t);let s=[],i=new Set,d=()=>{let e=a.staticGenerationAsyncStorage.getStore();if(e&&(e.pathWasRevalidated=!0),s=r.getAll().filter(e=>i.has(e.name)),t){let e=[];for(let t of s){let r=new o.ResponseCookies(new Headers);r.set(t),e.push(r.toString())}t(e)}};return new Proxy(r,{get(e,t,r){switch(t){case l:return s;case"delete":return function(...t){i.add("string"==typeof t[0]?t[0]:t[0].name);try{e.delete(...t)}finally{d()}};case"set":return function(...t){i.add("string"==typeof t[0]?t[0]:t[0].name);try{return e.set(...t)}finally{d()}};default:return n.ReflectAdapter.get(e,t,r)}}})}}},83856:(e,t,r)=>{r.d(t,{N:()=>i,S:()=>s});var o=r(82591),n=r(84770),a=r.n(n);function s(e){let t=process.env.CRON_SECRET;if(!t)throw Error("CRON_SECRET is not configured — cannot generate secure tokens");return a().createHmac("sha256",t).update(e).digest("hex")}async function i({to:e,customerName:t,businessName:r,dealTitle:n,reviewUrl:a,customerId:i}){let d=process.env.RESEND_FROM_EMAIL||"noreply@sponticoupon.com",c=`How was your experience at ${r}?`,p="http://localhost:3000",u=s(i),f=`${p}/unsubscribe?id=${i}&token=${u}`,g=function({customerName:e,businessName:t,dealTitle:r,reviewUrl:o,appUrl:n,unsubscribeUrl:a}){let s=`${n}/logo.png`;return`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Review Your Experience</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="min-width: 320px;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">

          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${l(n)}" target="_blank" style="text-decoration: none;">
                <img src="${l(s)}" alt="SpontiCoupon" width="180" style="display: block; max-width: 180px; height: auto;" />
              </a>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
              <!-- Orange gradient header -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(135deg, #FF6B35, #FF8F65); padding: 32px 32px 24px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 8px;">&#11088;</div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; line-height: 1.3;">
                      How was your experience?
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Body Content -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 16px; color: #333; font-size: 16px; line-height: 1.6;">
                      Hi ${l(e)},
                    </p>
                    <p style="margin: 0 0 16px; color: #555; font-size: 15px; line-height: 1.6;">
                      You recently redeemed <strong style="color: #1a1a2e;">${l(r)}</strong> at
                      <strong style="color: #1a1a2e;">${l(t)}</strong>. We&rsquo;d love to hear how it went!
                    </p>
                    <p style="margin: 0 0 28px; color: #555; font-size: 15px; line-height: 1.6;">
                      Your feedback helps other customers discover great local businesses and helps
                      <strong>${l(t)}</strong> continue to improve.
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="${l(o)}" target="_blank"
                             style="display: inline-block; background: linear-gradient(135deg, #FF6B35, #FF8F65); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 40px; border-radius: 12px; letter-spacing: 0.3px;">
                            Leave a Review
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Deal info box -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 28px;">
                      <tr>
                        <td style="background-color: #f8f9fa; border-radius: 10px; padding: 16px 20px; border-left: 4px solid #FF6B35;">
                          <p style="margin: 0 0 4px; color: #888; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Your Deal
                          </p>
                          <p style="margin: 0; color: #1a1a2e; font-size: 15px; font-weight: 600;">
                            ${l(r)}
                          </p>
                          <p style="margin: 4px 0 0; color: #888; font-size: 13px;">
                            at ${l(t)}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer — CAN-SPAM Compliance -->
          <tr>
            <td style="padding: 28px 16px; text-align: center;">
              <!-- Why you received this -->
              <p style="margin: 0 0 8px; color: #999; font-size: 12px; line-height: 1.5;">
                You received this email because you redeemed a deal on
                <a href="${l(n)}" style="color: #FF6B35; text-decoration: none;">SpontiCoupon</a>.
              </p>

              <!-- Unsubscribe link -->
              <p style="margin: 0 0 16px; color: #999; font-size: 12px; line-height: 1.5;">
                Don&rsquo;t want review request emails?
                <a href="${l(a)}" style="color: #FF6B35; text-decoration: underline;">Unsubscribe</a>
              </p>

              <!-- Physical address (CAN-SPAM requirement) -->
              <p style="margin: 0 0 8px; color: #bbb; font-size: 11px; line-height: 1.4;">
                SpontiCoupon &bull; Orlando, FL 32801
              </p>

              <p style="margin: 0; color: #ccc; font-size: 11px;">
                &copy; ${new Date().getFullYear()} SpontiCoupon. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()}({customerName:t,businessName:r,dealTitle:n,reviewUrl:a,appUrl:p,unsubscribeUrl:f}),{data:h,error:y}=await (function(){let e=process.env.RESEND_API_KEY;if(!e)throw Error("RESEND_API_KEY is not configured");return new o.R(e)})().emails.send({from:`SpontiCoupon <${d}>`,to:[e],subject:c,html:g,headers:{"List-Unsubscribe":`<${f}>`,"List-Unsubscribe-Post":"List-Unsubscribe=One-Click"}});if(y)throw console.error("[sendReviewRequestEmail] Error sending email:",y),Error(`Failed to send review request email: ${y.message}`);return h}function l(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}},65655:(e,t,r)=>{r.d(t,{createServiceRoleClient:()=>s,f:()=>a});var o=r(67721),n=r(71615);async function a(){let e=await (0,n.cookies)();return(0,o.createServerClient)("https://ypoytvqxuxpjipcyaxwg.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwb3l0dnF4dXhwamlwY3lheHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzAyMzQsImV4cCI6MjA4NzMwNjIzNH0.JPVYvULezPNCxIElpBbUug-7q7aIuhUaSi5D7cw07XE",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}async function s(){let{createClient:e}=await Promise.resolve().then(r.bind(r,37857));return e("https://ypoytvqxuxpjipcyaxwg.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:!1,persistSession:!1}})}}};