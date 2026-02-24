'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle, Users, Store, Shield, CreditCard } from 'lucide-react';

const FAQ_SECTIONS = [
  {
    title: 'For Customers',
    icon: <Users className="w-5 h-5 text-primary-500" />,
    items: [
      { q: 'How does SpontiCoupon work?', a: 'Browse deals from local businesses, claim the ones you like, and redeem them by showing your QR code at the business. For Sponti Coupons (flash deals), the vendor may require a deposit, full payment, or no payment upfront — it depends on the business. For Steady Deals, you can claim for free and redeem at the business.' },
      { q: 'What is the difference between a Steady Deal and a Sponti Coupon?', a: 'Steady Deals are regular discounts that last 1-30 days — claim them anytime during that window. Sponti Coupons are flash deals lasting 4-24 hours with deeper discounts. The vendor decides whether to require a deposit, full prepayment, or allow free claims.' },
      { q: 'Is the deposit refundable?', a: 'If a vendor requires a deposit, it is generally non-refundable if you do not redeem the deal within the time window. This is clearly communicated before you claim. The deposit ensures businesses can plan for the expected customers. Each vendor sets their own deposit policy.' },
      { q: 'How do I redeem a deal?', a: 'After claiming a deal, you\'ll receive a unique QR code in your dashboard. Simply show this QR code at the business, and the staff will scan it to confirm your redemption. The discount is then applied.' },
      { q: 'Can I get a refund after claiming a deal?', a: 'For Steady Deals claimed without a deposit, you can cancel anytime. For Sponti Coupons with a deposit, the deposit is non-refundable if you don\'t show up. If a business doesn\'t honor the deal, contact us and we\'ll make it right.' },
      { q: 'How do loyalty rewards work?', a: 'When you redeem deals, you may automatically earn stamps or points in a business\'s loyalty program. Collect enough and you can redeem rewards like free items or discounts. Track your progress in the Loyalty Rewards section of your dashboard.' },
      { q: 'Can I leave a review?', a: 'Yes! After redeeming a deal, you can leave a verified review. Only customers who actually used a deal can review — this keeps reviews honest and trustworthy.' },
    ],
  },
  {
    title: 'For Businesses',
    icon: <Store className="w-5 h-5 text-blue-500" />,
    items: [
      { q: 'How much does it cost to list my business?', a: 'SpontiCoupon uses a flat-rate subscription model — not a percentage of each sale. Plans start at $49/month for Starter, with Pro ($99), Business ($199), and Enterprise ($499) tiers offering more features. Visit our Pricing page for details.' },
      { q: 'How is SpontiCoupon different from other deal platforms?', a: 'Unlike traditional deal platforms that take a large percentage of each sale and delay your payouts, SpontiCoupon charges a flat monthly fee. You keep 100% of your deal revenue. You also get full control over your deal terms, deposit requirements, volume limits, scheduling, analytics, and customer loyalty programs.' },
      { q: 'How do I get paid?', a: 'You decide your payment terms. For deposit-based deals, customers pay you directly through your own payment processor (Stripe, Square, PayPal, etc.). You can also require full prepayment or no payment at all — it\'s completely up to you. We never hold your money.' },
      { q: 'Can I limit how many people claim my deal?', a: 'Absolutely. You can set a maximum number of claims for any deal. You can also set daily and weekly limits if you\'re on a higher tier plan. This prevents being overwhelmed.' },
      { q: 'What analytics do I get?', a: 'Depending on your tier: claims and redemption tracking, revenue analytics, customer demographics, competitor benchmarking, AI-powered insights, and more. Higher tiers unlock advanced charts and AI deal recommendations.' },
      { q: 'Can I run a loyalty program?', a: 'Yes! Pro tier and above can create loyalty programs — either punch cards ("Buy 10, get 1 free") or points systems. Customers earn rewards automatically when they redeem deals. It\'s a powerful way to turn deal-seekers into regulars.' },
      { q: 'What happens if someone claims but doesn\'t show up?', a: 'If you require a deposit or prepayment on Sponti Coupons, those funds are non-refundable if the customer doesn\'t redeem — this protects you from no-shows. For free-claim Steady Deals or deals without deposits, there\'s no financial risk to you.' },
    ],
  },
  {
    title: 'Trust & Safety',
    icon: <Shield className="w-5 h-5 text-green-500" />,
    items: [
      { q: 'Are the deals verified?', a: 'We verify all businesses on our platform. Only legitimate businesses with valid business information can list deals.' },
      { q: 'How do you prevent fake reviews?', a: 'Only customers who have redeemed a deal can leave a review. Each review is tied to a verified redemption via QR code. This makes it impossible to leave fake reviews.' },
      { q: 'Is my personal information safe?', a: 'Yes. We use industry-standard encryption and never share your personal data with third parties. See our Privacy Policy for details.' },
    ],
  },
  {
    title: 'Payments & Billing',
    icon: <CreditCard className="w-5 h-5 text-purple-500" />,
    items: [
      { q: 'How do customer deposits work?', a: 'Deposits are optional — each vendor decides whether to require a deposit, full prepayment, or no upfront payment at all. When a deposit is required, the customer pays directly to the business through the business\'s payment processor. The deposit is applied to their purchase when they visit. SpontiCoupon does not process or hold any customer payments.' },
      { q: 'How do I manage my subscription?', a: 'You can manage your subscription, change plans, or cancel at any time from your Vendor Dashboard under Settings > Subscription.' },
      { q: 'Is there a free trial?', a: 'Contact us to learn about trial options for your business. We want to make sure SpontiCoupon is the right fit before you commit.' },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary-500 via-secondary-600 to-accent-700 text-white py-20 px-4">
        <div className="absolute inset-0 dot-pattern opacity-10 pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-orange-400 mb-6 shadow-lg shadow-primary-500/30">
            <HelpCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Frequently Asked Questions</h1>
          <p className="text-gray-300">Everything you need to know about SpontiCoupon</p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 px-4 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="max-w-3xl mx-auto space-y-10">
          {FAQ_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-4">
                {section.icon}
                <h2 className="text-xl font-bold text-secondary-500">{section.title}</h2>
              </div>
              <div className="space-y-2">
                {section.items.map((item, i) => {
                  const key = `${section.title}-${i}`;
                  const isOpen = openItems.has(key);
                  return (
                    <div key={key} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-secondary-500 text-sm pr-4">{item.q}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 -mt-1">
                          <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-secondary-500 via-secondary-600 to-accent-700 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-10 pointer-events-none" />
        <div className="relative">
          <h2 className="text-xl font-bold mb-2">Still have questions?</h2>
          <p className="text-gray-300 mb-6">We&apos;re here to help.</p>
          <Link href="/contact" className="bg-gradient-to-r from-primary-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all hover:scale-[1.02]">Contact Us</Link>
        </div>
      </section>
    </div>
  );
}
