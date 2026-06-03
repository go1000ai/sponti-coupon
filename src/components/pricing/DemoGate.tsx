'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Loader2, X, CheckCircle2, Mail, Flame, ArrowRight } from 'lucide-react';

const UNLOCK_KEY = 'sponti_demo_unlocked';

export function DemoGate() {
  const [unlocked, setUnlocked] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage.getItem(UNLOCK_KEY) === '1') {
      setUnlocked(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source: 'pricing_demo_request',
          notes: 'Requested demo video from /pricing',
        }),
      });
      const data = await res.json();
      if (!res.ok && !data.success) {
        throw new Error(data.error || 'Submission failed');
      }
      window.localStorage.setItem(UNLOCK_KEY, '1');
      setUnlocked(true);
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (unlocked) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200">
          <video
            controls
            playsInline
            preload="metadata"
            poster="/videos/demo-thumb.jpg"
            autoPlay
            className="w-full"
          >
            <source src="/videos/demo-video.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Founders program CTA revealed after watching */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary-500 via-orange-500 to-amber-500 p-5 sm:p-6 shadow-xl">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-300/30 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="bg-white/20 backdrop-blur rounded-xl p-3 shrink-0">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white/90 uppercase tracking-wider mb-0.5">Like what you see?</p>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                See if you qualify for the <span className="text-amber-100">founders program</span>
              </h3>
              <p className="text-white/90 text-sm mt-1">
                3 months free &middot; no credit card &middot; by invitation. 4 quick questions.
              </p>
            </div>
            <Link
              href="/founding-vendor"
              className="group inline-flex items-center justify-center gap-1.5 bg-white hover:bg-amber-50 text-primary-600 font-extrabold px-5 py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02] whitespace-nowrap"
            >
              See if you qualify
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="group relative w-full rounded-2xl overflow-hidden shadow-xl cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary-200"
        aria-label="Watch the SpontiCoupon demo"
      >
        {/* Solid brand gradient — no thumbnail, no text-on-text conflict */}
        <div className="aspect-video w-full relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 transition-transform duration-500 group-hover:scale-[1.02]">
          {/* Subtle orange glow accents */}
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110">
            <Play className="w-9 h-9 text-primary-500 fill-primary-500 ml-1" />
          </div>
          <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
            Watch the 90-second demo
          </p>
          <p className="text-sm sm:text-base text-white/85 max-w-md">
            See how SpontiCoupon brings in customers &mdash; we&apos;ll send you the link too
          </p>
        </div>
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-fade-in"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-40"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
                <Play className="w-5 h-5 text-primary-500 fill-primary-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Where should we send the link?</h3>
                <p className="text-xs text-gray-500">So you can watch now &mdash; and come back later</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="demo-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="demo-email"
                    type="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={submitting}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:bg-gray-50"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Show me the tour
                  </>
                )}
              </button>

              <p className="text-[11px] text-gray-400 text-center">
                One friendly follow-up if you want to chat. No newsletter.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
