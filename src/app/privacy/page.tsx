import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  title: 'Privacy Policy — SpontiCoupon',
  description: 'SpontiCoupon Privacy Policy. Learn how we collect, use, and protect your personal information on our flash deal platform.',
  alternates: { canonical: `${BASE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <h1 className="text-4xl font-bold text-secondary-500 mb-2">Privacy Policy</h1>
      <p className="text-gray-400 mb-10">Last updated: February 22, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-secondary-500">1. Introduction</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon, operated by Online Commerce Hub, LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at sponticoupon.com and any related services (collectively, the &quot;Service&quot;).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-secondary-500">2. Information We Collect</h2>

          <h3 className="text-lg font-semibold text-secondary-500 mt-4">2.1 Information You Provide</h3>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li><strong>Account Information:</strong> Name, email address, and password when you create an account.</li>
            <li><strong>Vendor Information:</strong> Business name, business address, phone number, category, and Stripe account details for payment processing.</li>
            <li><strong>Transaction Data:</strong> Deal claims, redemption codes, deposit payments, and redemption history.</li>
            <li><strong>Communication Data:</strong> Messages or feedback you send to us through contact forms or email.</li>
          </ul>

          <h3 className="text-lg font-semibold text-secondary-500 mt-4">2.2 Automatically Collected Information</h3>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers.</li>
            <li><strong>Usage Data:</strong> Pages visited, deals viewed, time spent on pages, and click patterns.</li>
            <li><strong>Location Data:</strong> Approximate location based on IP address to show relevant local deals. Precise location is only collected with your explicit consent.</li>
            <li><strong>Cookies:</strong> We use essential cookies for authentication and session management. See Section 7 for details.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-secondary-500">3. How We Use Your Information</h2>
          <p className="text-gray-600 leading-relaxed">We use the information we collect to:</p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li>Provide, maintain, and improve the Service</li>
            <li>Process deal claims, generate redemption codes, and facilitate transactions</li>
            <li>Display relevant deals based on your location and preferences</li>
            <li>Send transactional emails (deal confirmations, redemption receipts, expiration reminders)</li>
            <li>Detect and prevent fraud, abuse, and unauthorized access</li>
            <li>Analyze usage patterns to improve the user experience</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-3">
            We do <strong>not</strong> sell your personal information to third parties. We do <strong>not</strong> use your data for targeted advertising from third-party ad networks.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-secondary-500">4. Information Sharing</h2>
          <p className="text-gray-600 leading-relaxed">We may share your information only in the following circumstances:</p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li><strong>With Vendors:</strong> When you claim a deal, the Vendor receives your name and email to verify your redemption. Vendors do not receive your payment details.</li>
            <li><strong>Payment Processors:</strong> We use Stripe for payment processing. Stripe handles your payment data under their own privacy policy. We do not store credit card numbers on our servers.</li>
            <li><strong>Service Providers:</strong> We use Supabase for database hosting and Vercel for application hosting. These providers process data on our behalf under strict data processing agreements.</li>
            <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or government request, or to protect the rights, property, or safety of our users or the public.</li>
            <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, user data may be transferred as part of the transaction.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-secondary-500">5. Data Security</h2>
          <p className="text-gray-600 leading-relaxed">
            We implement industry-standard security measures to protect your personal information, including:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li>Encryption of data in transit (TLS/SSL) and at rest</li>
            <li>Secure authentication using Supabase Auth with row-level security</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Unique, single-use QR codes and 6-digit redemption codes for deal verification</li>
            <li>Limited employee access to personal data on a need-to-know basis</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-3">
            While we strive to protect your data, no method of electronic storage or internet transmission is 100% secure. We cannot guarantee absolute security of your information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-secondary-500">6. Data Retention</h2>
          <p className="text-gray-600 leading-relaxed">
            We retain your personal information for as long as your account is active or as needed to provide you with the Service. Transaction records (deal claims, redemptions) are retained for a minimum of 3 years for accounting and legal purposes. You may request deletion of your account and associated data at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-secondary-500">7. Cookies &amp; Tracking</h2>
          <p className="text-gray-600 leading-relaxed">
            We use the following types of cookies:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li><strong>Essential Cookies:</strong> Required for authentication, session management, and security. These cannot be disabled.</li>
            <li><strong>Preference Cookies:</strong> Store your deal preferences (categories, location) to personalize your experience.</li>
            <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the platform. We use privacy-focused analytics that do not track individual users across websites.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-3">
            We do not use third-party advertising cookies. You can manage cookie preferences through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-secondary-500">8. Your Rights</h2>
          <p className="text-gray-600 leading-relaxed">
            Depending on your jurisdiction, you may have the following rights:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements.</li>
            <li><strong>Portability:</strong> Request your data in a structured, machine-readable format.</li>
            <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails at any time using the link in each email.</li>
            <li><strong>Withdraw Consent:</strong> Where processing is based on consent, you may withdraw it at any time.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-3">
            To exercise any of these rights, contact us at privacy@sponticoupon.com. We will respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-secondary-500">9. California Privacy Rights (CCPA)</h2>
          <p className="text-gray-600 leading-relaxed">
            If you are a California resident, you have the right to: (a) know what personal information is being collected about you; (b) know whether your personal information is sold or disclosed and to whom; (c) say no to the sale of personal information; (d) access your personal information; and (e) equal service and price, even if you exercise your privacy rights. We do not sell personal information as defined by the CCPA.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-secondary-500">10. Children&apos;s Privacy</h2>
          <p className="text-gray-600 leading-relaxed">
            The Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected information from a child under 13, we will take steps to delete that information promptly. If you believe a child under 13 has provided us with personal data, please contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-secondary-500">11. Third-Party Links</h2>
          <p className="text-gray-600 leading-relaxed">
            The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read the privacy policies of any third-party sites you visit.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-secondary-500">12. Changes to This Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes are posted constitutes acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-secondary-500">13. Contact Us</h2>
          <p className="text-gray-600 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mt-3">
            <p className="text-gray-700 font-medium">Online Commerce Hub, LLC — SpontiCoupon</p>
            <p className="text-gray-500 text-sm mt-1">Email: privacy@sponticoupon.com</p>
            <p className="text-gray-500 text-sm">Website: sponticoupon.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}
