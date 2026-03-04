import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  title: 'Vendor Terms of Service | SpontiCoupon',
  description: 'Terms and conditions for vendors and businesses participating on the SpontiCoupon platform. Understand your responsibilities and ours.',
  alternates: { canonical: `${BASE_URL}/vendor-terms` },
};

const WE_ARE_RESPONSIBLE = [
  'Providing and maintaining the SpontiCoupon platform and vendor dashboard',
  'Hosting and displaying your deal listings to customers',
  'Processing QR code and 6-digit redemption codes for your deals',
  'Providing analytics, reporting, and ROI metrics (for informational use)',
  'Securing your account data and platform infrastructure',
  'Offering subscription billing through Stripe (our payment processor)',
  'Providing customer support for platform-related issues',
  'Generating AI-assisted deal content and social media captions (when enabled)',
  'Maintaining uptime and performing routine platform maintenance',
];

const WE_ARE_NOT_RESPONSIBLE = [
  'The quality, safety, legality, or fulfillment of your products or services',
  'Any financial disputes between you and your customers',
  'Deposit or payment transactions processed through your chosen payment accounts (Stripe Connect, Venmo, Zelle, Cash App, Square, PayPal) — those funds go directly to you, not us',
  'Customer volume, deal performance, or revenue outcomes — we do not guarantee results',
  'Third-party payment processor outages, fees, or account suspensions (Stripe, PayPal, etc.)',
  'Accuracy of AI-generated deal titles, descriptions, tags, or social media captions — you must review before publishing',
  'Social media platform outages, algorithm changes, or account restrictions that affect auto-posted content',
  'Tax obligations arising from your sales or business operations',
  'Fraudulent redemptions by customers who obtain codes improperly',
  'Deals claimed by customers before your account termination — you remain obligated to honor those',
  'Actions taken by customers that are beyond our reasonable control',
];

