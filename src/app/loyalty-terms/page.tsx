import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  title: 'SpontiPoints Loyalty Program Terms | SpontiCoupon',
  description: 'Terms and conditions for the SpontiPoints loyalty rewards program.',
  alternates: { canonical: `${BASE_URL}/loyalty-terms` },
};

export default function LoyaltyTermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">SpontiPoints Loyalty Program Terms &amp; Conditions</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: March 3, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Program Overview</h2>
          <p>
            SpontiPoints is the official customer loyalty rewards program operated by Online Commerce Hub, LLC
            DBA SpontiCoupon (&ldquo;SpontiCoupon,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
            By participating in the SpontiPoints program, you agree to these Terms and Conditions, which are
            incorporated into and form part of the SpontiCoupon{' '}
            <Link href="/terms" className="text-primary-500 hover:underline">Terms of Service</Link>.
          </p>
          <p className="mt-2">
            SpontiPoints is a platform-wide loyalty program separate from any vendor-specific loyalty programs
            offered by individual businesses on SpontiCoupon. Points earned through SpontiPoints cannot be
            combined with or transferred to vendor loyalty programs, and vice versa. Vendor loyalty programs
            are administered solely by the respective vendors and are not governed by these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Eligibility</h2>
          <p>
            All registered SpontiCoupon customers who are at least 18 years of age (or the age of majority
            in their jurisdiction) with an active account in good standing are automatically enrolled in the
            SpontiPoints program at no additional cost. No purchase is necessary to join; however, points are
            earned only through qualifying deal redemptions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. Earning SpontiPoints</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Deal Redemptions:</strong> You earn 25 SpontiPoints each time you successfully redeem
              a deal at a participating vendor. Points are credited automatically at the time of redemption.
            </li>
            <li>
              <strong>Bonus Points:</strong> From time to time, SpontiCoupon may offer bonus SpontiPoints
              through promotions, campaigns, or special events. Bonus point offers will be communicated via
              email, push notifications, or in-app announcements and are subject to their own specific terms.
            </li>
            <li>
              <strong>One Award Per Redemption:</strong> Only one SpontiPoints award is issued per deal
              redemption. Duplicate awards for the same transaction are not permitted.
            </li>
            <li>
              <strong>Qualifying Redemptions Only:</strong> Points are awarded for deal redemptions confirmed
              by a valid QR scan or 6-digit redemption code. Disputed, reversed, or fraudulent transactions
              do not qualify.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Redeeming SpontiPoints</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Conversion Rate:</strong> 100 SpontiPoints = $1.00 USD in platform account credit.
            </li>
            <li>
              <strong>Minimum Redemption:</strong> A minimum of 500 SpontiPoints ($5.00 credit) is
              required per redemption.
            </li>
            <li>
              <strong>Redemption Increments:</strong> SpontiPoints must be redeemed in multiples of 100 points.
            </li>
            <li>
              <strong>Account Credit:</strong> Redeemed SpontiPoints are converted to account credit, which
              may be applied toward future deals on the SpontiCoupon platform.
            </li>
            <li>
              <strong>Non-Transferable:</strong> SpontiPoints and any resulting credit are non-transferable
              and cannot be exchanged for cash, gift cards, or any other form of payment outside the platform.
            </li>
            <li>
              <strong>No Cash Value:</strong> SpontiPoints have no independent monetary value and are not
              redeemable for cash under any circumstances. Points are earned through engagement with the
              platform, not purchased, and therefore do not constitute a stored value instrument or gift card.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Point Expiration</h2>
          <p>
            SpontiPoints expire 12 months after the date they are earned. Expired points are automatically
            removed from your balance and cannot be restored. We recommend redeeming your points regularly
            to maximize their value.
          </p>
          <p className="mt-2">
            You can view the expiration dates of your points in the SpontiPoints section of your account
            dashboard. We may send courtesy reminders before points expire, but it is your responsibility
            to track and use your points before their expiration date.
          </p>
          <p className="mt-2">
            <strong>Account credit</strong> converted from redeemed points does not expire as long as your
            account remains active and in good standing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Account, Points Balance &amp; Account Closure</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              SpontiPoints are linked to your SpontiCoupon account and cannot be transferred between accounts.
            </li>
            <li>
              If your account is suspended or terminated for cause (fraud, abuse, or violation of our Terms),
              all accumulated SpontiPoints and unredeemed credit will be forfeited immediately.
            </li>
            <li>
              If you voluntarily close your account in good standing, any unredeemed <strong>account credit</strong>{' '}
              (already converted from points) will remain accessible for 90 days after closure to allow you
              to use it. After 90 days, remaining credit is forfeited. Unconverted SpontiPoints are forfeited
              upon account closure.
            </li>
            <li>
              Fraudulent activity, abuse, or manipulation of the SpontiPoints program (including creating
              fake redemptions, using automated tools, or exploiting system errors) may result in the
              forfeiture of all points, reversal of all credit, and permanent account suspension.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Vendor Loyalty Programs</h2>
          <p>
            Individual vendors on SpontiCoupon may offer their own separate loyalty or rewards programs to
            their customers. These vendor programs operate independently of SpontiPoints and are governed
            solely by the vendor&apos;s own terms. SpontiCoupon is not responsible for administering,
            fulfilling, or resolving disputes related to any vendor loyalty program. Points or rewards earned
            in a vendor program cannot be converted to SpontiPoints, and vice versa.
          </p>
          <p className="mt-2">
            If a vendor closes their account or discontinues their loyalty program, SpontiCoupon has no
            obligation to honor that vendor&apos;s outstanding loyalty rewards. Any vendor loyalty program
            disputes should be resolved directly with the vendor.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Program Modifications</h2>
          <p>
            SpontiCoupon reserves the right to modify, suspend, or terminate the SpontiPoints program, in
            whole or in part, at any time. For material changes to earning rates, redemption values, or
            minimum thresholds, we will provide at least 30 days&apos; advance notice by email or in-app
            announcement.
          </p>
          <p className="mt-2">
            In the event of full program termination, members will be given no less than 60 days to redeem
            any outstanding points balance before points are permanently cancelled.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Limitation of Liability</h2>
          <p>
            SpontiPoints have no cash value outside the platform and do not constitute property. SpontiCoupon
            is not responsible for any loss, damage, or inconvenience resulting from program participation,
            including but not limited to technical errors affecting point accrual or redemption, point
            expiration, or program modification. Our total liability to you in connection with the SpontiPoints
            program shall not exceed the dollar value of your current unredeemed point balance at the time
            of the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">10. Governing Law &amp; Disputes</h2>
          <p>
            These Terms are governed by the laws of the State of Florida, United States, without regard to
            conflict of law principles. Nothing in this Section limits any mandatory consumer protection
            rights you have under the laws of your state of residence that cannot be waived by contract.
          </p>
          <p className="mt-2">
            Any disputes arising from the SpontiPoints program are subject to the Dispute Resolution and
            Arbitration provisions of the SpontiCoupon{' '}
            <Link href="/terms" className="text-primary-500 hover:underline">Terms of Service</Link>{' '}
            (Section 17), including binding arbitration, the class action waiver, and the 30-day opt-out right.
            Those provisions are incorporated here by reference.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">11. Privacy</h2>
          <p>
            Your participation in SpontiPoints involves the collection and use of loyalty data (point balances,
            redemption history, credit usage). This data is processed in accordance with our{' '}
            <Link href="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link>.
            We use loyalty data solely to administer the program, prevent fraud, and improve our services.
            We do not sell loyalty data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">12. Contact</h2>
          <p>
            For questions or concerns about the SpontiPoints program, please contact us at{' '}
            <Link href="/contact" className="text-primary-500 hover:underline">our contact page</Link> or
            email <a href="mailto:support@sponticoupon.com" className="text-primary-500 hover:underline">support@sponticoupon.com</a>.
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
          <Link href="/vendor-terms" className="text-gray-400 hover:text-primary-500 transition-colors">Vendor Terms</Link>
        </div>
      </div>
    </div>
  );
}
