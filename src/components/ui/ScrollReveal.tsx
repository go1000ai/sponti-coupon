'use client';

import { useScrollAnimation } from '@/lib/hooks/useScrollAnimation';

interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'scale-up';
  delay?: number;
  className?: string;
}

export function ScrollReveal({ children, animation = 'fade-up', delay = 0, className = '' }: ScrollRevealProps) {
  const { ref, isVisible } = useScrollAnimation();

  const baseHidden: Record<string, string> = {
    'fade-up': 'opacity-0 translate-y-8',
    'fade-in': 'opacity-0',
    'slide-left': 'opacity-0 translate-x-12',
    'slide-right': 'opacity-0 -translate-x-12',
    'scale-up': 'opacity-0 scale-90',
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0 translate-x-0 scale-100' : baseHidden[animation]
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
