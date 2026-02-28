'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DealCarouselProps {
  children: React.ReactNode;
  /** Show left/right chevron buttons on desktop */
  showArrows?: boolean;
  /** Arrow button style: 'light' for white bg, 'dark' for dark bg sections */
  arrowVariant?: 'light' | 'dark';
  /** When this value changes, scroll resets to the start (e.g., pass activeTab) */
  resetKey?: string | number;
}

export function DealCarousel({
  children,
  showArrows = true,
  arrowVariant = 'light',
  resetKey,
}: DealCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, children]);

  // Reset scroll position when resetKey changes
  useEffect(() => {
    if (resetKey !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [resetKey]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll by ~one card width (70% of container on desktop)
    const scrollAmount = el.clientWidth * 0.72;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const arrowBase = 'absolute top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200 hover:scale-110';
  const arrowColors =
    arrowVariant === 'dark'
      ? 'bg-white/20 backdrop-blur-sm text-white border border-white/20 hover:bg-white/30'
      : 'bg-white/90 backdrop-blur-sm text-gray-700 border border-gray-200 hover:bg-white';

  return (
    <div className="relative">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
      >
        {children}
      </div>

      {/* Left arrow */}
      {showArrows && canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className={`${arrowBase} ${arrowColors} left-2`}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Right arrow */}
      {showArrows && canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className={`${arrowBase} ${arrowColors} right-2`}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
