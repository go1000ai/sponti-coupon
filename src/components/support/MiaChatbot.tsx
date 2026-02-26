'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface MiaChatbotProps {
  onOpenTicket?: () => void;
  userRole?: 'vendor' | 'customer';
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

const MIA_AVATAR = '/mia.png';

function MiaAvatar({ size = 32 }: { size?: number }) {
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
    <Image
      src={MIA_AVATAR}
      alt="Mia"
      width={size}
      height={size}
      className="rounded-full object-cover flex-shrink-0"
      onError={() => setImgError(true)}
    />
  );
}

export function MiaChatbot({ onOpenTicket, userRole = 'customer' }: MiaChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Mia, your SpontiCoupon assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll the chat container (not the page) to bottom on new messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

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
        body: JSON.stringify({ messages: updatedMessages, userRole }),
      });
      const data = await res.json();
      const reply = data.reply || "I'm sorry, I couldn't process that. Please try again.";
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again or open a support ticket below.",
        },
      ]);
    } finally {
      setLoading(false);
      // Re-focus the textarea so user can keep typing
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

  const suggestions = userRole === 'vendor' ? VENDOR_SUGGESTIONS : CUSTOMER_SUGGESTIONS;
  const showSuggestions = messages.length === 1 && !loading;

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

      {/* Messages */}
      <div ref={messagesContainerRef} className="h-[400px] sm:h-[450px] overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50">
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
              {msg.content}
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
        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-white">
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

      {/* Input */}
      <div className="border-t border-gray-200 p-3 sm:p-4 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 transition-all"
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
        {onOpenTicket && (
          <button
            onClick={onOpenTicket}
            className="w-full text-center text-xs text-gray-400 hover:text-primary-500 mt-2 transition-colors"
          >
            Rather open a support ticket?
          </button>
        )}
      </div>
    </div>
  );
}
