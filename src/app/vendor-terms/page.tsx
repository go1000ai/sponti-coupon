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
          <p className="text-gray-400 text-sm mt-2">Last updated: March 3, 2026 &nbsp;·&nbsp; Effective immediately for all new and existing vendor accounts</p>
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
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Payments, Deposits &amp; Money Transmission</h2>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li><strong>Platform Role.</strong> SpontiCoupon is a marketplace platform that facilitates connections between vendors and customers. SpontiCoupon does not accept, hold, transmit, or control customer funds on vendors&rsquo; behalf. SpontiCoupon is not a bank, money transmitter, payment processor, or money services business.</li>
              <li>Vendors may require customer deposits for Sponti Coupon deals. Deposit payments are processed through your configured payment account (Stripe Connect, Square, PayPal, Venmo, Zelle, or Cash App).</li>
              <li><strong>SpontiCoupon does not collect, hold, process, or have access to deposit payments.</strong> All financial transactions for deposits occur directly between you and the customer through your chosen payment processor.</li>
              <li><strong>Stripe Connect.</strong> If you use SpontiCoupon&rsquo;s integrated Stripe Connect feature, your payments are processed by Stripe, Inc., a licensed payment processor. Your use of Stripe Connect is subject to Stripe&rsquo;s Connected Account Agreement and Stripe&rsquo;s Services Agreement. SpontiCoupon is not a party to transactions processed through Stripe and does not control Stripe&rsquo;s licensing, compliance, or operations.</li>
              <li><strong>Manual Payments.</strong> If you accept payments via third-party apps (Venmo, Zelle, Cash App, or similar), you are solely responsible for complying with those platforms&rsquo; terms of service and applicable law. SpontiCoupon is not responsible for disputes, chargebacks, or losses arising from manual payment arrangements.</li>
              <li>
                <strong>Remaining Balance Collection at Redemption.</strong> When a customer redeems a deal that has a remaining balance due, SpontiCoupon provides two tools — neither of which makes SpontiCoupon a party to the transaction:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  <li><strong>Stripe Payment Link.</strong> You may use SpontiCoupon&rsquo;s scan interface to generate a Stripe checkout link for the remaining balance. The customer pays on their own device; funds transfer directly to your connected Stripe account. SpontiCoupon does not collect, hold, or receive any portion of this payment and charges no application fee on balance transactions.</li>
                  <li><strong>External Collection.</strong> You may collect the remaining balance using your own card terminal, cash, or any other method outside SpontiCoupon. When you confirm collection using the &ldquo;Collected In Person&rdquo; button, you are solely representing that payment has been received. SpontiCoupon has no visibility into, and bears no responsibility for, external payment transactions. Any dispute arising from an external payment is solely between you and the customer.</li>
                </ul>
              </li>
              <li>You are solely responsible for your refund policies, chargeback disputes, and deposit disputes. You must clearly communicate deposit terms to customers through your deal listings.</li>
              <li><strong>Mandatory Steady Deal Credit.</strong> If a customer claims a Steady Deal with a deposit and does not redeem it before the deal&rsquo;s expiration date, you are <strong>required</strong> to retain that deposit amount as a credit applicable to a future purchase or service at your business. You may not refuse, cancel, or reduce this credit without the customer&rsquo;s written consent. Failure to honor Steady Deal credits is a violation of this Agreement and may result in immediate account suspension or permanent removal from the platform.</li>
              <li><strong>Sponti Coupon Deposits — No Credit Required.</strong> If a customer claims a Sponti Coupon with a deposit and does not redeem it within the stated redemption window, the deposit is forfeited by the customer. You are not required to issue a refund or credit for unredeemed Sponti Coupon deposits.</li>
              <li>You are responsible for all taxes, sales tax collection, and compliance obligations arising from payments you receive in your jurisdiction. Nothing in this Agreement constitutes tax or financial advice.</li>
              <li>You are responsible for maintaining any required state or federal licenses for your business activities, including any required money transmitter licenses in states where your operations require them.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. AI-Powered Features &amp; Disclosure</h2>
            <p className="leading-relaxed mb-3">
              Eligible subscription tiers include access to Ava, our AI deal strategist, and other AI-assisted tools
              that may generate deal titles, descriptions, tags, images, pricing suggestions, and social media captions.
              These features are powered by third-party large language models (including Google Gemini and Anthropic Claude).
              By using these features, you agree to the following:
            </p>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li><strong>Review before publishing.</strong> AI-generated content — including titles, descriptions, tags, images, and captions — is provided as a <strong>starting point only</strong>. You are solely responsible for reviewing, editing, and approving all content before it is published on the platform or posted to social media.</li>
              <li><strong>AI hallucination risk.</strong> AI models may produce inaccurate, incomplete, or misleading content (commonly called &ldquo;hallucinations&rdquo;). SpontiCoupon is not responsible for errors, omissions, or inaccuracies in AI-generated content that you publish without review. Publishing inaccurate deal information is a violation of Section 4 of this Agreement.</li>
              <li><strong>AI-generated images.</strong> When you use our AI image generation feature, images are created by a generative AI model. You must ensure generated images accurately represent your actual business, products, or services. Using AI images that misrepresent your offering is prohibited and may result in account suspension.</li>
              <li><strong>AI search tags.</strong> Deals on SpontiCoupon may be assigned AI-generated search tags to improve discoverability. These tags are suggestions; you may edit or remove them from your deal listing at any time.</li>
              <li><strong>No financial advice.</strong> AI analytics and ROI estimates are based on platform data and are provided for informational purposes only. They do not constitute financial, tax, or business advice.</li>
              <li><strong>Data usage.</strong> You retain full ownership of your business data. SpontiCoupon does not use your specific deal data to train external AI models, and we do not share your data with AI providers beyond what is necessary to process your request in real time.</li>
              <li><strong>FTC compliance.</strong> You are responsible for ensuring that any AI-generated content you publish complies with FTC guidelines on truthful advertising (16 CFR Part 255), including that claims about your products or services are accurate and substantiated.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Social Media Auto-Posting &amp; Consent</h2>
            <p className="leading-relaxed mb-3">
              Pro and Business tier vendors may connect social media accounts (Facebook, Instagram, X/Twitter, TikTok)
              to automatically post deals when published. <strong>This feature is opt-in</strong> — it is only activated
              when you explicitly connect a social media account from your Vendor Settings. By connecting an account
              and enabling auto-posting, you expressly consent to and agree to the following:
            </p>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li><strong>Express authorization.</strong> You grant SpontiCoupon permission to post deal content — including deal images, descriptions, and AI-generated captions — to your connected social media accounts automatically when you publish a deal. This authorization remains in effect until you disconnect the account.</li>
              <li><strong>AI-generated captions.</strong> Post captions are generated by an AI model (Google Gemini) and are tailored for each social media platform. Captions may include hashtags and promotional language. You are responsible for reviewing deal content before publishing, as posts go out automatically. SpontiCoupon is not liable for caption errors or platform-specific formatting issues.</li>
              <li><strong>FTC #Ad disclosure.</strong> When SpontiCoupon&rsquo;s brand accounts post about your deals, those posts are labeled <code>#Ad</code> per FTC 16 CFR § 255.5 (2023). Posts made to your own business accounts are considered your own promotional content and are your responsibility to disclose per applicable law if required.</li>
              <li><strong>Platform compliance.</strong> You are solely responsible for ensuring your deal content, images, and captions comply with each social media platform&rsquo;s terms of service and community guidelines. SpontiCoupon is not liable for posts that violate any platform&rsquo;s rules.</li>
              <li><strong>No guarantee of posting.</strong> SpontiCoupon is not responsible for failed, delayed, or missing posts due to social media platform outages, API changes, expired authorization tokens, or rate limits. You should verify that posts appeared after deal publication.</li>
              <li><strong>Account consequences.</strong> SpontiCoupon is not liable for account suspensions, bans, reduced reach, or other penalties imposed by social media platforms on your accounts as a result of auto-posted content.</li>
              <li><strong>Revoke at any time.</strong> You may disconnect any social media account and disable auto-posting at any time from Vendor Settings → Social Media. Disconnecting stops future auto-posts but does not delete previously published posts.</li>
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
              <li><strong>Vendor Data Obligations.</strong> If you collect personal information from customers through your use of the SpontiCoupon platform, you are independently responsible for complying with all applicable federal and state privacy laws, including providing required notices to your customers and honoring their privacy rights. You represent and warrant that customer data you collect will be used only for purposes consistent with your own privacy policy and applicable law, and not shared with unauthorized third parties.</li>
              <li><strong>California Residents (CPRA).</strong> Vendors located in California, or vendors whose customers include California residents, should be aware that the California Consumer Privacy Act of 2018, as amended by the California Privacy Rights Act of 2020 (&ldquo;CPRA&rdquo;), may impose obligations on your business with respect to the personal information of California consumers. You are independently responsible for your own CPRA compliance.</li>
              <li><strong>Multi-State Privacy Laws.</strong> You are responsible for compliance with applicable data protection and privacy laws in all jurisdictions where you operate, including but not limited to Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Texas (TDPSA), and other applicable state privacy laws.</li>
              <li>Our collection and use of your data is governed by our <Link href="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link>, incorporated herein by reference.</li>
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
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Advertising Accuracy &amp; FTC Compliance</h2>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li><strong>Truthful Pricing.</strong> You represent and warrant that all prices, discounts, and savings claims in your deal listings are truthful and not misleading. Any reference to an &ldquo;original,&rdquo; &ldquo;regular,&rdquo; &ldquo;was,&rdquo; or &ldquo;list&rdquo; price means a price at which you actually offered the product or service to the public in the recent past at a substantial quantity. You shall not fabricate or inflate original prices solely to make a discount appear larger, in accordance with the FTC&rsquo;s Guides Against Deceptive Pricing (16 CFR Part 233).</li>
              <li><strong>No Fake Reviews.</strong> You shall not submit, solicit, or compensate any person for submitting false, misleading, or fake reviews or testimonials on the SpontiCoupon platform. You shall not suppress genuine negative reviews. In accordance with the FTC&rsquo;s Guides Concerning the Use of Endorsements and Testimonials (16 CFR Part 255), verified customer reviews may not be filtered or altered by you.</li>
              <li><strong>Material Connections.</strong> If you offer any incentive (discount, free item, payment, or other benefit) in exchange for a customer review or social media post about your deal, you must ensure that material connection is clearly disclosed in that review or post, consistent with 16 CFR Part 255.</li>
              <li><strong>Coupon Terms.</strong> You shall clearly state all material restrictions on your deal listings, including expiration dates, geographic limitations, excluded items, and any limits on quantity per customer. Restrictions shall be displayed prominently and not buried in fine print.</li>
              <li><strong>FTC Act Generally.</strong> You agree to comply with all applicable FTC regulations and guidelines, including but not limited to the FTC Act&rsquo;s prohibition on unfair or deceptive acts or practices (15 U.S.C. &sect; 45). SpontiCoupon reserves the right to remove any deal listing it reasonably believes violates applicable advertising laws or regulations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Prohibited Conduct</h2>

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
            <h2 className="text-xl font-bold text-gray-900 mb-3">14. Termination</h2>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li>You may terminate your vendor account at any time by canceling your subscription and contacting support.</li>
              <li>SpontiCoupon may suspend or terminate your account without prior notice for violations of these terms, fraud, abuse, or any conduct that harms the platform or its users.</li>
              <li>Upon termination, all active deals will be deactivated. You remain obligated to honor any deals that were claimed by customers before the termination date, through those deals&rsquo; expiration.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">15. Disclaimer of Warranties</h2>
            <p className="leading-relaxed">
              The SpontiCoupon platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without
              warranties of any kind, either express or implied, including but not limited to implied warranties of
              merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the platform
              will be uninterrupted, error-free, or free of viruses or other harmful components. We do not guarantee
              that using the platform will result in any specific business outcomes, customer volume, or revenue.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">16. Limitation of Liability</h2>
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
            <h2 className="text-xl font-bold text-gray-900 mb-3">17. Indemnification</h2>
            <p className="leading-relaxed">
              You agree to indemnify, defend, and hold harmless SpontiCoupon, its officers, directors, employees, and
              agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including
              reasonable attorney&rsquo;s fees) arising out of or related to: (a) your breach of these Vendor Terms;
              (b) your deal listings or content; (c) your interactions with customers; (d) your business operations;
              or (e) your violation of any applicable law or third-party right.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">18. Modifications to These Terms</h2>
            <p className="leading-relaxed">
              SpontiCoupon reserves the right to modify these Vendor Terms at any time. We will notify you of material
              changes via email or a notice within the vendor dashboard at least 14 days before the changes take effect.
              Your continued use of the platform after the effective date constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">19. Governing Law</h2>
            <p className="leading-relaxed">
              This Agreement and any dispute or claim arising out of or relating to it shall be governed by and construed
              in accordance with the laws of the State of Florida, without regard to its conflict-of-law provisions.
              The parties acknowledge that this Agreement evidences a transaction involving interstate commerce.
              Notwithstanding the foregoing, nothing in this Agreement limits any rights you may have under the mandatory
              consumer protection laws of the state in which you are located, to the extent such laws cannot be waived
              by contract. The United Nations Convention on Contracts for the International Sale of Goods does not apply
              to this Agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">20. Arbitration Agreement</h2>
            <p className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
              Please read this section carefully — it affects your legal rights and contains a class action waiver.
            </p>
            <p className="leading-relaxed mb-3">
              <strong>Agreement to Arbitrate.</strong> You and SpontiCoupon agree that any dispute, claim, or controversy
              arising out of or relating to this Agreement or your use of the SpontiCoupon platform, including disputes
              about the formation, existence, breach, termination, enforcement, interpretation, or validity of this
              Agreement (collectively, &ldquo;Disputes&rdquo;), shall be resolved exclusively by binding individual
              arbitration rather than in court, except as set forth below.
            </p>
            <p className="leading-relaxed mb-3">
              <strong>Arbitration Rules.</strong> Arbitration shall be conducted by the American Arbitration Association
              (&ldquo;AAA&rdquo;) under its Commercial Arbitration Rules (or, where applicable, its Consumer Arbitration
              Rules), available at www.adr.org. The arbitration shall be conducted <strong>remotely via videoconference
              or telephone</strong>, unless both parties mutually agree in writing to an in-person hearing. If an
              in-person hearing is required by applicable law and cannot be waived, it shall be held in Miami-Dade County,
              Florida, or such other location as the AAA determines is most convenient. The arbitrator shall have
              exclusive authority to resolve disputes relating to the interpretation, applicability, or enforceability
              of this Arbitration Agreement.
            </p>
            <p className="leading-relaxed mb-3">
              <strong>Arbitration Costs.</strong> AAA filing fees and arbitrator compensation shall be allocated in
              accordance with applicable AAA rules. For claims under $10,000, SpontiCoupon will advance your portion
              of the filing fee if you demonstrate financial hardship. Each party bears its own attorneys&rsquo; fees
              unless the arbitrator awards fees under applicable law.
            </p>
            <p className="leading-relaxed mb-3">
              <strong>Exceptions.</strong> Either party may seek relief in small claims court for disputes within that
              court&rsquo;s jurisdictional limits, provided the action remains in small claims court. Either party may
              seek emergency injunctive or other equitable relief in any court of competent jurisdiction to prevent
              irreparable harm pending arbitration. Nothing in this Agreement prevents either party from filing a
              complaint with a government regulator or agency.
            </p>
            <p className="leading-relaxed mb-3">
              <strong>Opt-Out Right.</strong> You may opt out of this Arbitration Agreement within thirty (30) days of
              first accepting this Agreement by sending written notice to{' '}
              <a href="mailto:legal@sponticoupon.com" className="text-primary-500 hover:underline">legal@sponticoupon.com</a>{' '}
              with the subject line &ldquo;Arbitration Opt-Out.&rdquo; Your opt-out applies only to the Agreement version
              in effect at the time of your opt-out and does not affect other sections of these Vendor Terms.
            </p>
            <p className="leading-relaxed">
              <strong>Class Action and Representative Action Waiver.</strong> TO THE FULLEST EXTENT PERMITTED BY
              APPLICABLE LAW, YOU AND SPONTICOUPON EACH AGREE THAT ANY PROCEEDING, WHETHER IN ARBITRATION OR IN COURT,
              SHALL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, MASS, OR REPRESENTATIVE
              ACTION. You and SpontiCoupon waive any right to bring or participate in a class action, collective action,
              or other representative proceeding in any forum. The arbitrator shall have no authority to consolidate
              claims, conduct class arbitration, or award relief to any person other than the individual parties.
              If this Class Action Waiver is found unenforceable as to a particular claim, that claim shall be severed
              from arbitration and may proceed in court individually, but the waiver remains in full effect for all
              other claims. If the Class Action Waiver is found entirely unenforceable, this entire Arbitration Agreement
              shall be null and void only as to that claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">21. Contact</h2>
            <p className="leading-relaxed">
              For questions about these Vendor Terms, please contact us at{' '}
              <Link href="/contact" className="text-primary-500 hover:underline">our contact page</Link> or email{' '}
              <a href="mailto:vendors@sponticoupon.com" className="text-primary-500 hover:underline">vendors@sponticoupon.com</a>.
              For arbitration opt-out notices, email{' '}
              <a href="mailto:legal@sponticoupon.com" className="text-primary-500 hover:underline">legal@sponticoupon.com</a>.
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
