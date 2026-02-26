'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X, RotateCcw } from 'lucide-react';
import { MiaChatbot, MiaAvatar } from './MiaChatbot';

const ALLOWED_PATHS = ['/', '/pricing', '/for-business'];

function getPageContext(pathname: string): 'general' | 'vendor-prospect' {
  if (pathname === '/pricing' || pathname === '/for-business') return 'vendor-prospect';
  return 'general';
}

export function MiaFloatingWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [chatKey, setChatKey] = useState(0);

  // Check sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasInteracted(sessionStorage.getItem('mia-interacted') === 'true');
    }
  }, []);

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

  // Don't render on non-allowed pages
  if (!ALLOWED_PATHS.includes(pathname)) return null;

  const pageContext = getPageContext(pathname);

  const handleOpen = () => {
    setIsOpen(true);
    if (!hasInteracted) {
      setHasInteracted(true);
      sessionStorage.setItem('mia-interacted', 'true');
    }
  };

  return (
    <>
      {/* Floating Bubble */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[55] w-14 h-14 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-600 shadow-lg shadow-secondary-500/25 hover:shadow-xl hover:shadow-secondary-500/35 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
          aria-label="Chat with Mia"
        >
          <MiaAvatar size={36} />
          {/* Pulse ring for attention */}
          {!hasInteracted && (
            <span className="absolute inset-0 rounded-full animate-ping bg-secondary-400 opacity-20 pointer-events-none" />
          )}
          {/* Tooltip */}
          <span className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-white text-secondary-600 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
            Chat with Mia
          </span>
        </button>
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
          style={{ maxWidth: '100vw' }}
          role="dialog"
          aria-label="Chat with Mia, SpontiCoupon assistant"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-secondary-500 to-secondary-600 px-4 py-3 flex items-center gap-3 shrink-0">
            <MiaAvatar size={32} />
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm">Mia</h3>
              <p className="text-secondary-200 text-[11px]">SpontiCoupon Assistant</p>
            </div>
            <div className="flex items-center gap-1.5 mr-1">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-secondary-200">Online</span>
            </div>
            <button
              onClick={() => {
                try { sessionStorage.removeItem('mia-chat-messages'); } catch { /* ignore */ }
                setChatKey(k => k + 1);
              }}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="New chat"
              title="New chat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat body */}
          <MiaChatbot
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
