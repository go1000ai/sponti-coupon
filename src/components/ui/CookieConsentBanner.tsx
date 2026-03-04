'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

const STORAGE_KEY = 'sc_cookie_consent';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable — skip banner
    }
  }, []);

  const accept = (choice: 'all' | 'essential') => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
    >
      <div className="max-w-4xl mx-auto bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-700 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-gray-300 leading-relaxed">
          <strong className="text-white block mb-1">We use cookies</strong>
          Essential cookies keep the platform running. With your consent we also use analytics
          cookies to improve your experience. See our{' '}
          <Link href="/privacy#section-7" className="text-primary-400 hover:underline underline-offset-2">
            Cookie &amp; Privacy Policy
          </Link>.
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => accept('essential')}
            className="px-4 py-2 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            Essential Only
          </button>
          <button
            onClick={() => accept('all')}
            className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium whitespace-nowrap"
          >
            Accept All
          </button>
          <button
            onClick={() => accept('essential')}
            aria-label="Dismiss"
            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
