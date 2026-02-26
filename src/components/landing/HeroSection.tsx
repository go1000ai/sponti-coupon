'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Star, Users, ShieldCheck, Flame, Clock } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { LandingAccordionItem } from '@/components/ui/interactive-image-accordion';
import { SearchAutocomplete } from '@/components/ui/SearchAutocomplete';

interface DealStats {
  totalActive: number;
  expiringSoon: number;
  claimedToday: number;
  totalSavedThisWeek: number;
}

export function HeroSection() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<DealStats | null>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch live deal stats for urgency badge
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/deals/stats');
        const data = await res.json();
        setStats(data);
      } catch {
        // Silently fail — badge just won't show
      }
    }
    fetchStats();
  }, []);

  // Very subtle hero parallax — slight movement, not much
  useEffect(() => {
    const element = bgRef.current;
    if (!element) return;
    if (window.innerWidth < 768) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          element.style.transform = `translate3d(0, ${scrollY * 0.15}px, 0)`;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative text-white overflow-hidden h-[80vh] md:h-[90vh] flex items-center bg-secondary-700">
      {/* Subtle parallax background — moves slightly as you scroll */}
      <div
        ref={bgRef}
        className="absolute inset-0 -top-[15%] -bottom-[15%] will-change-transform"
      >
        <Image
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop"
          alt=""
          fill
          priority
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIRAAAQMEAgMBAAAAAAAAAAAAAQIDBAAFESEGMRJBYXH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAIDAQAAAAAAAAAAAAAAAAECAAMRIf/aAAwDAQACEQMRAD8Aw+0caudynNQ4jPm86cAaGtk9AfaqPOOIXHjsh1u5R0thyUtkNOAKAPWQKUqjG7IyENdn/9k="
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>

      {/* Dark overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary-500/90 via-secondary-600/85 to-secondary-700/90" />

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/15 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/2 -left-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute -bottom-20 right-1/3 w-56 h-56 bg-primary-500/15 rounded-full blur-2xl animate-float" style={{ animationDelay: '0.8s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-32 w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Left Side: Text Content + Search */}
          <div className="w-full md:w-1/2 text-center md:text-left">
            <div
              className={`inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/40 rounded-full px-4 py-1.5 mb-6 transition-opacity duration-700 ease-out ${
                mounted ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <SpontiIcon className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-primary-300">Sponti Deals. Real Savings. Right Now.</span>
            </div>

            <h1
              className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tighter transition-opacity duration-700 ease-out ${
                mounted ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: '150ms' }}
            >
              Unbeatable Sponti Deals
              <span className="text-primary-500"> Near You</span>
            </h1>

            {/* Urgency badge — live deal count */}
            {stats && stats.totalActive > 0 && (
              <div
                className={`mt-4 inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-4 py-2 transition-opacity duration-700 ease-out ${
                  mounted ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transitionDelay: '225ms' }}
              >
                <span className="flex items-center gap-1.5 text-sm text-white/90 font-medium">
                  <Flame className="w-4 h-4 text-primary-400 animate-pulse" />
                  {stats.totalActive} deals live now
                </span>
                {stats.expiringSoon > 0 && (
                  <>
                    <span className="w-px h-4 bg-white/20" />
                    <span className="flex items-center gap-1.5 text-sm text-yellow-300/90 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {stats.expiringSoon} expiring in &lt; 2hrs
                    </span>
                  </>
                )}
              </div>
            )}

            <p
              className={`mt-4 sm:mt-6 text-base sm:text-lg text-gray-300 max-w-xl mx-auto md:mx-0 leading-relaxed transition-opacity duration-700 ease-out ${
                mounted ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: '300ms' }}
            >
              Discover 24-hour spontaneous deals from local businesses. Exclusive discounts that won&apos;t wait — save big before the countdown hits zero.
            </p>

            {/* Search Autocomplete */}
            <div
              className={`mt-8 transition-opacity duration-700 ease-out ${
                mounted ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: '450ms' }}
            >
              <SearchAutocomplete variant="hero" />
            </div>

            {/* Quick category links */}
            <div
              className={`mt-6 flex flex-wrap gap-2 justify-center md:justify-start transition-opacity duration-700 ease-out ${
                mounted ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: '600ms' }}
            >
              {['Restaurants', 'Spa & Beauty', 'Fitness', 'Entertainment', 'Shopping'].map(cat => (
                <button
                  key={cat}
                  onClick={() => router.push(`/deals?category=${cat.toLowerCase().replace(/ & /g, '-')}`)}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-white/20 transition-all duration-200 hover:-translate-y-0.5"
                >
                  {cat}
                </button>
              ))}
              <button
                onClick={() => router.push('/deals')}
                className="text-primary-400 font-semibold inline-flex items-center gap-1 px-3 py-1.5 text-xs hover:text-primary-300 transition-colors"
              >
                All Deals <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Trust indicators */}
            <div
              className={`mt-8 flex flex-wrap items-center gap-4 sm:gap-6 justify-center md:justify-start transition-opacity duration-700 ease-out ${
                mounted ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: '750ms' }}
            >
              <div className="flex items-center gap-1.5 text-white/60 text-xs">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span>Verified Businesses</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/60 text-xs">
                <Users className="w-4 h-4 text-blue-400" />
                <span>50,000+ Users</span>
              </div>
              <div className="flex items-center gap-1 text-white/60 text-xs">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <span className="ml-1">4.9 Rating</span>
              </div>
            </div>
          </div>

          {/* Right Side: Image Accordion */}
          <div
            className={`w-full md:w-1/2 hidden md:block transition-opacity duration-1000 ease-out ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            <LandingAccordionItem />
          </div>
        </div>
      </div>
    </section>
  );
}
