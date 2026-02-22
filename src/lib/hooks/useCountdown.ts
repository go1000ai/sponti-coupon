'use client';

import { useState, useEffect } from 'react';
import { getTimeRemaining } from '@/lib/utils';

export function useCountdown(expiresAt: string) {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getTimeRemaining(expiresAt);
      setTimeRemaining(remaining);
      if (remaining.expired) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  return timeRemaining;
}
