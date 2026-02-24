import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SpontiPoints Loyalty Program Terms | SpontiCoupon',
  description: 'Terms and conditions for the SpontiPoints loyalty rewards program.',
};

export default function LoyaltyTermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-secondary-500 mb-2">SpontiPoints Loyalty Program Terms &amp; Conditions</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: February 24, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600">
        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">1. Program Overview</h2>
          <p>
            SpontiPoints is the official customer loyalty rewards program operated by Online Commerce Hub, LLC
            DBA SpontiCoupon (&ldquo;SpontiCoupon,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
            By participating in the SpontiPoints program, you agree to these terms and conditions.
          </p>
          <p>
            SpontiPoints is a platform-wide loyalty program separate from any vendor-specific loyalty programs
            offered by individual businesses on SpontiCoupon. Points earned through SpontiPoints cannot be
            combined with or transferred to vendor loyalty programs, and vice versa.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">2. Eligibility</h2>
          <p>
            All registered SpontiCoupon customers with an active account in good standing are automatically
            enrolled in the SpontiPoints program at no additional cost. You must be at least 18 years of
            age or the age of majority in your jurisdiction to participate.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">3. Earning SpontiPoints</h2>
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
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">4. Redeeming SpontiPoints</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Conversion Rate:</strong> 100 SpontiPoints = $1.00 USD in account credit.
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
              and cannot be exchanged for cash, gift cards, or any other form of payment.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">5. Point Expiration</h2>
          <p>
            SpontiPoints expire 12 months after the date they are earned. Expired points are automatically
            removed from your balance and cannot be restored. We recommend redeeming your points regularly
            to maximize their value.
          </p>
          <p>
            You can view the expiration dates of your points in the SpontiPoints section of your account
            dashboard. We may send courtesy reminders before points expire, but it is your responsibility
            to track and use your points before their expiration date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">6. Account &amp; Points Balance</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              SpontiPoints are linked to your SpontiCoupon account and cannot be transferred between accounts.
            </li>
            <li>
              If your account is suspended, terminated, or closed for any reason, all accumulated
              SpontiPoints and unredeemed credit will be forfeited.
            </li>
            <li>
              Fraudulent activity, abuse, or manipulation of the SpontiPoints program may result in the
              forfeiture of all points and account suspension.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">7. Program Modifications</h2>
          <p>
            SpontiCoupon reserves the right to modify, suspend, or terminate the SpontiPoints program, in
            whole or in part, at any time with reasonable notice. This includes changes to earning rates,
            redemption values, minimum thresholds, and expiration periods.
          </p>
          <p>
            In the event of program termination, members will be given a reasonable period (no less than
            30 days) to redeem any outstanding points balance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">8. Limitation of Liability</h2>
          <p>
            SpontiPoints have no cash value and do not constitute property. SpontiCoupon is not responsible
            for any loss, damage, or inconvenience resulting from program participation, including but not
            limited to technical errors affecting point accrual or redemption.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">9. Contact</h2>
          <p>
            For questions or concerns about the SpontiPoints program, please contact us
            at <Link href="/contact" className="text-primary-500 hover:underline">our contact page</Link> or
            email us at support@sponticoupon.com.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-secondary-500 mt-8 mb-3">10. Governing Law</h2>
          <p>
            These terms are governed by and construed in accordance with the laws of the State of Florida,
            United States. Any disputes arising from the SpontiPoints program shall be resolved in the
            courts of the State of Florida.
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