export default function VendorTermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-primary-500 transition-colors text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Vendor Terms of Service</h1>
          <p className="text-gray-400 text-sm mt-2">Last updated: March 4, 2026 &nbsp;·&nbsp; Effective immediately for all new and existing vendor accounts</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Plain-English Summary */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <h2 className="font-bold text-gray-900 text-lg">Plain-English Summary (Read This First)</h2>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5 shrink-0">•</span>SpontiCoupon is a <strong>marketing and deal management platform</strong> — we connect you with customers. We are not a party to your sales transactions.</li>
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5 shrink-0">•</span><strong>You keep 100% of every sale.</strong> Customer deposits go directly to your payment account. We never touch your money.</li>
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5 shrink-0">•</span><strong>You are responsible for honoring every deal you publish.</strong> If you list it and a customer claims it, you must honor it.</li>
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5 shrink-0">•</span>We provide tools, analytics, and AI assistance — but we do not guarantee deal performance or customer volume.</li>
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5 shrink-0">•</span>Your subscription fee is your only recurring cost to us. No commissions, no hidden fees.</li>
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5 shrink-0">•</span>These terms are governed by Florida law. Disputes go to binding arbitration.</li>
          </ul>
        </div>

        {/* Responsibility Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

          {/* What we ARE responsible for */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <h2 className="font-bold text-gray-900">What SpontiCoupon IS Responsible For</h2>
            </div>
            <ul className="space-y-3">
              {WE_ARE_RESPONSIBLE.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* What we are NOT responsible for */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              <h2 className="font-bold text-gray-900">What SpontiCoupon Is NOT Responsible For</h2>
            </div>
            <ul className="space-y-3">
              {WE_ARE_NOT_RESPONSIBLE.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Full Legal Terms */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10 space-y-8 text-gray-600">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Agreement to Terms</h2>
            <p className="leading-relaxed">
              These Vendor Terms of Service (&ldquo;Vendor Terms&rdquo;) constitute a legally binding agreement between you
              (&ldquo;Vendor,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and Online Commerce Hub, LLC DBA SpontiCoupon
              (&ldquo;SpontiCoupon,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By creating a vendor account,
              listing deals, or otherwise using our platform, you agree to be bound by these Vendor Terms, our general{' '}
              <Link href="/terms" className="text-primary-500 hover:underline">Terms of Service</Link>, and our{' '}
              <Link href="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link>. If you do not agree,
              do not create a vendor account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Account Registration &amp; Eligibility</h2>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li>You must be a legally authorized representative of the business you register on SpontiCoupon.</li>
              <li>Your business must be a legitimate, legally operating entity in your jurisdiction with all required licenses and permits.</li>
              <li>You are responsible for maintaining the accuracy of your account information — business name, address, contact details, and payment methods.</li>
              <li>You must be at least 18 years of age to create a vendor account.</li>
              <li>SpontiCoupon reserves the right to verify your business identity and to refuse or terminate accounts that do not meet our standards.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Subscription &amp; Fees</h2>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li>Access to the SpontiCoupon vendor platform requires an active paid subscription. Tiers, pricing, and features are detailed on our <Link href="/pricing" className="text-primary-500 hover:underline">Pricing page</Link>.</li>
              <li>Subscription fees are billed monthly or annually through Stripe. By subscribing, you authorize recurring charges to your payment method on file.</li>
              <li>SpontiCoupon charges <strong>zero commissions and zero per-transaction fees</strong> on deals. Your subscription fee is your only cost to us.</li>
              <li>Free trial periods, if offered, begin on the date of subscription. A valid payment method is required at sign-up. You will be charged at the end of the trial unless you cancel beforehand.</li>
              <li>You may upgrade, downgrade, or cancel your subscription at any time. Cancellations take effect at the end of your current billing period. No prorated refunds are issued for early cancellation.</li>
              <li>Promotional pricing (including Founders Launch discounts) is applied at the time of subscription and honored for the duration specified. SpontiCoupon reserves the right to modify promotional offers for new subscribers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Deal Listings &amp; Your Obligations</h2>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li><strong>Accuracy:</strong> All deal listings must be truthful and accurate. Prices, descriptions, discount percentages, and terms must reflect the actual offer available to customers.</li>
              <li><strong>Honoring Deals:</strong> You are obligated to honor all deals exactly as listed. Refusing to honor a valid, unredeemed deal without legitimate cause (e.g., fraud) may result in account suspension or termination.</li>
              <li><strong>Deal Types:</strong> SpontiCoupon offers two deal types — Steady Deals (up to 30 days) and Sponti Coupons (4&ndash;24 hours, with a minimum 10% additional discount over your Steady Deal price). Both types are subject to your subscription tier limits.</li>
              <li><strong>Deal Limits:</strong> Your subscription tier determines the number of deals you may publish per month. Exceeding your limit requires a tier upgrade.</li>
              <li><strong>Content Standards:</strong> Deal images, descriptions, and other content must comply with applicable laws. Prohibited content includes anything misleading, deceptive, offensive, discriminatory, sexually explicit, or infringing on third-party intellectual property.</li>
              <li><strong>No Guaranteed Results:</strong> SpontiCoupon does not guarantee any minimum number of deal claims, customer interactions, or revenue outcomes. Marketing results vary by business, deal quality, location, and customer demand.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Payments &amp; Deposits</h2>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li>Vendors may require customer deposits for Sponti Coupon deals. Deposit payments are processed through your configured payment account (Stripe Connect, Square, PayPal, Venmo, Zelle, or Cash App).</li>
              <li><strong>SpontiCoupon does not collect, hold, process, or have access to deposit payments.</strong> All financial transactions for deposits occur directly between you and the customer through your chosen payment processor.</li>
              <li>You are solely responsible for your refund policies, chargeback disputes, and deposit disputes. You must clearly communicate deposit terms to customers through your deal listings.</li>
              <li>SpontiCoupon is not liable for losses arising from third-party payment processor errors, outages, account suspensions, or unauthorized transactions.</li>
              <li>You are responsible for all taxes, reporting, and compliance obligations arising from payments you receive.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. AI-Powered Features</h2>
            <p className="leading-relaxed mb-3">
              Eligible subscription tiers include access to Ava, our AI deal strategist, which may generate deal titles,
              descriptions, tags, pricing suggestions, and other content. By using these features, you agree to the following:
            </p>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li>AI-generated content is provided as a <strong>starting point only</strong>. You are responsible for reviewing and approving all content before it is published.</li>
              <li>SpontiCoupon is not responsible for inaccurate, misleading, or inappropriate AI-generated content that you publish without review.</li>
              <li>AI analytics and ROI estimates are based on your self-reported data and are provided for informational purposes only. They do not constitute financial advice.</li>
              <li>You retain full ownership of your business data. AI models used by the platform do not use your specific deal data to train external models.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Social Media Auto-Posting</h2>
            <p className="leading-relaxed mb-3">
              Pro and Business tier vendors may connect social media accounts (Facebook, Instagram, X/Twitter, TikTok)
              to auto-post deals. By enabling this feature, you agree:
            </p>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li>You authorize SpontiCoupon to post content to your connected accounts on your behalf when you publish a deal.</li>
              <li>SpontiCoupon is not responsible for posts that violate any social media platform&rsquo;s terms of service. You are solely responsible for ensuring your deal content complies with each platform&rsquo;s policies.</li>
              <li>SpontiCoupon is not liable for account suspensions, bans, or penalties imposed by social media platforms on your accounts.</li>
              <li>SpontiCoupon is not responsible for failed posts due to social media platform outages, API changes, or expired authorization tokens. You should verify posts after deal publication.</li>
              <li>You may disconnect social media accounts at any time from your vendor settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Customer Reviews</h2>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li>Customers who redeem deals may leave reviews after a 24-hour waiting period. Reviews are publicly visible and contribute to your vendor rating.</li>
              <li>You may reply to reviews through your vendor dashboard. Replies must be professional and constructive.</li>
              <li>You may not offer incentives, threaten, or coerce customers in connection with reviews. Manipulation of the review system will result in account penalties up to and including termination.</li>
              <li>SpontiCoupon does not remove reviews except in cases of clear policy violations (harassment, spam, or fraudulent content). We are not responsible for negative reviews that reflect a customer&rsquo;s genuine experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Loyalty Programs</h2>
            <p className="leading-relaxed">
              Vendors on eligible subscription tiers may create loyalty programs (punch card or points-based) to reward
              repeat customers. These vendor-operated programs are separate from SpontiCoupon&rsquo;s platform-wide
              SpontiPoints program. You are solely responsible for the administration, terms, and fulfillment of your
              loyalty program. SpontiCoupon is not liable for disputes between you and customers regarding loyalty rewards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Data &amp; Privacy</h2>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li>You will receive access to customer data (names, contact information) only for customers who interact with your deals. This data must be used solely for fulfilling deals and providing customer service related to SpontiCoupon transactions.</li>
              <li>You may not sell, share, or use customer data for purposes unrelated to your SpontiCoupon deals without explicit customer consent.</li>
              <li>You are responsible for compliance with applicable data protection and privacy laws in your jurisdiction, including but not limited to CCPA and applicable state privacy laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Deal Non-Fulfillment &amp; Enforcement</h2>
            <p className="leading-relaxed mb-3">
              Honoring the deals you publish is your primary obligation as a vendor. Failure to do so harms customers
              and damages the trust that makes the SpontiCoupon marketplace work. Accordingly, we treat non-fulfillment
              seriously:
            </p>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li>
                <strong>Immediate Deal Removal:</strong> SpontiCoupon may remove any deal from the platform at any time
                if we receive credible reports of non-fulfillment, misrepresentation, or fraud, without prior notice
                to you.
              </li>
              <li>
                <strong>Account Suspension:</strong> A first confirmed instance of refusing to honor a valid, unredeemed
                deal without legitimate cause (e.g., verifiable fraud by the customer) may result in immediate account
                suspension. During suspension, all active deals are deactivated and no new deals may be published.
              </li>
              <li>
                <strong>Account Termination:</strong> Repeated non-fulfillment, confirmed fraud, or a single egregious
                instance of non-compliance will result in permanent account termination. Terminated vendors are
                blacklisted from opening new accounts on the platform.
              </li>
              <li>
                <strong>Post-Termination Obligation:</strong> Termination of your account does not release you from
                the obligation to honor any deals that were claimed by customers prior to the termination date.
                You remain legally obligated to fulfill those deals through their expiration date.
              </li>
              <li>
                <strong>No Refund on Termination:</strong> If your account is terminated for cause (violations of these
                terms), no refund of prepaid subscription fees will be issued.
              </li>
              <li>
                <strong>Customer Complaints:</strong> We reserve the right to investigate customer complaints regarding
                your deals. You agree to cooperate with any such investigation and to respond to our inquiries within
                72 hours.
              </li>
              <li>
                <strong>Reporting Abuse:</strong> If you believe a customer is attempting to fraudulently redeem a deal
                (e.g., using a forged or expired code), you must report it to us immediately rather than simply refusing
                service. We will investigate and take appropriate action.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Prohibited Conduct</h2>

            <p className="leading-relaxed mb-3">You may not use the SpontiCoupon platform to:</p>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li>Post false, misleading, or deceptive deal listings</li>
              <li>Engage in fraudulent transactions or collude with customers to abuse the platform</li>
              <li>Circumvent the redemption system or manipulate analytics</li>
              <li>Spam, harass, or threaten customers or SpontiCoupon staff</li>
              <li>Violate any applicable federal, state, or local law or regulation</li>
              <li>Attempt to reverse-engineer, scrape, or disrupt the platform or its underlying systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Termination</h2>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li>You may terminate your vendor account at any time by canceling your subscription and contacting support.</li>
              <li>SpontiCoupon may suspend or terminate your account without prior notice for violations of these terms, fraud, abuse, or any conduct that harms the platform or its users.</li>
              <li>Upon termination, all active deals will be deactivated. You remain obligated to honor any deals that were claimed by customers before the termination date, through those deals&rsquo; expiration.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">14. Disclaimer of Warranties</h2>
            <p className="leading-relaxed">
              The SpontiCoupon platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without
              warranties of any kind, either express or implied, including but not limited to implied warranties of
              merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the platform
              will be uninterrupted, error-free, or free of viruses or other harmful components. We do not guarantee
              that using the platform will result in any specific business outcomes, customer volume, or revenue.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">15. Limitation of Liability</h2>
            <p className="leading-relaxed mb-3">
              To the fullest extent permitted by applicable law, SpontiCoupon and its officers, directors, employees,
              and agents shall not be liable for any indirect, incidental, special, punitive, or consequential damages
              arising from your use of the platform, including but not limited to loss of revenue, loss of data, loss
              of business, or loss of goodwill — even if we have been advised of the possibility of such damages.
            </p>
            <p className="leading-relaxed">
              Our total cumulative liability to you for any and all claims arising out of or related to these Vendor Terms
              shall not exceed the subscription fees you paid to SpontiCoupon in the twelve (12) months immediately
              preceding the event giving rise to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">16. Indemnification</h2>
            <p className="leading-relaxed">
              You agree to indemnify, defend, and hold harmless SpontiCoupon, its officers, directors, employees, and
              agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including
              reasonable attorney&rsquo;s fees) arising out of or related to: (a) your breach of these Vendor Terms;
              (b) your deal listings or content; (c) your interactions with customers; (d) your business operations;
              or (e) your violation of any applicable law or third-party right.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">17. Modifications to These Terms</h2>
            <p className="leading-relaxed">
              SpontiCoupon reserves the right to modify these Vendor Terms at any time. We will notify you of material
              changes via email or a notice within the vendor dashboard at least 14 days before the changes take effect.
              Your continued use of the platform after the effective date constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">18. Governing Law &amp; Dispute Resolution</h2>
            <p className="leading-relaxed">
              These Vendor Terms are governed by the laws of the State of Florida, United States, without regard to
              conflict of law principles. Any dispute arising from or relating to these terms or the platform shall
              be resolved through binding arbitration in accordance with the rules of the American Arbitration
              Association (AAA), conducted in the State of Florida. Each party shall bear its own costs unless the
              arbitrator determines otherwise. Nothing in this section prevents either party from seeking injunctive
              or other equitable relief in a court of competent jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">19. Contact</h2>
            <p className="leading-relaxed">
              For questions about these Vendor Terms, please contact us at{' '}
              <Link href="/contact" className="text-primary-500 hover:underline">our contact page</Link> or email{' '}
              <a href="mailto:vendors@sponticoupon.com" className="text-primary-500 hover:underline">vendors@sponticoupon.com</a>.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-10 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Online Commerce Hub, LLC DBA SpontiCoupon. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-3 text-sm">
            <Link href="/terms" className="text-gray-400 hover:text-primary-500 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="text-gray-400 hover:text-primary-500 transition-colors">Privacy Policy</Link>
            <Link href="/loyalty-terms" className="text-gray-400 hover:text-primary-500 transition-colors">SpontiPoints Terms</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
