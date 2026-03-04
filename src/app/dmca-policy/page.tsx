import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  title: 'DMCA / Copyright Policy | SpontiCoupon',
  description: 'SpontiCoupon DMCA policy and procedures for reporting copyright infringement on the platform.',
  alternates: { canonical: `${BASE_URL}/dmca-policy` },
};

export default function DmcaPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">DMCA / Copyright Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: March 3, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Overview</h2>
          <p>
            Online Commerce Hub, LLC DBA SpontiCoupon (&ldquo;SpontiCoupon&rdquo;) respects intellectual property
            rights and complies with the Digital Millennium Copyright Act of 1998 (&ldquo;DMCA&rdquo;),
            17 U.S.C. § 512. SpontiCoupon is a technology platform that enables local vendors to post
            deal listings. Vendors are solely responsible for the content they upload, including images,
            descriptions, and logos.
          </p>
          <p className="mt-2">
            SpontiCoupon qualifies as a &ldquo;service provider&rdquo; under 17 U.S.C. § 512(c) and maintains
            safe harbor protection by promptly removing infringing content upon proper notice and by
            maintaining a designated agent registered with the U.S. Copyright Office.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Designated DMCA Agent</h2>
          <p>
            To submit a copyright infringement notice, contact our designated Copyright Agent:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3 text-sm space-y-1">
            <p><strong>Agent:</strong> Legal Department, Online Commerce Hub, LLC</p>
            <p><strong>Company:</strong> Online Commerce Hub, LLC DBA SpontiCoupon</p>
            <p><strong>Address:</strong> Orlando, FL 32801, United States</p>
            <p><strong>Email:</strong>{' '}
              <a href="mailto:legal@sponticoupon.com" className="text-primary-500 hover:underline">
                legal@sponticoupon.com
              </a>
            </p>
            <p className="text-gray-400 text-xs mt-2">
              This address is for DMCA notices only. Other inquiries:{' '}
              <a href="mailto:support@sponticoupon.com" className="text-primary-500 hover:underline">
                support@sponticoupon.com
              </a>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. Filing a Takedown Notice</h2>
          <p>
            If you believe content on SpontiCoupon infringes your copyright, send a written notice to our
            designated agent that includes all of the following under 17 U.S.C. § 512(c)(3):
          </p>
          <ol className="list-decimal pl-5 space-y-2 mt-3">
            <li>
              A physical or electronic signature of the copyright owner or an authorized representative.
            </li>
            <li>
              Identification of the copyrighted work(s) claimed to have been infringed. For multiple works,
              a representative list is acceptable.
            </li>
            <li>
              Identification of the allegedly infringing material and its location on SpontiCoupon
              (e.g., the URL of the deal listing).
            </li>
            <li>
              Your name, address, telephone number, and email address.
            </li>
            <li>
              A statement that you have a good-faith belief that the use is not authorized by the copyright
              owner, its agent, or the law.
            </li>
            <li>
              A statement under penalty of perjury that the information in the notice is accurate and that
              you are authorized to act on behalf of the copyright owner.
            </li>
          </ol>
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <strong>Warning:</strong> Under 17 U.S.C. § 512(f), knowingly misrepresenting that material
            is infringing may expose you to liability for damages, including attorneys&apos; fees.
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Counter-Notice</h2>
          <p>
            If you believe your content was removed in error, you may file a counter-notice under
            17 U.S.C. § 512(g)(3) with our designated agent. Your counter-notice must include:
          </p>
          <ol className="list-decimal pl-5 space-y-2 mt-3">
            <li>Your physical or electronic signature.</li>
            <li>
              Identification of the removed material and its location before removal.
            </li>
            <li>
              A statement under penalty of perjury that you have a good-faith belief the material was
              removed due to mistake or misidentification.
            </li>
            <li>
              Your name, address, and phone number, and consent to the jurisdiction of the federal
              district court for your address (or Orlando, FL if outside the United States), and
              agreement to accept service of process from the original complainant.
            </li>
          </ol>
          <p className="mt-3">
            Upon receiving a valid counter-notice, SpontiCoupon will forward it to the original
            complainant. If the complainant does not file a court action within 10–14 business days,
            the removed content may be restored.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Repeat Infringer Policy</h2>
          <p>
            SpontiCoupon will terminate the accounts of vendors who are repeat copyright infringers,
            consistent with 17 U.S.C. § 512(i). A vendor who receives multiple valid DMCA notices
            may have their account permanently suspended at SpontiCoupon&apos;s sole discretion.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Trademarks</h2>
          <p>
            This policy covers copyright infringement only. Trademark concerns should be directed to{' '}
            <a href="mailto:legal@sponticoupon.com" className="text-primary-500 hover:underline">
              legal@sponticoupon.com
            </a>.
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
