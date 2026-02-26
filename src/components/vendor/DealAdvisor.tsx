'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface SuggestedPricing {
  original_price?: number;
  deal_price?: number;
  deposit_amount?: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggested_pricing?: SuggestedPricing | null;
}

interface DealAdvisorProps {
  dealType: 'regular' | 'sponti_coupon';
  currentPricing?: {
    original_price?: number;
    deal_price?: number;
    deposit_amount?: number;
    title?: string;
  };
  onApplyPricing: (pricing: SuggestedPricing) => void;
}

export default function DealAdvisor({ dealType, currentPricing, onApplyPricing }: DealAdvisorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-greet when expanded for the first time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (expanded && !hasGreeted && messages.length === 0) {
      setHasGreeted(true);
      sendMessage('Hi Ava! I need help pricing my deal.', true);
    }
  }, [expanded, hasGreeted, messages.length]);

  const sendMessage = async (text: string, isAutoGreet = false) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    if (!isAutoGreet) {
      setMessages(newMessages);
    } else {
      setMessages([userMsg]);
    }
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/vendor/deal-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: (isAutoGreet ? [userMsg] : newMessages).map(m => ({
            role: m.role,
            content: m.content,
          })),
          deal_type: dealType,
          current_pricing: currentPricing,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.reply,
          suggested_pricing: data.suggested_pricing,
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant' as const,
          content: data.error || "Sorry, I'm having trouble right now. Try again!",
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: "Connection issue — try again in a moment!",
      }]);
    }
    setLoading(false);
  };

  const handleApplyPricing = (pricing: SuggestedPricing) => {
    onApplyPricing(pricing);
    setMessages(prev => [...prev, {
      role: 'assistant' as const,
      content: "Done! I've filled in the pricing for you. Feel free to tweak it or ask me for a different suggestion.",
    }]);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-all group"
      >
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ava.png" alt="Ava" className="w-full h-full rounded-full object-cover" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-bold text-emerald-800 text-sm">Ask Ava — AI Deal Strategist</p>
          <p className="text-xs text-emerald-600">Get smart pricing suggestions based on your category, market, and deal history</p>
        </div>
        <ChevronDown className="w-5 h-5 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-200 bg-white/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-md shadow-emerald-500/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
              Ava <span className="text-[10px] font-normal text-emerald-500 bg-emerald-100 px-1.5 py-0.5 rounded-full">AI Deal Strategist</span>
            </p>
            <p className="text-[11px] text-emerald-600">Powered by SpontiCoupon</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-500 transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      {/* Chat messages */}
      <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 shadow-lg shadow-emerald-500/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
            </div>
            <p className="text-sm font-semibold text-emerald-800">Hey! I&apos;m Ava.</p>
            <p className="text-xs text-emerald-600 mt-1">I&apos;ll help you price your deal for maximum results. Let&apos;s go!</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'flex items-start gap-2'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <div className={`text-sm rounded-2xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-white text-gray-800 rounded-bl-md border border-emerald-100 shadow-sm'
                }`}>
                  {msg.content}
                </div>

                {/* Pricing suggestion card */}
                {msg.suggested_pricing && (
                  <div className="mt-2 bg-white border border-emerald-200 rounded-xl p-3 shadow-sm">
                    <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-2">Ava&apos;s Recommendation</p>
                    <div className="flex items-center gap-3 mb-2">
                      {msg.suggested_pricing.original_price && (
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400">Original</p>
                          <p className="text-sm font-bold text-gray-500 line-through">{formatCurrency(msg.suggested_pricing.original_price)}</p>
                        </div>
                      )}
                      {msg.suggested_pricing.deal_price && (
                        <>
                          <ArrowRight className="w-3 h-3 text-emerald-400" />
                          <div className="text-center">
                            <p className="text-[10px] text-gray-400">Deal Price</p>
                            <p className="text-lg font-bold text-emerald-600">{formatCurrency(msg.suggested_pricing.deal_price)}</p>
                          </div>
                        </>
                      )}
                      {msg.suggested_pricing.original_price && msg.suggested_pricing.deal_price && (
                        <span className="text-xs font-bold text-white bg-emerald-500 px-2 py-1 rounded-full">
                          {formatPercentage(Math.round((1 - msg.suggested_pricing.deal_price / msg.suggested_pricing.original_price) * 100))} OFF
                        </span>
                      )}
                    </div>
                    {msg.suggested_pricing.deposit_amount && (
                      <p className="text-[11px] text-gray-500 mb-2">
                        Suggested deposit: {formatCurrency(msg.suggested_pricing.deposit_amount)}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleApplyPricing(msg.suggested_pricing!)}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold py-2 rounded-lg transition-all shadow-md shadow-emerald-500/20"
                    >
                      Use Ava&apos;s Pricing
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ava.png" alt="Ava" className="w-full h-full object-cover" />
            </div>
            <div className="bg-white text-gray-400 text-sm rounded-2xl rounded-bl-md px-3.5 py-2.5 border border-emerald-100 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin inline" /> Thinking...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick prompts (only show when no messages yet) */}
      {messages.length === 0 && !loading && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {[
            'What discount should I offer?',
            'How should I price my deposit?',
            'What works best for my category?',
          ].map(q => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              className="text-[11px] bg-white border border-emerald-200 text-emerald-700 px-2.5 py-1.5 rounded-full hover:bg-emerald-50 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-1">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
            className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400"
            placeholder="Ask Ava about pricing..."
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
