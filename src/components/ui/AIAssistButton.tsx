'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
  label = 'Ava Assist',
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
      alert('Ava is unavailable right now. Please try again later.');
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
          ? 'bg-emerald-100 text-emerald-400 cursor-wait'
          : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 hover:shadow-md hover:shadow-emerald-200/50 active:scale-95'
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/ava.png" alt="Ava" className="w-3.5 h-3.5 rounded-full object-cover" />
      )}
      {loading ? 'Writing...' : label}
    </button>
  );
}
