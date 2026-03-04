import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export const metadata: Metadata = {
  title: 'Cookie Policy | SpontiCoupon',
  description: 'Learn how SpontiCoupon uses cookies and similar technologies, and how to manage your preferences.',
  alternates: { canonical: `${BASE_URL}/cookies` },
};

export default function CookiesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: March 3, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. What Are Cookies?</h2>
          <p>
            Cookies are small text files placed on your device when you visit a website. They help websites remember
            your preferences, keep you logged in, and understand how you use the site. SpontiCoupon uses cookies and
            similar technologies (e.g., local storage, session storage) to operate and improve our platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Types of Cookies We Use</h2>

          <h3 className="text-lg font-medium text-gray-900 mt-5 mb-2">2.1 Essential Cookies (Always Active)</h3>
          <p>
            These cookies are necessary for the platform to function. Without them, you cannot log in, claim deals,
            or use the vendor dashboard. They cannot be disabled.
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-700">Cookie / Key</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-700">Purpose</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-700">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">sb-*</td>
                  <td className="px-4 py-2">Supabase authentication session tokens</td>
                  <td className="px-4 py-2">Session / 1 week</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">sc_cookie_consent</td>
                  <td className="px-4 py-2">Stores your cookie consent preference</td>
                  <td className="px-4 py-2">1 year (localStorage)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-medium text-gray-900 mt-6 mb-2">2.2 Analytics Cookies (Consent Required)</h3>
          <p>
            With your consent, we use analytics tools to understand how visitors interact with SpontiCoupon — such as
            which pages are most visited, how long users stay, and where they drop off. This helps us improve the
            platform. No personally identifiable information is sold to third parties.
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-700">Provider</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-700">Purpose</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-700">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2">Analytics (first-party)</td>
                  <td className="px-4 py-2">Page views, session data, feature usage</td>
                  <td className="px-4 py-2">Up to 13 months</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-medium text-gray-900 mt-6 mb-2">2.3 Functional Cookies</h3>
          <p>
            These remember your preferences (e.g., selected city, saved deal filters) to provide a more personalized
            experience. They are activated only with your consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. What We Do NOT Do</h2>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>We do <strong>not</strong> sell your cookie data or personal information to third parties.</li>
            <li>We do <strong>not</strong> use third-party advertising networks or behavioral ad targeting cookies.</li>
            <li>We do <strong>not</strong> use cross-site tracking pixels for advertising purposes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Managing Your Cookie Preferences</h2>
          <p>
            When you first visit SpontiCoupon, a cookie consent banner appears at the bottom of the screen.
            You can choose:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Essential Only</strong> — Only cookies required for the platform to work are set.</li>
            <li><strong>Accept All</strong> — Essential and analytics cookies are enabled.</li>
          </ul>
          <p className="mt-3">
            You can also change or withdraw your consent at any time by clearing your browser&apos;s local storage
            for <code>sponticoupon.com</code> (the key <code>sc_cookie_consent</code>). After clearing, the consent
            banner will reappear on your next visit.
          </p>
          <p className="mt-3">
            Most browsers also allow you to block or delete cookies via their settings. Note that blocking essential
            cookies will prevent you from logging in or using authenticated features of the platform. See your
            browser&apos;s help documentation:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2 text-sm">
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">Apple Safari</a></li>
            <li><a href="https://support.microsoft.com/en-us/windows/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">Microsoft Edge</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. California Residents (CalOPPA)</h2>
          <p>
            Under the California Online Privacy Protection Act (CalOPPA), we disclose how we respond to
            &ldquo;Do Not Track&rdquo; signals: SpontiCoupon does <strong>not</strong> currently alter its data
            collection practices in response to browser Do Not Track signals, as there is no uniform industry
            standard for DNT compliance. California residents have additional rights under the{' '}
            <Link href="/privacy#do-not-sell" className="text-primary-500 hover:underline">
              California Privacy Rights (CPRA/CCPA)
            </Link>{' '}
            section of our Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy as we add new features or as laws change. The &ldquo;Last updated&rdquo;
            date at the top of this page reflects when changes were last made. Continued use of the platform after
            an update constitutes acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Contact</h2>
          <p>
            Questions about cookies or your privacy? Email{' '}
            <a href="mailto:privacy@sponticoupon.com" className="text-primary-500 hover:underline">
              privacy@sponticoupon.com
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
        </div>
      </div>
    </div>
  );
}
