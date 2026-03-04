import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  title: 'Terms of Service — SpontiCoupon',
  description: 'SpontiCoupon Terms of Service. Read our terms governing the use of our Sponti Deal platform for customers and vendors.',
  alternates: { canonical: `${BASE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-gray-400 mb-10">Last updated: March 3, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-900">1. Acceptance of Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            By accessing or using the SpontiCoupon platform (&quot;Service&quot;), operated by Online Commerce Hub, LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service and our{' '}
            <Link href="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link>,
            which is incorporated herein by reference. If you do not agree to these terms, do not use the Service. We reserve the right to update these terms at any time, and continued use of the Service constitutes acceptance of any modifications.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">2. Eligibility</h2>
          <p className="text-gray-600 leading-relaxed">
            You must be at least 18 years of age, or the age of majority in your jurisdiction if higher, to create an account or use the Service. By using the Service, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these Terms. Vendors must be legally authorized to conduct business in their jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">3. Platform Description</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon is a deal marketplace that connects local businesses (&quot;Vendors&quot;) with consumers (&quot;Customers&quot;). We facilitate the listing and discovery of time-limited deals, including Steady Deals and Sponti Coupons (flash deals with countdown timers). SpontiCoupon acts as a technology platform and is not a party to any transaction between Vendors and Customers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">4. User Accounts</h2>
          <p className="text-gray-600 leading-relaxed">
            You must create an account to claim deals or list deals on the platform. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to provide accurate, current, and complete information during registration. We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">5. Sponti Coupons &amp; Time-Limited Deals</h2>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">5.1 Sponti Deal Rules</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            Sponti Coupons are flash deals governed by the following platform rules:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-gray-600">
            <li>
              <strong>Deal duration:</strong> Each Sponti Coupon is active for a minimum of 4 hours and a maximum of 24 hours from the time it is published, as set by the Vendor.
            </li>
            <li>
              <strong>Redemption window:</strong> After claiming a Sponti Coupon, the Customer has between <strong>4 and 24 hours</strong> to redeem the deal at the Vendor&apos;s location, as specified on the deal listing. Deals claimed but not redeemed within the stated window expire automatically.
            </li>
            <li>
              <strong>Minimum additional discount for duplicate deals:</strong> If a Vendor already offers the same or substantially similar deal as a Steady Deal, any Sponti Coupon version of that deal must provide a discount of <strong>at least 10% greater</strong> than the existing Steady Deal discount. Vendors may not use Sponti Coupons to offer the same or lesser value as an existing deal under a different format. SpontiCoupon reserves the right to remove any Sponti deal that does not meet this requirement.
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">5.2 Time-Sensitive Deal Disclaimer</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mt-2">
            <h4 className="font-bold text-amber-800 text-base mb-3">Important — Safety Notice</h4>
            <p className="text-amber-800 leading-relaxed">
              By claiming a Sponti Coupon, you acknowledge that you are accepting a time-sensitive offer and voluntarily choosing to redeem it within the specified timeframe.
            </p>
            <p className="text-amber-800 leading-relaxed mt-3">
              <strong>SpontiCoupon, Online Commerce Hub, LLC, its officers, directors, employees, and affiliates are not liable for any accidents, injuries, property damage, or any other harm that may occur while traveling to or from a Vendor&apos;s location to redeem a deal.</strong> Users are solely responsible for their own safety and should never rush, drive recklessly, or violate any traffic laws to meet a deal&apos;s expiration time. No deal is worth risking your safety.
            </p>
            <p className="text-amber-800 leading-relaxed mt-3">
              By using Sponti Coupons, you agree to exercise reasonable caution and judgment. You understand that the countdown timer is an incentive feature and does not create an obligation to take unsafe actions. If you cannot safely redeem a deal within the timeframe, let it expire. Your safety always comes first.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">6. Deposits &amp; Payments</h2>
          <p className="text-gray-600 leading-relaxed">
            For certain deals, a deposit is required at the time of claiming. Deposits are processed directly through the Vendor&apos;s chosen payment processor (e.g., Stripe Connect, PayPal, Venmo, Zelle, Cash App) and go directly to the Vendor. <strong>SpontiCoupon never holds, processes, collects, or has access to any customer-to-vendor payment funds.</strong> The remaining balance (deal price minus deposit) is paid directly to the Vendor at the time of redemption.
          </p>
          <div className="mt-4 space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-800 font-semibold mb-1">Sponti Coupon Deposits — Forfeited if Not Redeemed</p>
              <p className="text-gray-600 text-sm leading-relaxed">
                If you claim a Sponti Coupon with a deposit and do not redeem the deal within the stated redemption window, <strong>your deposit is forfeited in full.</strong> You will not receive a refund, platform credit, or vendor credit. By claiming a Sponti Coupon with a deposit, you expressly agree to this forfeiture policy.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-800 font-semibold mb-1">Steady Deal Deposits — Vendor Credit if Not Used</p>
              <p className="text-gray-600 text-sm leading-relaxed">
                If you claim a Steady Deal with a deposit and do not redeem it before the deal&apos;s expiration date, your deposit is converted to a <strong>credit with that specific Vendor</strong> — not a SpontiCoupon platform credit. <strong>Vendors are required by SpontiCoupon platform policy to honor this credit.</strong> The credit must be applied toward a future purchase or service with that same Vendor. Failure by a Vendor to honor this credit is a violation of the Vendor Terms of Service and may result in suspension or removal from the platform. If a Vendor refuses to apply your credit, you may report the issue to us at{' '}
                <a href="mailto:support@sponticoupon.com" className="text-primary-500 hover:underline">support@sponticoupon.com</a>.
              </p>
            </div>
          </div>
          <p className="text-gray-600 leading-relaxed mt-3 text-sm">
            Vendors set their own deposit amounts, which are clearly disclosed before claiming. By claiming any deal with a deposit, you acknowledge and accept the applicable policy stated above.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mt-4">
            <h3 className="font-bold text-gray-900 text-base mb-2">Remaining Balance at Redemption</h3>
            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              When you redeem a deal, any remaining balance (the deal price minus any deposit already paid) is due directly to the Vendor at the time of service. SpontiCoupon offers two options for settling this balance — neither of which involves SpontiCoupon holding or receiving your money:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
              <li>
                <strong>Stripe Payment Link (Internal).</strong> The Vendor may generate a secure Stripe checkout link through SpontiCoupon. If you pay via this link, your payment is processed by Stripe, Inc. and transferred <strong>directly and in full</strong> to the Vendor&apos;s connected Stripe account. SpontiCoupon facilitates the link generation only — we never receive, hold, or have access to these funds. No application fee or platform fee is deducted by SpontiCoupon.
              </li>
              <li>
                <strong>External Payment (Vendor&apos;s Own Method).</strong> The Vendor may collect the remaining balance using their own card terminal, cash register, or a third-party app (Zelle, Venmo, Cash App, etc.). If you pay by any external method, that transaction is entirely between you and the Vendor. SpontiCoupon has no visibility into, role in, or responsibility for external payments. Any disputes about external payments must be resolved directly with the Vendor.
              </li>
            </ul>
            <p className="text-gray-600 text-xs leading-relaxed mt-3">
              By using SpontiCoupon, you acknowledge that SpontiCoupon is not a party to any balance-collection transaction — whether paid via Stripe link or by any external method — and that SpontiCoupon bears no liability for the outcome of those transactions.
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mt-4">
            <h3 className="font-bold text-red-800 text-base mb-2">Payment Dispute Notice — Important</h3>
            <p className="text-red-800 text-sm leading-relaxed">
              Because SpontiCoupon is not a party to any payment transaction and never touches customer-to-vendor funds, <strong>all payment disputes, refund requests, and chargeback claims must be directed to the Vendor or the Vendor&apos;s payment processor</strong> — not to SpontiCoupon. SpontiCoupon has no ability to issue, authorize, or facilitate refunds for payments made directly to a Vendor.
            </p>
            <ul className="list-disc pl-5 mt-3 text-sm text-red-800 space-y-1">
              <li><strong>Credit/debit card via Stripe:</strong> Contact your card issuer to initiate a chargeback.</li>
              <li><strong>PayPal:</strong> Open a dispute through PayPal&apos;s Resolution Center within 180 days.</li>
              <li><strong>Venmo / Cash App:</strong> Contact the Vendor directly; these apps generally do not offer buyer protection for goods and services.</li>
              <li><strong>Zelle:</strong> Contact your bank directly; Zelle does not offer a dispute process for authorized payments.</li>
            </ul>
            <p className="text-red-800 text-sm mt-3">
              For deal-related complaints (e.g., a Vendor refused to honor a valid deal), you may report the issue to us at{' '}
              <a href="mailto:support@sponticoupon.com" className="underline">support@sponticoupon.com</a>{' '}
              or visit our <Link href="/dispute-policy" className="underline">Deal Dispute Policy</Link> page.
              SpontiCoupon may investigate and take action against non-compliant Vendors, including suspension or removal.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">7. Redemption Codes &amp; QR Codes</h2>
          <p className="text-gray-600 leading-relaxed">
            Upon claiming a deal, you will receive a unique 6-digit redemption code and/or QR code. These codes are for single use only and cannot be shared, transferred, or resold. You are responsible for keeping your redemption codes secure. SpontiCoupon is not responsible for unauthorized use of your codes if you share them with others.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">8. Vendor Subscriptions &amp; Auto-Renewal</h2>
          <p className="text-gray-600 leading-relaxed">
            Vendors must maintain an active subscription to list deals on the platform. Subscriptions are billed on a monthly or annual recurring basis at a flat rate with zero commission on transactions. <strong>Vendor subscriptions automatically renew</strong> at the end of each billing period unless cancelled before the renewal date. Vendors may cancel at any time via the Vendor Dashboard → Subscription → Cancel Plan, or by emailing billing@sponticoupon.com. Cancellation takes effect at the end of the current billing period; access continues until that date.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            A 14-day free trial is available for new Vendor accounts (or as otherwise specified at signup). No charge is made until the trial ends. Vendors who cancel before the trial ends will not be charged. See the <Link href="/vendor-terms" className="text-primary-500 hover:underline">Vendor Terms of Service</Link> for full subscription terms, enforcement, and deal obligations.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">9. Vendor Responsibilities &amp; SpontiCoupon&apos;s Platform Authority</h2>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">9.1 Vendor Obligations</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            Vendors are solely responsible for the accuracy of their deal listings, including pricing, descriptions, availability, and expiration times. Vendors must honor all valid, unexpired deals that have been claimed by Customers. SpontiCoupon is not responsible for the quality, safety, or legality of any goods or services offered by Vendors.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            Vendors must honor all outstanding claimed deals even after account cancellation or termination. Failure to honor deals may result in suspension, termination, and financial liability to affected customers. See the <Link href="/vendor-terms" className="text-primary-500 hover:underline">Vendor Terms of Service</Link> for complete enforcement terms.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong>Steady Deal deposit credits are mandatory.</strong> When a Customer claims a Steady Deal with a deposit and does not redeem it before expiration, the Vendor is required to retain that deposit amount as a credit applicable to a future transaction with the Customer at their business. Vendors may not refuse, expire, or reduce this credit without Customer consent. Violation of this requirement is grounds for platform suspension or permanent removal.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">9.2 SpontiCoupon&apos;s Platform Enforcement Authority</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            Although SpontiCoupon does not handle, hold, or process customer-to-vendor payments, SpontiCoupon retains full authority over the platform itself. By using the Service — as either a Customer or a Vendor — you acknowledge that SpontiCoupon has the sole and absolute right to exercise any or all of the following actions at its discretion, with or without prior notice:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-gray-600">
            <li><strong>Suspend or permanently remove</strong> any Vendor account that violates these Terms, the Vendor Terms of Service, or SpontiCoupon&apos;s policies — immediately and without liability to the Vendor.</li>
            <li><strong>Remove, unpublish, or expire</strong> any deal listing that is fraudulent, misleading, illegal, or otherwise in violation of platform rules.</li>
            <li><strong>Restrict platform features</strong> available to any User or Vendor, including the ability to post new deals, claim deals, or access the dashboard.</li>
            <li><strong>Issue SpontiPoints or platform account credits</strong> to Customers as a goodwill remedy when a Vendor is found to have failed to honor a valid deal — at SpontiCoupon&apos;s sole discretion and not as an obligation.</li>
            <li><strong>Investigate complaints</strong> submitted by Customers or Vendors and make binding enforcement decisions regarding platform access.</li>
            <li><strong>Report bad actors</strong> to regulatory authorities, including the FTC, state attorneys general, the Better Business Bureau, or other relevant bodies.</li>
            <li><strong>Pursue legal remedies</strong> against Vendors who breach the Vendor Terms of Service, cause harm to Customers through the platform, or damage SpontiCoupon&apos;s reputation or business.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-3">
            SpontiCoupon&apos;s enforcement actions are limited to the platform. We cannot compel a Vendor to issue a cash refund, reverse a payment, or take any action outside the platform. Our authority is to control who participates on SpontiCoupon — not to intervene in the financial relationship between Customers and Vendors.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
            <p className="text-blue-800 text-sm leading-relaxed">
              <strong>In plain language:</strong> SpontiCoupon is the gatekeeper of the platform. Vendors need an active account in good standing to reach customers and post deals. If a Vendor doesn&apos;t play by the rules, we can remove them — protecting all future customers, even when we cannot recover money already paid.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">10. SpontiPoints Loyalty Program</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon operates the SpontiPoints loyalty rewards program for Customers. Participation in SpontiPoints is governed by the separate <Link href="/loyalty-terms" className="text-primary-500 hover:underline">SpontiPoints Terms &amp; Conditions</Link>, which are incorporated into these Terms by reference. In the event of a conflict between these Terms and the SpontiPoints Terms, the SpontiPoints Terms control with respect to the loyalty program.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            Individual Vendors may also offer their own separate loyalty programs to their customers. Vendor loyalty programs are the sole responsibility of the Vendor and are not administered by SpontiCoupon. SpontiCoupon makes no representations or warranties regarding Vendor loyalty programs.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">11. Limitation of Liability</h2>
          <p className="text-gray-600 leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SPONTICOUPON AND ONLINE COMMERCE HUB, LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            SpontiCoupon is a marketplace platform. We do not manufacture, store, distribute, or deliver any goods or services listed by Vendors. We are not liable for any disputes between Customers and Vendors, including issues related to product quality, service delivery, refunds, or any other transactional matter. <strong>Because SpontiCoupon never handles, holds, or processes any money paid by Customers to Vendors, SpontiCoupon has zero liability for any payment disputes, unauthorized charges, or failed refunds arising from Customer-to-Vendor transactions.</strong> All such disputes are solely between the Customer and the Vendor (and/or the Vendor&apos;s payment processor).
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            Without limitation, SpontiCoupon is not liable for: (a) any injuries, accidents, or damages arising from travel to or from a Vendor location; (b) the quality or safety of Vendor products or services; (c) Vendor failure to honor deals; (d) unauthorized access to your account; (e) any loss resulting from expired or unredeemed deals; or (f) any payment dispute, refund denial, chargeback outcome, or loss of funds arising from payments made directly to a Vendor through any payment processor.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            Notwithstanding the foregoing, nothing in these Terms limits liability for: (i) death or personal injury caused by negligence; (ii) fraud or fraudulent misrepresentation; or (iii) any liability that cannot be excluded or limited under applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">12. Indemnification</h2>
          <p className="text-gray-600 leading-relaxed">
            You agree to indemnify and hold harmless SpontiCoupon, Online Commerce Hub, LLC, and their officers, directors, employees, agents, and affiliates from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney&apos;s fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any rights of another party; or (d) any claim related to your interaction with a Vendor or another User.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">13. Intellectual Property &amp; Copyright</h2>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">13.1 SpontiCoupon&apos;s Intellectual Property</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            All content on the SpontiCoupon platform created or owned by Online Commerce Hub, LLC — including text, graphics, logos, icons, images, and software — is protected by applicable intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Service without our written permission.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6">13.2 Vendor-Uploaded Content &amp; DMCA Safe Harbor</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            SpontiCoupon is a marketplace platform. Vendors upload and publish their own deal listings, including business names, descriptions, photographs, logos, and promotional images. <strong>SpontiCoupon does not pre-screen, review, or control vendor-uploaded content prior to publication.</strong> Vendors are solely responsible for ensuring that all content they upload complies with applicable copyright, trademark, and other intellectual property laws. By uploading any content to the platform, a Vendor represents and warrants that they own or have the necessary rights and licenses to use that content and to grant SpontiCoupon the right to display it.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            SpontiCoupon complies with the Digital Millennium Copyright Act (&quot;DMCA&quot;), 17 U.S.C. § 512, and operates as a service provider under the DMCA safe harbor provisions. SpontiCoupon is not liable for infringing content uploaded by Vendors, provided we respond promptly to valid takedown notices. We have designated a registered DMCA agent with the U.S. Copyright Office to receive infringement notifications.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong>If you believe that content on SpontiCoupon infringes your copyright</strong>, please submit a DMCA takedown notice to our designated agent at{' '}
            <a href="mailto:legal@sponticoupon.com" className="text-primary-500 hover:underline">legal@sponticoupon.com</a>.
            Your notice must include: (i) a description of the copyrighted work you claim has been infringed; (ii) the URL or location of the allegedly infringing material; (iii) your contact information; (iv) a statement of good faith belief; and (v) a statement, under penalty of perjury, that the information is accurate and that you are the copyright owner or authorized to act on their behalf. Full requirements and procedures are detailed in our{' '}
            <Link href="/dmca-policy" className="text-primary-500 hover:underline">DMCA &amp; Copyright Policy</Link>.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            Upon receipt of a valid DMCA notice, SpontiCoupon will promptly remove or disable access to the allegedly infringing content and notify the Vendor. Vendors who submit a valid counter-notification may have content restored in accordance with the DMCA process. SpontiCoupon reserves the right to terminate accounts of repeat copyright infringers.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              <strong>In plain language:</strong> We don&apos;t control what images or text vendors upload. If a vendor uploads something they don&apos;t have the rights to — such as a stock photo without a license, another business&apos;s logo, or copyrighted material — that&apos;s on them, not us. If you&apos;re a copyright owner and spot your work on our platform without permission, email us and we&apos;ll take it down promptly.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">14. Prohibited Conduct</h2>
          <p className="text-gray-600 leading-relaxed">
            You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorized access to any part of the Service; (c) create multiple accounts to abuse deal limits; (d) manipulate, resell, or redistribute redemption codes; (e) post fraudulent or misleading deal listings; (f) interfere with the proper operation of the Service; or (g) use automated tools to scrape, crawl, or extract data from the Service without written authorization.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">15. Termination</h2>
          <p className="text-gray-600 leading-relaxed">
            We may terminate or suspend your account and access to the Service at our sole discretion, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive, including Sections 11, 12, 16, and 17.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">16. Governing Law &amp; Jurisdiction</h2>
          <p className="text-gray-600 leading-relaxed">
            These Terms are governed by and construed in accordance with the laws of the State of Florida, United States, without regard to its conflict of law principles, and excluding the United Nations Convention on Contracts for the International Sale of Goods (CISG). Nothing in this Section limits any mandatory consumer protection rights you may have under the laws of your state of residence that cannot be waived by contract.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">17. Dispute Resolution &amp; Arbitration</h2>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">17.1 Informal Resolution</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            Before initiating any formal dispute, you agree to contact us at legal@sponticoupon.com and give us 30 days to resolve the issue informally. Most concerns can be resolved quickly this way.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">17.2 Binding Arbitration</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            If informal resolution fails, any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved exclusively through final and binding arbitration administered by the American Arbitration Association (&quot;AAA&quot;) under its Consumer Arbitration Rules. The arbitration shall be conducted remotely (by videoconference or telephone) unless both parties agree otherwise. The Federal Arbitration Act (&quot;FAA&quot;), 9 U.S.C. § 1 et seq., governs the interpretation and enforcement of this arbitration agreement.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">17.3 Class Action Waiver</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            <strong>YOU AND SPONTICOUPON EACH WAIVE THE RIGHT TO A JURY TRIAL AND THE RIGHT TO PARTICIPATE IN CLASS ACTION LITIGATION.</strong> All claims must be brought in your individual capacity, and not as a plaintiff or class member in any purported class or representative proceeding. The arbitrator may not consolidate claims of more than one person and may not preside over any class or representative proceeding. If this class action waiver is found unenforceable, the entire arbitration agreement in Section 17.2 shall be null and void, and the parties shall litigate in court.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">17.4 Opt-Out Right</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            You may opt out of this arbitration agreement within 30 days of first accepting these Terms by sending a written notice to legal@sponticoupon.com with the subject line &quot;Arbitration Opt-Out&quot; and your name and account email. Opting out does not affect any other provision of these Terms.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">17.5 Exceptions</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            Either party may seek emergency injunctive or other equitable relief from a court of competent jurisdiction to prevent actual or threatened infringement or misappropriation of intellectual property rights. Nothing in this Section prevents you from filing a complaint with a government agency (such as the FTC or your state attorney general), which is not subject to arbitration.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">18. Changes to These Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update these Terms from time to time. For material changes, we will provide at least 30 days&apos; notice by email or by posting a prominent notice on the Service. Your continued use of the Service after the effective date of changes constitutes acceptance of the revised Terms. If you do not agree to the revised Terms, you may close your account before the effective date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">19. Contact Information</h2>
          <p className="text-gray-600 leading-relaxed">
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mt-3">
            <p className="text-gray-700 font-medium">Online Commerce Hub, LLC — SpontiCoupon</p>
            <p className="text-gray-500 text-sm mt-1">Email: legal@sponticoupon.com</p>
            <p className="text-gray-500 text-sm">Website: sponticoupon.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}
