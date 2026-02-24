'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hook that adds 'visible' class to elements when they enter the viewport.
 * Pair with CSS class 'reveal' or 'stagger-parent' on the element.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
  once = true
) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          el.classList.add('visible');
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
          el.classList.remove('visible');
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  return { ref, isVisible };
}

/**
 * Hook for animated number counting.
 * Returns the current animated value.
 */
export function useCountUp(target: number, duration = 1200, startOnVisible = true) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(!startOnVisible);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnVisible) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [startOnVisible]);

  useEffect(() => {
    if (!started || target === 0) {
      if (started) setValue(target);
      return;
    }

    let startTime: number;
    let animFrame: number;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        animFrame = requestAnimationFrame(animate);
      }
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [target, duration, started]);

  return { value, ref };
}
