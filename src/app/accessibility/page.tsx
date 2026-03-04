import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  title: 'Accessibility Statement | SpontiCoupon',
  description: 'SpontiCoupon accessibility commitment and WCAG 2.1 AA compliance statement.',
  alternates: { canonical: `${BASE_URL}/accessibility` },
};

export default function AccessibilityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Accessibility Statement</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: March 3, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Our Commitment</h2>
          <p>
            Online Commerce Hub, LLC DBA SpontiCoupon is committed to making our platform accessible
            to people with disabilities. We aim to conform to the{' '}
            <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong> and comply
            with the Americans with Disabilities Act (ADA) Title III.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Measures We Take</h2>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Semantic HTML5 structure with proper heading hierarchy.</li>
            <li>All interactive elements (buttons, links, forms) are keyboard navigable.</li>
            <li>Color contrast ratios meet or exceed WCAG 2.1 AA minimums (4.5:1 for normal text, 3:1 for large text).</li>
            <li>Form inputs have associated <code>&lt;label&gt;</code> elements and descriptive error messages.</li>
            <li>Images include descriptive <code>alt</code> text. Decorative images use empty <code>alt=""</code>.</li>
            <li>Focus indicators are visible for keyboard users.</li>
            <li>ARIA roles and labels used where native HTML semantics are insufficient.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Known Limitations</h2>
          <p>
            While we work toward full WCAG 2.1 AA conformance, some areas are still being improved.
            We are actively working to address any remaining gaps.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Feedback &amp; Contact</h2>
          <p>
            We welcome feedback on the accessibility of SpontiCoupon. If you encounter a barrier,
            please let us know:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              Email:{' '}
              <a href="mailto:support@sponticoupon.com" className="text-primary-500 hover:underline">
                support@sponticoupon.com
              </a>{' '}
              — subject line &ldquo;Accessibility Feedback&rdquo;
            </li>
            <li>
              <Link href="/contact" className="text-primary-500 hover:underline">Contact page</Link>
            </li>
          </ul>
          <p className="mt-3">
            We aim to respond to accessibility feedback within 5 business days and to resolve
            identified issues as quickly as practicable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Technical Specifications</h2>
          <p>
            SpontiCoupon relies on the following technologies for conformance:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>HTML5</li>
            <li>CSS (Tailwind CSS)</li>
            <li>JavaScript / React (Next.js 14)</li>
            <li>WAI-ARIA 1.2</li>
          </ul>
          <p className="mt-2">
            This statement was prepared on March 3, 2026 based on a self-assessment.
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
        </div>
      </div>
    </div>
  );
}
