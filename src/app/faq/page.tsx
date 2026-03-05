'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle, Users, Store, Shield, CreditCard } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const { t } = useLanguage();

  const FAQ_SECTIONS = [
    {
      title: t('faq.sections.forCustomers'),
      icon: <Users className="w-5 h-5 text-primary-500" />,
      items: [
        { q: t('faq.customers.q1'), a: t('faq.customers.a1') },
        { q: t('faq.customers.q2'), a: t('faq.customers.a2') },
        { q: t('faq.customers.q3'), a: t('faq.customers.a3') },
        { q: t('faq.customers.q4'), a: t('faq.customers.a4') },
        { q: t('faq.customers.q5'), a: t('faq.customers.a5') },
        { q: t('faq.customers.q6'), a: t('faq.customers.a6') },
        { q: t('faq.customers.q7'), a: t('faq.customers.a7') },
      ],
    },
    {
      title: t('faq.sections.forBusinesses'),
      icon: <Store className="w-5 h-5 text-blue-500" />,
      items: [
        { q: t('faq.businesses.q1'), a: t('faq.businesses.a1') },
        { q: t('faq.businesses.q2'), a: t('faq.businesses.a2') },
        { q: t('faq.businesses.q3'), a: t('faq.businesses.a3') },
        { q: t('faq.businesses.q4'), a: t('faq.businesses.a4') },
        { q: t('faq.businesses.q5'), a: t('faq.businesses.a5') },
        { q: t('faq.businesses.q6'), a: t('faq.businesses.a6') },
        { q: t('faq.businesses.q7'), a: t('faq.businesses.a7') },
      ],
    },
    {
      title: t('faq.sections.trustSafety'),
      icon: <Shield className="w-5 h-5 text-green-500" />,
      items: [
        { q: t('faq.trust.q1'), a: t('faq.trust.a1') },
        { q: t('faq.trust.q2'), a: t('faq.trust.a2') },
        { q: t('faq.trust.q3'), a: t('faq.trust.a3') },
      ],
    },
    {
      title: t('faq.sections.paymentsBilling'),
      icon: <CreditCard className="w-5 h-5 text-blue-500" />,
      items: [
        { q: t('faq.payments.q1'), a: t('faq.payments.a1') },
        { q: t('faq.payments.q2'), a: t('faq.payments.a2') },
        { q: t('faq.payments.q3'), a: t('faq.payments.a3') },
      ],
    },
  ];

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
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{t('faq.title')}</h1>
          <p className="text-gray-300">{t('faq.everythingYouNeed')}</p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 px-4 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="max-w-3xl mx-auto space-y-10">
          {FAQ_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-4">
                {section.icon}
                <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
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
                        <span className="font-medium text-gray-900 text-sm pr-4">{item.q}</span>
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
          <h2 className="text-xl font-bold mb-2">{t('faq.stillHaveQuestions')}</h2>
          <p className="text-gray-300 mb-6">{t('faq.hereToHelp')}</p>
          <Link href="/contact" className="bg-gradient-to-r from-primary-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all hover:scale-[1.02]">{t('faq.contactUs')}</Link>
        </div>
      </section>
    </div>
  );
}
