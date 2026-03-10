'use client';

import { useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare, Send, Loader2, Check, HelpCircle, Phone,
} from 'lucide-react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { useLanguage } from '@/lib/i18n';

function ContactForm() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');
  const { t } = useLanguage();

  const INQUIRY_TYPES = [
    { value: 'general', label: t('contact.inquiryTypes.general') },
    { value: 'support', label: t('contact.inquiryTypes.support') },
    { value: 'enterprise', label: t('contact.inquiryTypes.enterprise') },
    { value: 'partnership', label: t('contact.inquiryTypes.partnership') },
    { value: 'other', label: t('contact.inquiryTypes.other') },
  ];

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    inquiryType: planParam === 'enterprise' ? 'enterprise' : 'general',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) return;
    setSubmitting(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          businessName: form.businessName,
          plan: form.inquiryType,
          message: form.message,
          turnstileToken,
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    }
    setSubmitting(false);
    turnstileRef.current?.reset();
    setTurnstileToken(null);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-5">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('contact.sentTitle')}
        </h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {t('contact.sentDesc')}
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ name: '', email: '', phone: '', businessName: '', inquiryType: 'general', message: '' });
          }}
          className="text-primary-500 font-semibold hover:text-primary-600 transition-colors"
        >
          {t('contact.sendAnother')}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="bg-gradient-to-br from-primary-500 to-orange-500 rounded-xl p-2.5 shadow-md">
          <Send className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          {t('contact.sendUsMessage')}
        </h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {t('contact.formDesc')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('contact.fullName')} <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('contact.email')} <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm"
              placeholder="john@business.com"
            />
          </div>
        </div>

        {/* Phone + Business Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('contact.phone')}
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label htmlFor="business" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('contact.businessName')}
            </label>
            <input
              id="business"
              type="text"
              value={form.businessName}
              onChange={(e) => setForm(f => ({ ...f, businessName: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm"
              placeholder="Your Business Name"
            />
          </div>
        </div>

        {/* Inquiry Type */}
        <div>
          <label htmlFor="inquiry" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('contact.inquiryType')} <span className="text-red-400">*</span>
          </label>
          <select
            id="inquiry"
            required
            value={form.inquiryType}
            onChange={(e) => setForm(f => ({ ...f, inquiryType: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm bg-white"
          >
            {INQUIRY_TYPES.map(it => (
              <option key={it.value} value={it.value}>{it.label}</option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('contact.message')} <span className="text-red-400">*</span>
          </label>
          <textarea
            id="message"
            rows={5}
            required
            value={form.message}
            onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-sm resize-none"
            placeholder={t('contact.messagePlaceholder')}
          />
        </div>

        {/* Turnstile CAPTCHA */}
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <Turnstile
            ref={turnstileRef}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            options={{ theme: 'light', size: 'flexible' }}
          />
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || (!turnstileToken && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)}
          className="w-full bg-gradient-to-r from-primary-500 to-orange-500 hover:from-primary-600 hover:to-orange-600 text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-200/50 hover:shadow-xl hover:scale-[1.01] disabled:opacity-75 disabled:hover:scale-100"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('contact.sending')}
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {t('contact.send')}
            </>
          )}
        </button>

        <p className="text-[11px] text-gray-400 text-center">
          {t('contact.responseNote')}
        </p>
      </form>
    </div>
  );
}

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary-500 via-secondary-600 to-accent-700 text-white py-20 px-4">
        <div className="absolute inset-0 dot-pattern opacity-10 pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-orange-400 mb-6 shadow-lg shadow-primary-500/30">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{t('contact.title')}</h1>
          <p className="text-gray-300">{t('contact.heroDesc')}</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-10 lg:gap-12">

            {/* -- Left: Contact Form -- */}
            <div className="lg:col-span-3">
              <Suspense fallback={
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-6" />
                  <div className="space-y-4">
                    <div className="h-10 bg-gray-200 rounded" />
                    <div className="h-10 bg-gray-200 rounded" />
                    <div className="h-24 bg-gray-200 rounded" />
                  </div>
                </div>
              }>
                <ContactForm />
              </Suspense>
            </div>

            {/* -- Right: Sidebar -- */}
            <div className="lg:col-span-2 space-y-6">
              {/* FAQ Link */}
              <div className="bg-gradient-to-br from-gray-50 to-accent-50/30 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-100 to-blue-100 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5 text-accent-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">{t('contact.quickAnswers')}</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {t('contact.quickAnswersDesc')}
                </p>
                <Link href="/faq" className="bg-gradient-to-r from-primary-500 to-orange-500 text-white px-5 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 shadow-lg shadow-primary-200 hover:shadow-xl transition-all hover:scale-[1.02] text-sm">
                  {t('contact.visitFaq')}
                </Link>
              </div>

              {/* Contact Info */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">{t('contact.reachUs')}</h3>
                <a href="tel:+13213350773" className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
                    <Phone className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">(321) 335-0773</p>
                    <p className="text-xs text-gray-400">{t('contact.available247')}</p>
                  </div>
                </a>
              </div>

              {/* SpontiCoupon branding */}
              <div className="bg-gradient-to-br from-secondary-500 to-secondary-700 rounded-2xl p-6 text-center">
                <SpontiIcon className="w-10 h-10 mx-auto mb-3" />
                <p className="text-white font-bold mb-1">SpontiCoupon</p>
                <p className="text-gray-300 text-xs leading-relaxed">
                  {t('contact.zeroCommission')}
                  <br />
                  {t('contact.builtForLocal')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
