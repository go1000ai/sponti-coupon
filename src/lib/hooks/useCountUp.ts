'use client';

import { useEffect, useState, useRef } from 'react';
import { useScrollAnimation } from './useScrollAnimation';

export function useCountUp(endValue: number, duration: number = 2000) {
  const { ref, isVisible } = useScrollAnimation({ triggerOnce: true });
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplayValue(Math.round(eased * endValue));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, endValue, duration]);

  return { ref, displayValue };
}
