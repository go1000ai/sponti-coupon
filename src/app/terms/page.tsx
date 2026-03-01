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
      <p className="text-gray-400 mb-10">Last updated: February 22, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-900">1. Acceptance of Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            By accessing or using the SpontiCoupon platform (&quot;Service&quot;), operated by Online Commerce Hub, LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. We reserve the right to update these terms at any time, and continued use of the Service constitutes acceptance of any modifications.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">2. Platform Description</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon is a Sponti Deal marketplace that connects local businesses (&quot;Vendors&quot;) with consumers (&quot;Customers&quot;). We facilitate the listing and discovery of time-limited deals, including Steady Deals and Sponti Coupons (Sponti Deals with countdown timers). SpontiCoupon acts as a technology platform and is not a party to any transaction between Vendors and Customers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">3. User Accounts</h2>
          <p className="text-gray-600 leading-relaxed">
            You must create an account to claim deals or list deals on the platform. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to provide accurate, current, and complete information during registration. We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">4. Sponti Coupons &amp; Time-Limited Deals</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mt-4">
            <h3 className="font-bold text-amber-800 text-lg mb-3">Important — Time-Sensitive Deal Disclaimer</h3>
            <p className="text-amber-800 leading-relaxed">
              Sponti Coupons are time-limited Sponti Deals with a minimum duration of 4 hours and a maximum of 24 hours, as set by each Vendor. By claiming a Sponti Coupon, you acknowledge that you are accepting a time-sensitive offer and voluntarily choosing to redeem it within the specified timeframe.
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
          <h2 className="text-2xl font-bold text-gray-900">5. Deposits &amp; Payments</h2>
          <p className="text-gray-600 leading-relaxed">
            For Sponti Coupons, a deposit is required at the time of claiming. Deposits are processed through Stripe and go directly to the Vendor&apos;s connected Stripe account. SpontiCoupon does not hold, process, or have access to customer payment funds. The remaining balance (deal price minus deposit) is paid directly to the Vendor at the time of redemption.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong>Deposits are non-refundable</strong> if the Sponti Coupon expires without being redeemed. By claiming a Sponti Coupon, you acknowledge and accept this refund policy. Vendors set their own deposit amounts, which are clearly displayed before claiming.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">6. Redemption Codes &amp; QR Codes</h2>
          <p className="text-gray-600 leading-relaxed">
            Upon claiming a deal, you will receive a unique 6-digit redemption code and/or QR code. These codes are for single use only and cannot be shared, transferred, or resold. You are responsible for keeping your redemption codes secure. SpontiCoupon is not responsible for unauthorized use of your codes if you share them with others.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">7. Vendor Responsibilities</h2>
          <p className="text-gray-600 leading-relaxed">
            Vendors are solely responsible for the accuracy of their deal listings, including pricing, descriptions, availability, and expiration times. Vendors must honor all valid, unexpired deals that have been claimed by Customers. SpontiCoupon is not responsible for the quality, safety, or legality of any goods or services offered by Vendors.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            Vendors agree to maintain an active subscription to list deals on the platform. Subscription fees are billed monthly at a flat rate with zero commission on transactions. Vendors may cancel their subscription at any time, but must honor all outstanding claimed deals.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">8. Limitation of Liability</h2>
          <p className="text-gray-600 leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SPONTICOUPON AND GO1000 AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            SpontiCoupon is a marketplace platform. We do not manufacture, store, distribute, or deliver any goods or services listed by Vendors. We are not liable for any disputes between Customers and Vendors, including issues related to product quality, service delivery, refunds, or any other transactional matter.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            Without limitation, SpontiCoupon is not liable for: (a) any injuries, accidents, or damages arising from travel to or from a Vendor location; (b) the quality or safety of Vendor products or services; (c) Vendor failure to honor deals; (d) unauthorized access to your account; (e) any loss resulting from expired or unredeemed deals.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">9. Indemnification</h2>
          <p className="text-gray-600 leading-relaxed">
            You agree to indemnify and hold harmless SpontiCoupon, Online Commerce Hub, LLC, and their officers, directors, employees, agents, and affiliates from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney&apos;s fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any rights of another party; or (d) any claim related to your interaction with a Vendor or another User.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">10. Intellectual Property</h2>
          <p className="text-gray-600 leading-relaxed">
            All content on the SpontiCoupon platform, including text, graphics, logos, icons, images, and software, is the property of Online Commerce Hub, LLC or its content suppliers and is protected by intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Service without our written permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">11. Prohibited Conduct</h2>
          <p className="text-gray-600 leading-relaxed">
            You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorized access to any part of the Service; (c) create multiple accounts to abuse deal limits; (d) manipulate, resell, or redistribute redemption codes; (e) post fraudulent or misleading deal listings; (f) interfere with the proper operation of the Service; or (g) use automated tools to scrape, crawl, or extract data from the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">12. Dispute Resolution</h2>
          <p className="text-gray-600 leading-relaxed">
            Any disputes arising from or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall take place in the state where Online Commerce Hub, LLC is incorporated, and the arbitrator&apos;s decision shall be final and binding. You agree to waive any right to a jury trial or class action.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">13. Termination</h2>
          <p className="text-gray-600 leading-relaxed">
            We may terminate or suspend your account and access to the Service at our sole discretion, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">14. Governing Law</h2>
          <p className="text-gray-600 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law principles. Any legal action or proceeding relating to your access to or use of the Service shall be instituted in a state or federal court of competent jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">15. Contact Information</h2>
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
