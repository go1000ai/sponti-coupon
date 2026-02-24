import Link from 'next/link';
import { Mail, MessageSquare, HelpCircle, Store } from 'lucide-react';

export const metadata = {
  title: 'Contact Us | SpontiCoupon',
  description: 'Get in touch with the SpontiCoupon team. We\'re here to help customers and businesses alike.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary-500 via-secondary-600 to-accent-700 text-white py-20 px-4">
        <div className="absolute inset-0 dot-pattern opacity-10" />
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-orange-400 mb-6 shadow-lg shadow-primary-500/30">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Contact Us</h1>
          <p className="text-gray-300">We&apos;re here to help. Reach out and we&apos;ll get back to you as soon as possible.</p>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center tilt-card">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-orange-100 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Mail className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="font-bold text-secondary-500 mb-2">Email Us</h3>
              <p className="text-sm text-gray-500 mb-3">For general inquiries and support</p>
              <a href="mailto:support@sponticoupon.com" className="text-primary-500 font-medium hover:text-primary-600 transition-colors">
                support@sponticoupon.com
              </a>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center tilt-card">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-100 to-blue-100 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Store className="w-7 h-7 text-accent-600" />
              </div>
              <h3 className="font-bold text-secondary-500 mb-2">Business Inquiries</h3>
              <p className="text-sm text-gray-500 mb-3">For vendor partnerships and accounts</p>
              <a href="mailto:business@sponticoupon.com" className="text-primary-500 font-medium hover:text-primary-600 transition-colors">
                business@sponticoupon.com
              </a>
            </div>
          </div>

          {/* FAQ Link */}
          <div className="text-center bg-gradient-to-br from-gray-50 to-accent-50/30 rounded-2xl p-10 border border-gray-100">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-accent-100 to-blue-100 mb-4">
              <HelpCircle className="w-6 h-6 text-accent-600" />
            </div>
            <h3 className="font-bold text-secondary-500 mb-2">Looking for quick answers?</h3>
            <p className="text-sm text-gray-500 mb-4">Check our FAQ for answers to the most common questions.</p>
            <Link href="/faq" className="bg-gradient-to-r from-primary-500 to-orange-500 text-white px-6 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 shadow-lg shadow-primary-200 hover:shadow-xl transition-all hover:scale-[1.02]">
              Visit FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
