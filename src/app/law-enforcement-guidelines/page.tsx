import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  title: 'Law Enforcement Guidelines — SpontiCoupon',
  description: 'SpontiCoupon guidelines for law enforcement and government data requests. Learn about our process for handling legal requests for user data.',
  alternates: { canonical: `${BASE_URL}/law-enforcement-guidelines` },
};

export default function LawEnforcementGuidelinesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <h1 className="text-4xl font-bold text-gray-900 mb-2">Law Enforcement Guidelines</h1>
      <p className="text-gray-400 mb-10">Last updated: April 3, 2026</p>

      <div className="prose prose-gray max-w-none space-y-8">

        <section>
          <h2 className="text-2xl font-bold text-gray-900">1. Introduction</h2>
          <p className="text-gray-600 leading-relaxed">
            Online Commerce Hub, LLC DBA SpontiCoupon (&quot;SpontiCoupon,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting the privacy of our users while cooperating with valid legal processes. These guidelines describe the policies and procedures SpontiCoupon follows when responding to requests for user data from law enforcement agencies, government authorities, and other public authorities.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            These guidelines are intended for use by law enforcement officials and government agencies. They do not create any rights for third parties, including users or other non-governmental entities.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">2. Types of Data We May Hold</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon is a deal marketplace that connects local businesses (vendors) with customers. Depending on the user and their activity on the platform, we may hold the following categories of data:
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">2.1 Basic Account Information</h3>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li>Name (first and last)</li>
            <li>Email address</li>
            <li>Account creation date</li>
            <li>Account role (vendor, customer, or admin)</li>
            <li>Last sign-in date and time</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">2.2 Vendor-Specific Information</h3>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li>Business name and business address</li>
            <li>Phone number</li>
            <li>Business category</li>
            <li>Deal listing history</li>
            <li>Subscription tier and status</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">2.3 Customer-Specific Information</h3>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li>Deal claim and redemption history</li>
            <li>Approximate location data (city-level, based on IP address)</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">2.4 Transaction Records</h3>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li>Deal claims and redemption codes</li>
            <li>Timestamps of claims and redemptions</li>
            <li>Subscription payment records (processed by Stripe)</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">2.5 Technical Data</h3>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li>IP addresses associated with account access</li>
            <li>Browser and device information (user agent strings)</li>
            <li>Server logs (retained for a limited period)</li>
          </ul>

          <p className="text-gray-600 leading-relaxed mt-4">
            <strong>Important:</strong> SpontiCoupon does not process or store credit card numbers, bank account numbers, or other direct payment instrument data. All payment processing is handled by Stripe, Inc. Requests for payment card data should be directed to Stripe.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">3. Legal Process Requirements</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon requires valid legal process before disclosing user data to any law enforcement or government agency. The type of legal process required depends on the nature of the data requested:
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">3.1 Subpoena (Civil or Grand Jury)</h3>
          <p className="text-gray-600 leading-relaxed mt-2">
            A valid subpoena issued in connection with an official investigation may compel the disclosure of basic account information (Section 2.1 above).
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">3.2 Court Order (18 U.S.C. § 2703(d) or equivalent)</h3>
          <p className="text-gray-600 leading-relaxed mt-2">
            A court order meeting the requirements of 18 U.S.C. § 2703(d) — or an equivalent order issued under state law — may compel disclosure of basic account information plus transaction records, technical data, and other non-content records.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">3.3 Search Warrant</h3>
          <p className="text-gray-600 leading-relaxed mt-2">
            A search warrant issued under the procedures described in the Federal Rules of Criminal Procedure (or equivalent state warrant procedures), based on a showing of probable cause, is required for content data or comprehensive account data.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">3.4 Emergency Requests</h3>
          <p className="text-gray-600 leading-relaxed mt-2">
            In cases involving imminent danger of death or serious physical injury, SpontiCoupon may voluntarily disclose user data to law enforcement without a court order, consistent with 18 U.S.C. § 2702(b)(8) and (c)(4). Emergency requests must be submitted via the contact information in Section 8 and should include: the nature of the emergency, the identity of the person(s) at risk, the specific data requested, and why the data is necessary to address the emergency.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">4. Review of Legality</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon reviews every government and law enforcement data request for legal validity before producing any user data. Our review process includes:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li><strong>Facial validity check:</strong> We verify that the request is properly issued by an authorized agency, bears proper signatures, and identifies the specific data sought.</li>
            <li><strong>Jurisdictional review:</strong> We confirm that the requesting authority has jurisdiction over the matter and that the legal process is appropriate for the type of data requested.</li>
            <li><strong>Scope review:</strong> We assess whether the request is appropriately scoped and not overly broad.</li>
            <li><strong>Legal counsel consultation:</strong> Requests that raise novel legal questions, seek unusually broad data, or involve sensitive circumstances are referred to legal counsel for review before any disclosure.</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-3">
            We will not produce data in response to requests that do not meet applicable legal standards.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">5. Challenging Unlawful Requests</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon is committed to protecting user privacy and will challenge requests that we believe are legally deficient or overly broad. Our provisions include:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li><strong>Objection to overbroad requests:</strong> If a request seeks data that is not relevant to the stated investigation or is broader than legally permitted, we will object and seek to narrow the scope of the request.</li>
            <li><strong>Motion to quash:</strong> Where appropriate, SpontiCoupon may file a motion to quash or modify a subpoena or court order that we believe is legally invalid, overly burdensome, or seeks data beyond what the law permits.</li>
            <li><strong>Notification to affected users:</strong> Unless legally prohibited (e.g., by a court-issued non-disclosure order or gag order), we will notify affected users of the request so they may exercise their own legal rights to object.</li>
            <li><strong>Delayed compliance:</strong> When we object to a request or seek to have it narrowed, we will not produce data until the legal dispute is resolved, unless compelled by court order.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">6. Data Minimization</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon follows strict data minimization principles when responding to legal requests:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li><strong>Narrow production:</strong> We disclose only the specific data responsive to the valid legal request. We do not provide bulk data, unrelated account information, or data beyond what the request specifically identifies.</li>
            <li><strong>No voluntary over-disclosure:</strong> We do not voluntarily provide more data than is legally required, even if we possess additional data that might be of interest to the requesting agency.</li>
            <li><strong>Time-bound responses:</strong> Where a request covers a specific time period, we limit our production to records within that timeframe only.</li>
            <li><strong>Redaction:</strong> When possible and appropriate, we will redact information about uninvolved third parties from responsive records.</li>
            <li><strong>Platform-level minimization:</strong> As a general business practice, SpontiCoupon collects only the data necessary to operate the platform. We do not retain data indefinitely — see our <Link href="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link> (Section 6) for our data retention schedule.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">7. Documentation &amp; Transparency</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon maintains records of all government and law enforcement data requests. Our documentation practices include:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li><strong>Request log:</strong> We maintain a log of all requests received, including the requesting agency, date received, type of legal process, data requested, our response, and date of response.</li>
            <li><strong>Outcome tracking:</strong> We document whether each request was complied with in full, in part (narrowed), objected to, or withdrawn.</li>
            <li><strong>Annual review:</strong> We conduct an annual review of all requests received to identify trends, assess our processes, and improve our policies.</li>
            <li><strong>Transparency reporting:</strong> SpontiCoupon reserves the right to publish an annual transparency report summarizing the number and types of government data requests received and our responses, to the extent permitted by law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">8. How to Submit a Request</h2>
          <p className="text-gray-600 leading-relaxed">
            Law enforcement and government agencies should submit requests to:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mt-3">
            <p className="text-gray-700 font-medium">Online Commerce Hub, LLC — SpontiCoupon</p>
            <p className="text-gray-700 font-medium">Attn: Legal / Law Enforcement Requests</p>
            <p className="text-gray-500 text-sm mt-2">Email: <a href="mailto:legal@sponticoupon.com" className="text-primary-500 hover:underline">legal@sponticoupon.com</a></p>
            <p className="text-gray-500 text-sm">Website: <a href="https://sponticoupon.com" className="text-primary-500 hover:underline">sponticoupon.com</a></p>
          </div>
          <p className="text-gray-600 leading-relaxed mt-4">
            All requests must include:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
            <li>The name and badge/ID number of the requesting official</li>
            <li>The agency name and a direct contact phone number</li>
            <li>A valid email address from an official government domain</li>
            <li>The legal authority for the request (subpoena, court order, warrant, etc.)</li>
            <li>The specific account(s) or data being requested, identified as precisely as possible (email address, account ID, date range, etc.)</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-3">
            We will acknowledge receipt of the request within 5 business days. Response times depend on the complexity and volume of data requested.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">9. Preservation Requests</h2>
          <p className="text-gray-600 leading-relaxed">
            Law enforcement may request that SpontiCoupon preserve records relating to a specific account pending the issuance of formal legal process, pursuant to 18 U.S.C. § 2703(f). Preservation requests must identify the specific account(s) and the specific data to be preserved. We will preserve the specified records for 90 days, renewable upon request for an additional 90-day period. Preservation does not constitute disclosure — formal legal process is still required to obtain the data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">10. International Requests</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon is a U.S.-based company. International law enforcement agencies must submit requests through a Mutual Legal Assistance Treaty (MLAT) or letters rogatory, unless an applicable international agreement (such as the CLOUD Act) provides an alternative mechanism. We will cooperate with properly authorized international requests to the extent permitted by U.S. law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">11. User Notification</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon will notify affected users of law enforcement requests for their data unless we are legally prohibited from doing so by a valid court order or other applicable law. If notification is initially prohibited, we will notify the user when the prohibition expires.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            If you are a user and believe your data has been requested by law enforcement, you have the right to seek legal counsel and challenge the request independently.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">12. Updates to These Guidelines</h2>
          <p className="text-gray-600 leading-relaxed">
            SpontiCoupon may update these guidelines from time to time. The &quot;Last updated&quot; date at the top of this page reflects when these guidelines were most recently revised.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">13. Related Policies</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li><Link href="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link></li>
            <li><Link href="/terms" className="text-primary-500 hover:underline">Terms of Service</Link></li>
            <li><Link href="/dmca-policy" className="text-primary-500 hover:underline">DMCA / Copyright Policy</Link></li>
          </ul>
        </section>

      </div>
    </div>
  );
}
