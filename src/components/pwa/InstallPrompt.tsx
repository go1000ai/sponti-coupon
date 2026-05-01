'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'pwa-install-dismissed-at';
const DISMISS_DAYS = 30;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already installed (running as standalone PWA) — never show.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari standalone flag
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // Recently dismissed — respect the cooldown.
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const ageMs = Date.now() - Number(dismissedAt);
        if (ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
      }
    } catch {
      // localStorage blocked (private mode, etc.) — proceed anyway.
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferredEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    setVisible(false);
    setDeferredEvent(null);
  };

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  if (!visible || !deferredEvent) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50"
      role="dialog"
      aria-label="Install SpontiCoupon"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">Install SpontiCoupon</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Add it to your home screen for faster access to deals.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={install}
              className="px-3 py-1.5 rounded-md bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-1.5 rounded-md text-gray-600 text-xs font-medium hover:bg-gray-100"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
