import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Vendor Terms of Service | SpontiCoupon',
  description: 'Terms and conditions for vendors and businesses participating on the SpontiCoupon platform.',
};

export default function VendorTermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-secondary-500 mb-2">Vendor Terms of Service</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: February 24, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600">
        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">1. Agreement to Terms</h2>
          <p>
            These Vendor Terms of Service (&ldquo;Vendor Terms&rdquo;) constitute a legally binding agreement
            between you (&ldquo;Vendor,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and Online Commerce
            Hub, LLC DBA SpontiCoupon (&ldquo;SpontiCoupon,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
            or &ldquo;our&rdquo;). By creating a vendor account and listing deals on SpontiCoupon, you
            agree to be bound by these Vendor Terms, our general{' '}
            <Link href="/terms" className="text-primary-500 hover:underline">Terms of Service</Link>, and
            our <Link href="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">2. Account Registration &amp; Eligibility</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              You must be a legally authorized representative of the business you register on SpontiCoupon.
            </li>
            <li>
              Your business must be a legitimate, legally operating entity in your jurisdiction with all
              required licenses and permits.
            </li>
            <li>
              You are responsible for maintaining the accuracy and security of your account information,
              including your business name, address, contact details, and payment methods.
            </li>
            <li>
              SpontiCoupon reserves the right to verify your business identity and refuse or terminate
              vendor accounts that do not meet our standards.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">3. Subscription &amp; Fees</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Access to the SpontiCoupon vendor platform requires an active subscription. Subscription tiers,
              pricing, and features are detailed on our{' '}
              <Link href="/pricing" className="text-primary-500 hover:underline">Pricing page</Link>.
            </li>
            <li>
              Subscription fees are billed monthly or annually through Stripe. You authorize recurring charges
              to your payment method on file.
            </li>
            <li>
              SpontiCoupon does not charge commissions or per-transaction fees on deals. Your subscription
              fee is your only cost.
            </li>
            <li>
              You may change your subscription tier or cancel at any time. Cancellations take effect at
              the end of your current billing period. No prorated refunds are issued for early cancellation.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">4. Deal Listings</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Accuracy:</strong> All deal listings must be truthful and accurate. Prices, descriptions,
              discount percentages, and terms must reflect the actual offer available to customers.
            </li>
            <li>
              <strong>Honoring Deals:</strong> You are obligated to honor all active deals as listed.
              Refusing to honor a valid, unredeemed deal may result in account suspension.
            </li>
            <li>
              <strong>Deal Types:</strong> SpontiCoupon offers two deal types: Steady Deals (up to 30 days)
              and Sponti Coupons (4&ndash;24 hours, minimum 10% additional discount over your Steady Deal).
            </li>
            <li>
              <strong>Deal Limits:</strong> Your subscription tier determines the number of deals you may
              publish per month. Exceeding your limit requires a tier upgrade.
            </li>
            <li>
              <strong>Content Standards:</strong> Deal images, descriptions, and other content must comply
              with applicable laws and our content policies. Prohibited content includes anything misleading,
              offensive, discriminatory, or infringing on third-party intellectual property.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">5. Deposits &amp; Payments</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Vendors may require customer deposits for Sponti Coupon deals. Deposit payments are processed
              through your configured payment processor (Stripe, Square, PayPal, Venmo, Zelle, or Cash App).
            </li>
            <li>
              SpontiCoupon does not collect, hold, or process deposit payments. All financial transactions
              occur directly between you and the customer through your chosen payment processor.
            </li>
            <li>
              You are responsible for your own refund policies and must clearly communicate deposit terms
              to customers through your deal listings.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">6. Customer Reviews</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Customers who redeem deals may leave reviews after a 24-hour waiting period. Reviews are
              publicly visible and contribute to your vendor rating.
            </li>
            <li>
              You may reply to reviews through the SpontiCoupon vendor portal. Replies should be
              professional and constructive.
            </li>
            <li>
              You may not offer incentives, threaten, or coerce customers in connection with reviews.
              Manipulation of the review system will result in account penalties.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">7. Vendor Loyalty Programs</h2>
          <p>
            Vendors on eligible subscription tiers may create their own loyalty programs (punch card or
            points-based) to reward repeat customers. These vendor-operated loyalty programs are separate
            from SpontiCoupon&rsquo;s platform-wide SpontiPoints program.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>You are solely responsible for the administration, terms, and fulfillment of your loyalty program.</li>
            <li>SpontiCoupon is not liable for any disputes between you and customers regarding loyalty rewards.</li>
            <li>Loyalty rewards must be clearly described and honored as advertised.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">8. ROI Dashboard &amp; Analytics</h2>
          <p>
            SpontiCoupon provides analytics and ROI metrics to help you measure the effectiveness of your deals.
            Revenue estimates are calculated using your self-reported average ticket value and are provided
            for informational purposes only. SpontiCoupon makes no guarantees about the accuracy of estimated
            revenue figures.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">9. Data &amp; Privacy</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              You will receive access to customer data (names, emails) only for customers who interact
              with your deals. This data must be used solely for the purpose of fulfilling deals and
              providing customer service.
            </li>
            <li>
              You may not sell, share, or use customer data for purposes unrelated to your SpontiCoupon
              deals without explicit customer consent.
            </li>
            <li>
              You are responsible for compliance with applicable data protection and privacy laws in
              your jurisdiction, including but not limited to CCPA and applicable state privacy laws.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">10. Termination</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              You may terminate your vendor account at any time by canceling your subscription and
              contacting support.
            </li>
            <li>
              SpontiCoupon may suspend or terminate your account for violations of these terms, fraud,
              abuse, or any conduct that harms the platform or its users.
            </li>
            <li>
              Upon termination, all active deals will be deactivated. You remain obligated to honor any
              deals that were claimed before termination through their expiration date.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">11. Limitation of Liability</h2>
          <p>
            SpontiCoupon provides the platform on an &ldquo;as is&rdquo; basis. We are not liable for any
            indirect, incidental, special, or consequential damages arising from your use of the platform,
            including but not limited to loss of revenue, data, or business opportunity.
          </p>
          <p>
            Our total liability to you for any claim arising out of these Vendor Terms shall not exceed the
            subscription fees you paid to SpontiCoupon in the twelve (12) months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">12. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless SpontiCoupon, its officers, directors, employees, and
            agents from any claims, damages, losses, or expenses (including reasonable attorney fees) arising
            from your breach of these Vendor Terms, your deal listings, or your interactions with customers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">13. Governing Law &amp; Disputes</h2>
          <p>
            These Vendor Terms are governed by the laws of the State of Florida, United States. Any disputes
            shall be resolved through binding arbitration in accordance with the rules of the American
            Arbitration Association, conducted in the State of Florida.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">14. Contact</h2>
          <p>
            For questions about these Vendor Terms, please contact us
            at <Link href="/contact" className="text-primary-500 hover:underline">our contact page</Link> or
            email us at vendors@sponticoupon.com.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Online Commerce Hub, LLC DBA SpontiCoupon. All rights reserved.
        </p>
        <div className="flex justify-center gap-4 mt-3 text-sm">
          <Link href="/terms" className="text-gray-400 hover:text-primary-500 transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="text-gray-400 hover:text-primary-500 transition-colors">Privacy Policy</Link>
          <Link href="/loyalty-terms" className="text-gray-400 hover:text-primary-500 transition-colors">SpontiPoints Terms</Link>
        </div>
      </div>
    </div>
  );
}
