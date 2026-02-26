'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';
import Image from 'next/image';

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
const STORAGE_KEY = 'mia-chat-messages';

interface MiaChatbotProps {
  onOpenTicket?: () => void;
  userRole?: 'vendor' | 'customer' | 'visitor';
  variant?: 'card' | 'floating';
  pageContext?: 'general' | 'vendor-prospect';
  onNewChat?: () => void;
}

const VENDOR_SUGGESTIONS = [
  'How do I create a deal?',
  'How do I scan a QR code?',
  'Billing question',
];

const CUSTOMER_SUGGESTIONS = [
  'How do I claim a deal?',
  'Billing question',
  'How do deposits work?',
];

const VISITOR_SUGGESTIONS = [
  'What is SpontiCoupon?',
  'How does it work?',
  'Is it free?',
];

const VENDOR_PROSPECT_SUGGESTIONS = [
  'How much does it cost?',
  'What features do I get?',
  'How do deals work?',
];

const MIA_AVATAR = '/mia.png';

export function MiaAvatar({ size = 32 }: { size?: number }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div
        className="rounded-full bg-gradient-to-br from-primary-400 to-orange-400 flex items-center justify-center flex-shrink-0 text-white font-bold"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        M
      </div>
    );
  }

  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <Image
        src={MIA_AVATAR}
        alt="Mia"
        width={size}
        height={size}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

function getGreeting(userRole: string): string {
  if (userRole === 'visitor') {
    return "Hey there! I'm Mia. Whether you're looking for amazing deals or thinking about listing your business — I'm here to help! What can I tell you?";
  }
  return "Hi! I'm Mia, your SpontiCoupon assistant. How can I help you today?";
}

function getSuggestions(userRole: string, pageContext?: string): string[] {
  if (pageContext === 'vendor-prospect') return VENDOR_PROSPECT_SUGGESTIONS;
  if (userRole === 'vendor') return VENDOR_SUGGESTIONS;
  if (userRole === 'visitor') return VISITOR_SUGGESTIONS;
  return CUSTOMER_SUGGESTIONS;
}

export function MiaChatbot({ onOpenTicket, userRole = 'customer', variant = 'card', pageContext, onNewChat }: MiaChatbotProps) {
  const isFloating = variant === 'floating';

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
    return [{ role: 'assistant', content: getGreeting(userRole) }];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check if speech recognition is available
  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // Persist messages to sessionStorage (floating widget only)
  useEffect(() => {
    if (isFloating && messages.length > 1) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
    }
  }, [messages, isFloating]);

  // Count user messages for the limit
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const isAtLimit = userMessageCount >= MAX_USER_MESSAGES;

  // Scroll the chat container (not the page) to bottom on new messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages, loading]);

  const handleNewChat = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setMessages([{ role: 'assistant', content: getGreeting(userRole) }]);
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
      const reply = data.reply || "I'm sorry, I couldn't process that. Please try again.";
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: userRole === 'visitor'
            ? "I'm having a little trouble right now. Check out our FAQ page or reach out through the Contact page!"
            : "I'm having trouble connecting right now. Please try again or open a support ticket below.",
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

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const suggestions = getSuggestions(userRole, pageContext);
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
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && <MiaAvatar size={28} />}
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
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <MiaAvatar size={28} />
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div />
      </div>

      {/* Suggestion chips */}
      {showSuggestions && (
        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-white shrink-0">
          <p className="text-xs text-gray-400 mb-2">Quick questions:</p>
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
            <p className="text-xs text-gray-500 mb-2">You&apos;ve reached the message limit for this chat.</p>
            <button
              onClick={handleNewChat}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-1.5 sm:gap-2 max-w-full">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 min-w-0 resize-none border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 transition-all"
                disabled={loading}
              />
              {speechSupported && (
                <button
                  onClick={toggleListening}
                  disabled={loading}
                  className={`p-2 sm:p-2.5 rounded-xl transition-all flex-shrink-0 ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-md'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                  }`}
                  aria-label={isListening ? 'Stop listening' : 'Voice input'}
                  title={isListening ? 'Tap to stop' : 'Voice input'}
                >
                  {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              )}
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="bg-gradient-to-r from-primary-500 to-orange-400 text-white p-2 sm:p-2.5 rounded-xl hover:from-primary-600 hover:to-orange-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
            {onOpenTicket && userRole !== 'visitor' && (
              <button
                onClick={onOpenTicket}
                className="w-full text-center text-xs text-gray-400 hover:text-primary-500 mt-2 transition-colors"
              >
                Rather open a support ticket?
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
        <MiaAvatar size={40} />
        <div>
          <h3 className="text-white font-bold text-base">Mia</h3>
          <p className="text-secondary-200 text-xs">Support Assistant</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-secondary-200">Online</span>
        </div>
      </div>
      {messagesArea}
    </div>
  );
}
