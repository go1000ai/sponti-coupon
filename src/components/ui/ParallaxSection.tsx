'use client';

import { useParallax } from '@/lib/hooks/useParallax';

interface ParallaxSectionProps {
  imageUrl: string;
  speed?: number;
  overlay?: string;
  children: React.ReactNode;
  className?: string;
}

export function ParallaxSection({
  imageUrl,
  speed = 0.5,
  overlay = 'bg-secondary-500/80',
  children,
  className = '',
}: ParallaxSectionProps) {
  const parallaxRef = useParallax(speed);

  return (
    <section className={`relative overflow-hidden ${className}`}>
      <div
        ref={parallaxRef}
        className="absolute inset-0 -top-[40%] -bottom-[40%] bg-cover bg-center will-change-transform"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className={`absolute inset-0 ${overlay}`} />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
