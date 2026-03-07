'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X, RotateCcw } from 'lucide-react';
import { OliviaChatbot, OliviaAvatar } from './OliviaChatbot';
import { useLanguage } from '@/lib/i18n';

function getPageContext(pathname: string): 'general' | 'vendor-prospect' {
  if (pathname === '/pricing') return 'vendor-prospect';
  return 'general';
}

export function OliviaFloatingWidget() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [showTeaser, setShowTeaser] = useState(false);

  // Check sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasInteracted(sessionStorage.getItem('olivia-interacted') === 'true');
    }
  }, []);

  // Show teaser bubble on home page, first visit only
  useEffect(() => {
    if (typeof window === 'undefined' || pathname !== '/') return;
    if (localStorage.getItem('olivia-teaser-seen')) return;

    const showTimer = setTimeout(() => setShowTeaser(true), 3000);
    return () => clearTimeout(showTimer);
  }, [pathname]);

  // Auto-dismiss teaser after 8 seconds
  useEffect(() => {
    if (!showTeaser) return;
    const dismissTimer = setTimeout(() => {
      setShowTeaser(false);
      localStorage.setItem('olivia-teaser-seen', 'true');
    }, 8000);
    return () => clearTimeout(dismissTimer);
  }, [showTeaser]);

  const dismissTeaser = () => {
    setShowTeaser(false);
    localStorage.setItem('olivia-teaser-seen', 'true');
  };

  // Escape key closes the panel
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) setIsOpen(false);
  }, [isOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const pageContext = getPageContext(pathname);

  const handleOpen = () => {
    setIsOpen(true);
    dismissTeaser();
    if (!hasInteracted) {
      setHasInteracted(true);
      sessionStorage.setItem('olivia-interacted', 'true');
    }
  };

  return (
    <>
      {/* Floating Bubble */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[55] w-14 h-14 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-600 shadow-lg shadow-secondary-500/25 hover:shadow-xl hover:shadow-secondary-500/35 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
          aria-label={t('chatbot.chatWith', { name: 'Olivia' })}
        >
          <OliviaAvatar size={36} />
          {/* Pulse ring for attention */}
          {!hasInteracted && (
            <span className="absolute inset-0 rounded-full animate-ping bg-secondary-400 opacity-20 pointer-events-none" />
          )}
          {/* Tooltip (hidden when teaser is visible) */}
          {!showTeaser && (
            <span className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-white text-secondary-600 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
              {t('chatbot.chatWith', { name: 'Olivia' })}
            </span>
          )}
        </button>
      )}

      {/* Teaser speech bubble */}
      {!isOpen && showTeaser && (
        <div
          className="fixed bottom-[5.5rem] sm:bottom-[4.5rem] right-20 sm:right-[5.5rem] z-[55] animate-fade-in-up"
        >
          <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 max-w-[220px]">
            <button
              onClick={dismissTeaser}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-500 text-[10px] font-bold transition-colors"
              aria-label="Dismiss"
            >
              &times;
            </button>
            <button onClick={handleOpen} className="text-left">
              <p className="text-sm text-gray-800 font-medium leading-snug">
                Hi! I&apos;m <span className="text-secondary-500 font-bold">Olivia</span> — got questions? I&apos;m here to help!
              </p>
            </button>
            {/* Arrow pointing right toward the bubble */}
            <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-white drop-shadow-sm" />
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed z-[55] flex flex-col overflow-hidden
            top-20 bottom-0 left-0 right-0
            sm:top-auto sm:bottom-6 sm:right-6 sm:left-auto
            sm:w-[380px] sm:h-[540px]
            bg-white sm:rounded-2xl
            shadow-2xl border border-gray-200"
          style={{ maxWidth: '100%' }}
          role="dialog"
          aria-label={t('chatbot.chatWith', { name: 'Olivia' })}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-secondary-500 to-secondary-600 px-4 py-3 flex items-center gap-3 shrink-0">
            <OliviaAvatar size={32} />
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm">Olivia</h3>
              <p className="text-secondary-200 text-[11px]">{t('chatbot.assistant')}</p>
            </div>
            <div className="flex items-center gap-1.5 mr-1">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-secondary-200">{t('chatbot.online')}</span>
            </div>
            <button
              onClick={() => {
                try { sessionStorage.removeItem('olivia-chat-messages'); } catch { /* ignore */ }
                setChatKey(k => k + 1);
              }}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label={t('chatbot.newChat')}
              title={t('chatbot.newChat')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label={t('chatbot.closeChat')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat body */}
          <OliviaChatbot
            key={chatKey}
            userRole="visitor"
            variant="floating"
            pageContext={pageContext}
            onNewChat={() => setChatKey(k => k + 1)}
          />
        </div>
      )}
    </>
  );
}
