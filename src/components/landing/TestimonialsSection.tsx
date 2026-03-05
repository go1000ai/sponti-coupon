'use client';

import { useEffect, useRef } from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Star, MessageCircleHeart, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export function TestimonialsSection() {
  const { t } = useLanguage();

  const testimonials = [
    {
      quote: t('home.testimonials.quote1'),
      name: 'Jessica Taylor',
      role: 'Orlando, FL',
      rating: 5,
    },
    {
      quote: t('home.testimonials.quote2'),
      name: 'David Park',
      role: 'Winter Park, FL',
      rating: 5,
    },
    {
      quote: t('home.testimonials.quote3'),
      name: 'Ashley Martinez',
      role: 'Kissimmee, FL',
      rating: 5,
    },
  ];
  const bgRef = useRef<HTMLDivElement>(null);

  // Subtle parallax gradient background
  useEffect(() => {
    const element = bgRef.current;
    if (!element) return;
    if (window.innerWidth < 768) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect();
          const scrolled = window.innerHeight - rect.top;
          if (scrolled > 0 && rect.top < window.innerHeight) {
            element.style.transform = `translate3d(0, ${scrolled * -0.15 * 0.8}px, 0)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative py-8 sm:py-12 md:py-16 bg-gray-50 overflow-hidden">
      {/* Parallax gradient background */}
      <div
        ref={bgRef}
        className="absolute inset-0 -top-[30%] -bottom-[30%] will-change-transform pointer-events-none hidden md:block"
      >
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-primary-500/5 via-orange-500/3 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-accent-500/5 via-blue-500/3 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-6 sm:mb-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-50 to-orange-50 rounded-full px-5 py-2 mb-4 shadow-sm">
              <Sparkles className="w-4 h-4 text-primary-500" strokeWidth={1.8} />
              <span className="text-sm font-semibold text-primary-600">{t('home.testimonials.badge')}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {t('home.testimonials.title')}
            </h2>
            <p className="text-gray-500 mt-3 text-lg">
              {t('home.testimonials.subtitle')}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} animation="fade-up" delay={i * 150}>
              <div className="floating-card card p-4 sm:p-5 md:p-6 h-full flex flex-col bg-white">
                <div className="bg-gradient-to-br from-primary-100 to-orange-100 rounded-xl p-2.5 mb-4 inline-flex">
                  <MessageCircleHeart className="w-6 h-6 text-primary-500" strokeWidth={1.8} />
                </div>
                <p className="text-gray-600 leading-relaxed flex-1 text-sm sm:text-base">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-400">{t.role}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
