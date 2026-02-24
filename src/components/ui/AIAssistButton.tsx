'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import type { AutoResponseTone } from '@/lib/types/database';

type AssistType = 'business_description' | 'deal_title' | 'deal_description' | 'review_reply' | 'loyalty_program_name' | 'loyalty_description' | 'loyalty_reward' | 'loyalty_reward_name';

interface AIAssistButtonProps {
  type: AssistType;
  context?: Record<string, string>;
  onResult: (text: string) => void;
  label?: string;
  className?: string;
  tone?: AutoResponseTone;
}

export function AIAssistButton({
  type,
  context = {},
  onResult,
  label = 'AI Assist',
  className = '',
  tone,
}: AIAssistButtonProps) {
  const [loading, setLoading] = useState(false);

  // Use refs to always have the latest values in the async handler
  const toneRef = useRef(tone);
  const contextRef = useRef(context);
  const onResultRef = useRef(onResult);

  useEffect(() => { toneRef.current = tone; }, [tone]);
  useEffect(() => { contextRef.current = context; }, [context]);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vendor/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context: contextRef.current, tone: toneRef.current }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to generate. Please try again.');
        return;
      }

      const data = await res.json();
      if (data.text) {
        onResultRef.current(data.text);
      }
    } catch {
      alert('AI assist is unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
        loading
          ? 'bg-purple-100 text-purple-400 cursor-wait'
          : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:shadow-md hover:shadow-purple-200/50 active:scale-95'
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Sparkles className="w-3.5 h-3.5" />
      )}
      {loading ? 'Writing...' : label}
    </button>
  );
}
