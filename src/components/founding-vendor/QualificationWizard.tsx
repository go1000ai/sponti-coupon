'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Gift, ShieldCheck, ArrowLeft, Mail, Loader2 } from 'lucide-react';

export type WizardAnswers = Record<string, 'yes' | 'no'>;

export function formatAnswersForNotes(answers: WizardAnswers): string {
  return Object.entries(answers)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

interface Question {
  id: string;
  prompt: string;
  yesLabel?: string;
  noLabel?: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'decision_maker',
    prompt: 'Are you the owner or the person who decides on promotions?',
    yesLabel: 'Yes, that’s me',
    noLabel: 'No, not me',
  },
  {
    id: 'slow_days',
    prompt: 'Do you have slow days or unbooked time you’d love to fill?',
    yesLabel: 'Yes, all the time',
    noLabel: 'No, we’re always booked',
  },
  {
    id: 'ready_to_post',
    prompt: 'Are you ready to post your first deal within 7 days?',
    yesLabel: 'Yes, ready to go',
    noLabel: 'Not yet',
  },
  {
    id: 'weekly_checkin',
    prompt: 'Are you open to a quick check-in each week as we refine the product together?',
    yesLabel: 'Yes, happy to help',
    noLabel: 'No, just want to use it',
  },
];

interface Props {
  onQualified: (answers: WizardAnswers) => void;
}

export function QualificationWizard({ onQualified }: Props) {
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
      setDqError('Please enter a valid email.');
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
      setDqError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
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
            The founding program isn&apos;t the right fit yet
          </h3>
          <p className="text-gray-600 text-sm mb-5">
            No worries &mdash; our standard founders offer is still open. Same quality, slightly different terms.
          </p>

          <div className="bg-gradient-to-br from-primary-500 via-orange-500 to-amber-500 rounded-2xl p-5 text-white text-left mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Standard founders offer</span>
            </div>
            <p className="text-2xl font-black leading-tight">
              2 months free + <span className="text-amber-100">20% off forever</span>
            </p>
            <p className="text-white/90 text-xs mt-1">Available on Pro and Business plans &middot; while signups last</p>
          </div>

          {!dqSaved ? (
            <form onSubmit={handleDqSubmit} className="text-left space-y-3 mb-4">
              <label className="block text-sm font-semibold text-gray-700">
                Want us to follow up when the timing&apos;s better?
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
                {dqSubmitting ? 'Saving…' : 'Keep me posted'}
              </button>
            </form>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-emerald-700 text-sm flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-4 h-4" />
              We&apos;ll be in touch.
            </div>
          )}

          <Link
            href="/pricing#plans"
            className="group inline-flex items-center justify-center gap-2 w-full bg-primary-500 hover:bg-primary-600 text-white font-extrabold py-3 rounded-xl transition-colors"
          >
            See the standard offer
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
            Go back and review my answers
          </button>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[step];
  const progressPct = ((step + 1) / QUESTIONS.length) * 100;

  return (
    <div className="relative bg-white rounded-3xl shadow-2xl border border-white/80 overflow-hidden">
      {/* Gradient header */}
      <div className="relative bg-gradient-to-br from-primary-500 via-orange-500 to-amber-500 px-6 py-5 text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              See if you qualify
            </span>
          </div>
          <h2 className="font-extrabold text-lg leading-tight">4 quick questions &middot; under 30 seconds</h2>
        </div>
        {/* Progress bar */}
        <div className="relative mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="relative text-[11px] text-white/80 mt-1.5">
          Question {step + 1} of {QUESTIONS.length}
        </p>
      </div>

      {/* Question body */}
      <div className="p-6 sm:p-8">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight mb-6">
          {q.prompt}
        </h3>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleAnswer('yes')}
            className="group w-full flex items-center justify-between gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50/40 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="font-bold text-gray-900">{q.yesLabel || 'Yes'}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => handleAnswer('no')}
            className="group w-full flex items-center justify-between gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                <span className="text-lg">&times;</span>
              </div>
              <span className="font-semibold text-gray-700">{q.noLabel || 'No'}</span>
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
            Back
          </button>
        )}
      </div>
    </div>
  );
}
