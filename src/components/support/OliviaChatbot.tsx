'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { Send, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';

// Auto-detect URLs in text and render them as clickable links
function linkifyText(text: string): ReactNode {
  const urlRegex = /(https?:\/\/[^\s,)]+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target={part.includes(window.location.host) ? '_self' : '_blank'}
        rel="noopener noreferrer"
        className="underline font-medium hover:opacity-80"
      >
        {part.replace(/^https?:\/\//, '')}
      </a>
    ) : (
      part
    )
  );
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_USER_MESSAGES = 25;
const STORAGE_KEY = 'olivia-chat-messages';

interface OliviaChatbotProps {
  onOpenTicket?: () => void;
  userRole?: 'vendor' | 'customer' | 'visitor';
  variant?: 'card' | 'floating';
  pageContext?: 'general' | 'vendor-prospect';
  onNewChat?: () => void;
}

// Suggestion keys by role (resolved with t() inside component)
const VENDOR_SUGGESTION_KEYS = ['chatbot.sugVendorCreateDeal', 'chatbot.sugVendorScanQR', 'chatbot.sugVendorBilling'];
const CUSTOMER_SUGGESTION_KEYS = ['chatbot.sugCustomerClaim', 'chatbot.sugCustomerBilling', 'chatbot.sugCustomerDeposits'];
const VISITOR_SUGGESTION_KEYS = ['chatbot.sugVisitorWhat', 'chatbot.sugVisitorHow', 'chatbot.sugVisitorFree'];
const VENDOR_PROSPECT_SUGGESTION_KEYS = ['chatbot.sugProspectCost', 'chatbot.sugProspectFeatures', 'chatbot.sugProspectDeals'];

const OLIVIA_AVATAR = '/olivia.png';

export function OliviaAvatar({ size = 32 }: { size?: number }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div
        className="rounded-full bg-gradient-to-br from-primary-400 to-orange-400 flex items-center justify-center flex-shrink-0 text-white font-bold"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        O
      </div>
    );
  }

  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <Image
        src={OLIVIA_AVATAR}
        alt="Olivia"
        width={size}
        height={size}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

function getGreetingKey(userRole: string): string {
  if (userRole === 'visitor') return 'chatbot.oliviaGreetingVisitor';
  return 'chatbot.oliviaGreetingDefault';
}

function getSuggestionKeys(userRole: string, pageContext?: string): string[] {
  if (pageContext === 'vendor-prospect') return VENDOR_PROSPECT_SUGGESTION_KEYS;
  if (userRole === 'vendor') return VENDOR_SUGGESTION_KEYS;
  if (userRole === 'visitor') return VISITOR_SUGGESTION_KEYS;
  return CUSTOMER_SUGGESTION_KEYS;
}

// Lead capture form state
interface LeadForm {
  name: string;
  email: string;
  phone: string;
  business_name: string;
  sms_consent: boolean;
}

