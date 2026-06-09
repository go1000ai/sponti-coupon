'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Gift, ShieldCheck, ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export type WizardAnswers = Record<string, 'yes' | 'no'>;

export function formatAnswersForNotes(answers: WizardAnswers): string {
  return Object.entries(answers)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

interface Question {
  id: string;
  key: string;
}

// Prompts and yes/no labels live in i18n at foundingVendor.wizard.<key>[yes|no]
const QUESTIONS: Question[] = [
  { id: 'decision_maker', key: 'q1' },
  { id: 'slow_days', key: 'q2' },
  { id: 'ready_to_post', key: 'q3' },
  { id: 'weekly_checkin', key: 'q4' },
];

interface Props {
  onQualified: (answers: WizardAnswers) => void;
}

export function QualificationWizard({ onQualified }: Props) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [disqualified, setDisqualified] = useState(false);
  const [dqEmail, setDqEmail] = useState('');
  const [dqSubmitting, setDqSubmitting] = useState(false);
  const [dqError, setDqError] = useState<string | null>(null);
  const [dqSaved, setDqSaved] = useState(false);

  const handleAnswer = (value: 'yes' | 'no') => {
    const q = QUESTIONS[step];
    const next = { ...answers, [q.id]: value };
    setAnswers(next);

    if (value === 'no') {
      setDisqualified(true);
      return;
    }

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      onQualified(next);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleDqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDqError(null);
    if (!dqEmail.trim() || !dqEmail.includes('@')) {
      setDqError(t('foundingVendor.wizard.dqEmailInvalid'));
      return;
    }
    setDqSubmitting(true);
    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dqEmail.trim().toLowerCase(),
          source: 'founding_vendor_wizard_disqualified',
          notes: `Disqualified at /founding-vendor wizard. Answers: ${formatAnswersForNotes(answers)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok && !data.success) {
        throw new Error(data.error || 'Submission failed');
      }
      setDqSaved(true);
    } catch (err) {
      setDqError(err instanceof Error ? err.message : t('foundingVendor.wizard.dqError'));
    } finally {
      setDqSubmitting(false);
    }
  };

  if (disqualified) {
    return (
      <div className="relative bg-white rounded-3xl shadow-2xl border border-white/80 overflow-hidden p-6 sm:p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-4">
            <Gift className="w-7 h-7 text-amber-600" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-2">
            {t('foundingVendor.wizard.dqTitle')}
          </h3>
          <p className="text-gray-600 text-sm mb-5">
            {t('foundingVendor.wizard.dqBody')}
          </p>

          <div className="bg-gradient-to-br from-primary-500 via-orange-500 to-amber-500 rounded-2xl p-5 text-white text-left mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{t('foundingVendor.wizard.dqOfferLabel')}</span>
            </div>
            <p className="text-2xl font-black leading-tight">
              {t('foundingVendor.wizard.dqOfferA')}<span className="text-amber-100">{t('foundingVendor.wizard.dqOfferStrong')}</span>
            </p>
            <p className="text-white/90 text-xs mt-1">{t('foundingVendor.wizard.dqAvailable')}</p>
          </div>

          {!dqSaved ? (
            <form onSubmit={handleDqSubmit} className="text-left space-y-3 mb-4">
              <label className="block text-sm font-semibold text-gray-700">
                {t('foundingVendor.wizard.dqFollowupLabel')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={dqEmail}
                  onChange={(e) => setDqEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  disabled={dqSubmitting}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
                />
              </div>
              {dqError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{dqError}</p>
              )}
              <button
                type="submit"
                disabled={dqSubmitting}
                className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {dqSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {dqSubmitting ? t('foundingVendor.wizard.dqSaving') : t('foundingVendor.wizard.dqSubmit')}
              </button>
            </form>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-emerald-700 text-sm flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-4 h-4" />
              {t('foundingVendor.wizard.dqSaved')}
            </div>
          )}

          <Link
            href="/pricing#plans"
            className="group inline-flex items-center justify-center gap-2 w-full bg-primary-500 hover:bg-primary-600 text-white font-extrabold py-3 rounded-xl transition-colors"
          >
            {t('foundingVendor.wizard.dqSeeOffer')}
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          <button
            type="button"
            onClick={() => {
              setDisqualified(false);
              setStep(0);
              setAnswers({});
              setDqEmail('');
              setDqSaved(false);
              setDqError(null);
            }}
            className="block w-full mt-3 text-xs text-gray-400 hover:text-gray-600"
          >
            {t('foundingVendor.wizard.dqGoBack')}
          </button>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[step];
  const progressPct = ((step + 1) / QUESTIONS.length) * 100;

  return (
    <div className="relative bg-white rounded-3xl shadow-2xl border border-white/80 overflow-hidden lg:flex">
      {/* Gradient header — side panel on desktop */}
      <div className="relative bg-gradient-to-br from-primary-500 via-orange-500 to-amber-500 px-6 py-5 lg:px-10 lg:py-10 text-white overflow-hidden lg:w-[38%] lg:flex lg:flex-col lg:justify-center">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {t('foundingVendor.wizard.eyebrow')}
            </span>
          </div>
          <h2 className="font-extrabold text-lg lg:text-3xl leading-tight">{t('foundingVendor.wizard.title')}</h2>
          <p className="hidden lg:block text-sm text-white/85 mt-3 leading-relaxed">
            {t('foundingVendor.wizard.sub')}
          </p>
        </div>
        {/* Progress bar */}
        <div className="relative mt-4 lg:mt-6 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="relative text-[11px] text-white/80 mt-1.5">
          {t('foundingVendor.wizard.questionOf', { step: step + 1, total: QUESTIONS.length })}
        </p>
      </div>

      {/* Question body */}
      <div className="p-6 sm:p-8 lg:p-10 lg:flex-1 lg:flex lg:flex-col lg:justify-center">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight mb-6">
          {t(`foundingVendor.wizard.${q.key}`)}
        </h3>

        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleAnswer('yes')}
            className="group flex items-center justify-between gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50/40 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="font-bold text-gray-900">{t(`foundingVendor.wizard.${q.key}yes`)}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => handleAnswer('no')}
            className="group flex items-center justify-between gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                <span className="text-lg">&times;</span>
              </div>
              <span className="font-semibold text-gray-700">{t(`foundingVendor.wizard.${q.key}no`)}</span>
            </div>
          </button>
        </div>

        {step > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="mt-5 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('foundingVendor.wizard.back')}
          </button>
        )}
      </div>
    </div>
  );
}
