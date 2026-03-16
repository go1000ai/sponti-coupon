import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  title: 'Privacy Policy — SpontiCoupon',
  description: 'SpontiCoupon Privacy Policy. Learn how we collect, use, and protect your personal information on our Sponti Deal platform.',
  alternates: { canonical: `${BASE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-gray-400 mb-10">Last updated: March 3, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-900">1. Introduction</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon, operated by Online Commerce Hub, LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at sponticoupon.com and any related services (collectively, the &quot;Service&quot;).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">2. Information We Collect</h2>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">2.1 Information You Provide</h3>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li><strong>Account Information:</strong> Name, email address, and password when you create an account.</li>
            <li><strong>Vendor Information:</strong> Business name, business address, phone number, category, and Stripe account details for payment processing.</li>
            <li><strong>Transaction Data:</strong> Deal claims, redemption codes, deposit payments, and redemption history.</li>
            <li><strong>Loyalty Program Data:</strong> SpontiPoints balance, point earning history (tied to deal redemptions), account credit balance, and redemption activity. This data is used solely to administer the SpontiPoints program and prevent fraud.</li>
            <li><strong>Communication Data:</strong> Messages or feedback you send to us through contact forms or email.</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">2.2 Automatically Collected Information</h3>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers.</li>
            <li><strong>Usage Data:</strong> Pages visited, deals viewed, time spent on pages, and click patterns.</li>
            <li><strong>Location Data:</strong> Approximate location based on IP address to show relevant local deals. Precise location is only collected with your explicit consent.</li>
            <li><strong>Cookies:</strong> We use essential cookies for authentication and session management. See Section 7 for details.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">3. How We Use Your Information</h2>
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
          <h2 className="text-2xl font-bold text-gray-900">4. Information Sharing</h2>
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
          <h2 className="text-2xl font-bold text-gray-900">5. Data Security</h2>
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
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong>Data Breach Notification.</strong> In the event of a security incident involving unauthorized access to your personal information, SpontiCoupon will notify affected users without unreasonable delay and in accordance with applicable federal and state law. Notification will be provided by email to your address on file, by in-app notice, or as otherwise required by law. We will disclose the nature of the incident, categories of data affected, steps we are taking, and actions you can take to protect yourself. To report a suspected security vulnerability, email{' '}
            <a href="mailto:security@sponticoupon.com" className="text-primary-500 hover:underline">security@sponticoupon.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">6. Data Retention</h2>
          <p className="text-gray-600 leading-relaxed">
            We retain your personal information for as long as your account is active or as needed to provide you with the Service. Transaction records (deal claims, redemptions) are retained for a minimum of 3 years for accounting and legal purposes. You may request deletion of your account and associated data at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">7. Cookies &amp; Tracking</h2>
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
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong>Do Not Track (DNT):</strong> Our website does not currently respond to browser DNT signals because no industry-wide standard has been established. However, if your browser transmits a <strong>Global Privacy Control (GPC)</strong> signal, we treat it as an opt-out of the sale or sharing of your personal information (though we do not currently sell or share personal information for commercial purposes).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">8. Your Rights</h2>
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

        <section id="do-not-sell">
          <h2 className="text-2xl font-bold text-gray-900">9. California Privacy Rights (CPRA / CCPA)</h2>
          <p className="text-gray-600 leading-relaxed">
            This section applies to California residents under the California Privacy Rights Act (CPRA) and the California Consumer Privacy Act (CCPA), as amended. Residents of Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Texas (TDPSA), Montana (MCDPA), Oregon (OCPA), and New Hampshire (SB 255) have equivalent or similar rights under their respective state privacy laws, and may exercise them using the same process described in Section 9.7. We apply these rights uniformly to all U.S. residents regardless of state.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-5">9.1 Right to Know</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            You have the right to request that we disclose: (a) the categories and specific pieces of personal information we have collected about you; (b) the categories of sources from which we collected it; (c) our business or commercial purpose for collecting it; and (d) the categories of third parties with whom we share it.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-5">9.2 Right to Delete</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            You have the right to request deletion of personal information we have collected from you, subject to certain exceptions — for example, we may retain information needed to complete a transaction you requested, detect security incidents, or comply with a legal obligation.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-5">9.3 Right to Correct</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            You have the right to request that we correct inaccurate personal information we maintain about you, taking into account the nature of the information and the purposes for processing it.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-5">9.4 Right to Opt-Out of Sale or Sharing</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            <strong>We do not sell your personal information to third parties, and we do not share your personal information for cross-context behavioral advertising.</strong> If this practice ever changes, we will provide advance notice and a clear mechanism to opt-out before any such sharing begins. To submit a &ldquo;Do Not Sell or Share My Personal Information&rdquo; request, email us at <a href="mailto:privacy@sponticoupon.com" className="text-primary-500 hover:underline">privacy@sponticoupon.com</a>.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-5">9.5 Right to Limit Use of Sensitive Personal Information</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            To the extent we collect sensitive personal information (such as precise geolocation, if you grant permission), you have the right to direct us to limit its use and disclosure to what is strictly necessary to perform the services you requested.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-5">9.6 Right to Non-Discrimination</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            We will not discriminate against you for exercising any of your CPRA rights. We will not deny you our services, charge you a different price, or provide a different level of quality based solely on your exercise of privacy rights.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-5">9.7 How to Submit a Request</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            To exercise any of the rights above, you may: (a) email us at <a href="mailto:privacy@sponticoupon.com" className="text-primary-500 hover:underline">privacy@sponticoupon.com</a> with &ldquo;California Privacy Request&rdquo; in the subject line; or (b) use the contact form at <a href="/contact" className="text-primary-500 hover:underline">sponticoupon.com/contact</a>. We will verify your identity before processing your request. We will respond within 45 days; if we need additional time (up to 45 more days), we will notify you in writing. Requests may be submitted by you or by an authorized agent holding written permission.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-5">9.7.1 Appeals Process</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            If we deny your privacy request in whole or in part, you may appeal our decision within 30 days of receiving our response. To appeal, email <a href="mailto:privacy@sponticoupon.com" className="text-primary-500 hover:underline">privacy@sponticoupon.com</a> with &ldquo;Privacy Appeal&rdquo; in the subject line and explain the basis for your appeal. We will respond to your appeal within 60 days. This appeals process applies to residents of California, Virginia, Colorado, Connecticut, Texas, Montana, Oregon, and New Hampshire as required by their respective state privacy laws.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-5">9.8 Data Retention — California</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            We retain account information for the duration of your account, plus up to 3 years after account closure for legal and accounting purposes. Transaction records (deal claims, redemptions, payment history) are retained for 7 years. Usage analytics are retained for 2 years. You may request earlier deletion subject to the exceptions in Section 9.2.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-5">9.9 CalOPPA Disclosure</h3>
          <p className="text-gray-600 leading-relaxed mt-1">
            Pursuant to the California Online Privacy Protection Act (CalOPPA), we post this Privacy Policy conspicuously and update it when our information practices change. The &ldquo;Last updated&rdquo; date at the top of this page reflects when it was most recently revised. This policy link appears at all pages where we collect personal information. Third parties that may collect personally identifiable information from our users through cookies or other tracking technologies include our hosting provider (Vercel) and authentication provider (Supabase). You can disable cookies in your browser settings; however, disabling essential cookies will prevent you from logging in to the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">10. Children&apos;s Privacy</h2>
          <p className="text-gray-600 leading-relaxed">
            The Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected information from a child under 13, we will take steps to delete that information promptly. If you believe a child under 13 has provided us with personal data, please contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">11. Third-Party Links</h2>
          <p className="text-gray-600 leading-relaxed">
            The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read the privacy policies of any third-party sites you visit.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">12. Changes to This Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes are posted constitutes acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">13. SMS/Text Messaging</h2>
          <p className="text-gray-600 leading-relaxed">
            Online Commerce Hub, LLC DBA SpontiCoupon offers an SMS/text messaging program to provide promotional messages, deal alerts, account notifications, and customer support communications.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mt-4">13.1 SMS Opt-In & Consent</h3>
          <p className="text-gray-600 leading-relaxed">
            By providing your mobile phone number and checking the SMS consent checkbox on our website (via our chat widget, contact form, or signup flow), you expressly consent to receive recurring automated promotional and informational text messages from Online Commerce Hub, LLC DBA SpontiCoupon. Consent is not a condition of any purchase. You may opt in by interacting with our website chat widget or submitting a form that includes SMS consent.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mt-4">13.2 Message Frequency & Rates</h3>
          <p className="text-gray-600 leading-relaxed">
            Message frequency varies based on your interactions and account activity. Standard message and data rates may apply as determined by your mobile carrier. SpontiCoupon does not charge any additional fees for SMS messages.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mt-4">13.3 Opt-Out Instructions</h3>
          <p className="text-gray-600 leading-relaxed">
            You may opt out of receiving text messages at any time by replying <strong>STOP</strong> to any message you receive from us. After opting out, you will receive one final confirmation message. You may also contact us at support@sponticoupon.com to be removed from our SMS list. Reply <strong>HELP</strong> for assistance.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mt-4">13.4 No Sharing of SMS Data</h3>
          <p className="text-gray-600 leading-relaxed">
            <strong>We do not sell, rent, share, or disclose your phone number or SMS opt-in consent data with any third parties or affiliates for their own marketing purposes.</strong> Your SMS consent information is used solely by Online Commerce Hub, LLC DBA SpontiCoupon to send you the messages you have consented to receive. This includes sharing with third-party service providers that assist us in delivering text messages — these providers are contractually prohibited from using your data for any purpose other than message delivery on our behalf.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mt-4">13.5 Types of Messages</h3>
          <p className="text-gray-600 leading-relaxed">
            Messages may include: promotional offers and deals, new deal alerts, account notifications, appointment and redemption reminders, customer support responses, and other informational messages related to SpontiCoupon services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">14. Contact Us</h2>
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