export function OliviaChatbot({ onOpenTicket, userRole = 'customer', variant = 'card', pageContext, onNewChat }: OliviaChatbotProps) {
  const isFloating = variant === 'floating';
  const { t } = useLanguage();

  // Load persisted messages from sessionStorage (floating widget only)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (isFloating && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch { /* ignore */ }
    }
    return [{ role: 'assistant', content: t(getGreetingKey(userRole)) }];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadForm>({ name: '', email: '', phone: '', business_name: '', sms_consent: false });
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist messages to sessionStorage (floating widget only)
  useEffect(() => {
    if (isFloating && messages.length > 1) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
    }
  }, [messages, isFloating]);

  // Count user messages for the limit
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const isAtLimit = userMessageCount >= MAX_USER_MESSAGES;

  // Scroll to the start of the latest assistant message so the user reads from the top
  const lastAssistantRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    // Skip scroll for the initial greeting — it would push the whole page down
    if (messages.length <= 1) return;

    requestAnimationFrame(() => {
      const lastMsg = messages[messages.length - 1];
      // If the latest message is from Olivia, scroll within the chat container only
      if (lastMsg?.role === 'assistant' && lastAssistantRef.current) {
        const offset = lastAssistantRef.current.offsetTop - container.offsetTop;
        container.scrollTo({ top: offset, behavior: 'smooth' });
      } else {
        // User message — scroll to bottom as usual
        container.scrollTop = container.scrollHeight;
      }
    });
  }, [messages, loading]);

  const handleNewChat = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setMessages([{ role: 'assistant', content: t(getGreetingKey(userRole)) }]);
    setInput('');
    onNewChat?.();
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || isAtLimit) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, userRole, origin: window.location.origin }),
      });
      const data = await res.json();
      let reply = data.reply || t('chatbot.couldntProcess');
      // Detect lead capture trigger from Olivia
      if (reply.includes('[CAPTURE_LEAD]') && !leadCaptured) {
        reply = reply.replace(/\s*\[CAPTURE_LEAD\]\s*/g, '');
        setShowLeadForm(true);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: userRole === 'visitor'
            ? t('chatbot.errorVisitor')
            : t('chatbot.errorDefault'),
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleLeadSubmit = async () => {
    if (!leadForm.email.trim() || !leadForm.email.includes('@')) return;
    setLeadSubmitting(true);
    try {
      await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadForm.name,
          email: leadForm.email,
          phone: leadForm.phone,
          business_name: leadForm.business_name,
          source: 'olivia_chat',
          sms_consent: leadForm.sms_consent,
        }),
      });
      setLeadCaptured(true);
      setShowLeadForm(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Got it! I'll make sure our team reaches out with everything you need. In the meantime, feel free to check out our deals or ask me anything else!",
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Hmm, something went wrong saving your info. Could you try again?",
      }]);
    } finally {
      setLeadSubmitting(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const suggestionKeys = getSuggestionKeys(userRole, pageContext);
  const suggestions = suggestionKeys.map(k => t(k));
  const showSuggestions = messages.length === 1 && !loading;

  const messagesArea = (
    <>
      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className={`overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 bg-gray-50 ${
          isFloating ? 'flex-1' : 'h-[400px] sm:h-[450px]'
        }`}
      >
        {messages.map((msg, i) => {
          // Find the last assistant message index for scroll targeting
          const isLastAssistant =
            msg.role === 'assistant' &&
            i === messages.reduce((lastIdx, m, idx) => (m.role === 'assistant' ? idx : lastIdx), -1);

          return (
            <div
              key={i}
              ref={isLastAssistant ? lastAssistantRef : undefined}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && <OliviaAvatar size={28} />}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-primary-500 to-orange-400 text-white rounded-tr-sm'
                    : 'bg-white border border-gray-100 text-gray-700 shadow-sm rounded-tl-sm'
                }`}
              >
                {msg.role === 'assistant' ? linkifyText(msg.content) : msg.content}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <OliviaAvatar size={28} />
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Lead capture form */}
        {showLeadForm && !leadCaptured && (
          <div className="mx-2 bg-gradient-to-br from-primary-50 to-orange-50 border border-primary-200 rounded-xl p-3.5 space-y-2.5">
            <p className="text-xs font-semibold text-gray-700">Drop your info and we&apos;ll be in touch!</p>
            <input
              type="text"
              placeholder="Name"
              value={leadForm.name}
              onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <input
              type="email"
              placeholder="Email *"
              required
              value={leadForm.email}
              onChange={e => setLeadForm(f => ({ ...f, email: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <input
              type="tel"
              placeholder="Phone *"
              required
              value={leadForm.phone}
              onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Business name (optional)"
              value={leadForm.business_name}
              onChange={e => setLeadForm(f => ({ ...f, business_name: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {/* SMS Consent — required for A2P/TCPA compliance */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={leadForm.sms_consent}
                onChange={e => setLeadForm(f => ({ ...f, sms_consent: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500 shrink-0"
              />
              <span className="text-[10px] leading-tight text-gray-500">
                By submitting, you authorize Online Commerce Hub, LLC DBA SpontiCoupon to text/call the number above for promotional messages, possibly using automated means. Msg/data rates apply, msg frequency varies. Consent is not a condition of purchase. See{' '}
                <a href="/terms" target="_blank" className="underline text-primary-500">terms</a> and{' '}
                <a href="/privacy" target="_blank" className="underline text-primary-500">privacy policy</a>.
                Text HELP for help and STOP to unsubscribe.
              </span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleLeadSubmit}
                disabled={leadSubmitting || !leadForm.email.includes('@') || !leadForm.phone.trim() || !leadForm.sms_consent}
                className="flex-1 text-sm font-medium bg-primary-500 text-white rounded-lg py-2 hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {leadSubmitting ? 'Sending...' : 'Send'}
              </button>
              <button
                onClick={() => setShowLeadForm(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        <div />
      </div>

      {/* Suggestion chips */}
      {showSuggestions && (
        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-white shrink-0">
          <p className="text-xs text-gray-400 mb-2">{t('chatbot.quickQuestions')}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors font-medium border border-primary-100"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input or limit message */}
      <div className="border-t border-gray-200 p-3 sm:p-4 bg-white shrink-0 overflow-hidden">
        {isAtLimit ? (
          <div className="text-center py-1">
            <p className="text-xs text-gray-500 mb-2">{t('chatbot.messageLimitReached')}</p>
            <button
              onClick={handleNewChat}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              {t('chatbot.startNewChat')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={t('chatbot.typeMessage')}
                rows={1}
                className="flex-1 min-w-0 resize-none border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 transition-all"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="bg-gradient-to-r from-primary-500 to-orange-400 text-white p-2.5 rounded-xl hover:from-primary-600 hover:to-orange-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            {onOpenTicket && userRole !== 'visitor' && (
              <button
                onClick={onOpenTicket}
                className="w-full text-center text-xs text-gray-400 hover:text-primary-500 mt-2 transition-colors"
              >
                {t('chatbot.openSupportTicket')}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );

  // Floating variant: no card wrapper or header (parent provides them)
  if (isFloating) {
    return <div className="flex flex-col flex-1 overflow-hidden">{messagesArea}</div>;
  }

  // Card variant (original): full card with header
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary-500 to-secondary-600 px-4 sm:px-6 py-4 flex items-center gap-3">
        <OliviaAvatar size={40} />
        <div>
          <h3 className="text-white font-bold text-base">Olivia</h3>
          <p className="text-secondary-200 text-xs">{t('chatbot.supportAssistant')}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-secondary-200">{t('chatbot.online')}</span>
        </div>
      </div>
      {messagesArea}
    </div>
  );
}
