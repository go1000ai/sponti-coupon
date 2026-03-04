import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  title: 'Deal Dispute Policy | SpontiCoupon',
  description: 'What to do if a vendor does not honor a deal you claimed on SpontiCoupon.',
  alternates: { canonical: `${BASE_URL}/dispute-policy` },
};

export default function DisputePolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Deal Dispute Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: March 3, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. SpontiCoupon&apos;s Role</h2>
          <p>
            SpontiCoupon is a technology platform that connects customers with local businesses
            (&ldquo;vendors&rdquo;). SpontiCoupon does not sell goods or services, does not collect or
            hold customer payments, and is not a party to any transaction between a customer and a vendor.
          </p>
          <p className="mt-2">
            When you claim a deal, any deposit or payment you make goes directly to the vendor through
            their chosen payment processor (Stripe, PayPal, Venmo, Zelle, Cash App, etc.).
            SpontiCoupon never touches that money.
          </p>
          <p className="mt-2">
            What SpontiCoupon <strong>can</strong> do: investigate complaints, enforce our{' '}
            <Link href="/vendor-terms" className="text-primary-500 hover:underline">Vendor Terms</Link>,
            suspend or remove vendors who do not honor deals, and issue courtesy SpontiPoints when
            the platform determines a vendor was at fault.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. If a Vendor Doesn&apos;t Honor Your Deal</h2>

          <h3 className="text-lg font-medium text-gray-900 mt-5 mb-2">Step 1 — Contact the Vendor (first)</h3>
          <p>
            Most issues are resolved quickly by contacting the business directly. You can find the
            vendor&apos;s phone number and address on the deal listing page. Many issues are simple
            scheduling or staffing misunderstandings.
          </p>

          <h3 className="text-lg font-medium text-gray-900 mt-5 mb-2">Step 2 — Report to SpontiCoupon</h3>
          <p>
            If the vendor refuses to honor a valid, unexpired deal, report it to us within <strong>48 hours</strong>{' '}
            of the incident:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              Email{' '}
              <a href="mailto:support@sponticoupon.com" className="text-primary-500 hover:underline">
                support@sponticoupon.com
              </a>{' '}
              with your name, order details, deal URL, and a description of what happened.
            </li>
            <li>Or use our <Link href="/contact" className="text-primary-500 hover:underline">Contact page</Link>.</li>
          </ul>
          <p className="mt-2">
            We aim to respond within 2 business days. We may contact the vendor for their side of the
            story before making a determination.
          </p>

          <h3 className="text-lg font-medium text-gray-900 mt-5 mb-2">Step 3 — SpontiCoupon&apos;s Actions</h3>
          <p>
            If SpontiCoupon determines the vendor failed to honor a valid deal, we may:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Issue courtesy <strong>SpontiPoints</strong> to your account as a goodwill gesture.</li>
            <li>Issue a <strong>platform account credit</strong> toward future deals.</li>
            <li>Issue a formal <strong>warning</strong> to the vendor.</li>
            <li><strong>Suspend or permanently remove</strong> the vendor from the platform.</li>
          </ul>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3 text-sm">
            <strong>Note:</strong> SpontiCoupon cannot issue cash refunds or chargebacks for payments
            made directly to a vendor. For payment refunds, follow the process in Section 3 below.
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. Payment Disputes &amp; Refunds</h2>
          <p>
            Because SpontiCoupon does not process or hold customer-to-vendor payments, we cannot
            issue refunds for those transactions. To recover a payment:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              <strong>Credit/debit card (via Stripe Connect):</strong> Contact your card issuer to
              initiate a chargeback. Provide the transaction date, amount, and a description of the
              vendor&apos;s failure to perform.
            </li>
            <li>
              <strong>PayPal:</strong> Open a dispute through PayPal&apos;s Resolution Center within
              180 days of payment.
            </li>
            <li>
              <strong>Venmo / Cash App:</strong> Contact the vendor directly to request a refund.
              Note that peer-to-peer payment apps generally do not offer buyer protection for goods
              and services disputes.
            </li>
            <li>
              <strong>Zelle:</strong> Zelle does not offer a dispute process for authorized payments.
              Contact your bank directly.
            </li>
          </ul>
          <p className="mt-3">
            Filing a report with SpontiCoupon (Step 2 above) helps us identify and remove bad vendors,
            protecting future customers even if your individual payment dispute is handled separately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. What Is Not Covered</h2>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>Expired deals:</strong> Sponti Coupons expire after their countdown timer ends.
              Steady Deals expire on their posted end date. We cannot extend or honor deals after
              expiration.
            </li>
            <li>
              <strong>Changed mind:</strong> If you claimed a deal and simply changed your mind,
              that is not a dispute. Contact the vendor directly — some vendors will accommodate at
              their discretion.
            </li>
            <li>
              <strong>Vendor disputes with SpontiCoupon:</strong> Vendor account actions (suspension,
              termination) are governed by the{' '}
              <Link href="/vendor-terms" className="text-primary-500 hover:underline">Vendor Terms of Service</Link>.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Escalation</h2>
          <p>
            If you are unsatisfied with SpontiCoupon&apos;s resolution, you may pursue the matter
            through binding arbitration per our{' '}
            <Link href="/terms#dispute-resolution" className="text-primary-500 hover:underline">
              Terms of Service Section 17
            </Link>.
            You may also file a complaint with your state attorney general or the Federal Trade
            Commission at{' '}
            <a href="https://reportfraud.ftc.gov" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
              reportfraud.ftc.gov
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Contact</h2>
          <p>
            For deal disputes, email{' '}
            <a href="mailto:support@sponticoupon.com" className="text-primary-500 hover:underline">
              support@sponticoupon.com
            </a>{' '}
            or visit our{' '}
            <Link href="/contact" className="text-primary-500 hover:underline">Contact page</Link>.
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
