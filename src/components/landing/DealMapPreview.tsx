'use client';

import { useEffect, useState } from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { MapPin, Navigation, ArrowRight, Tag } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { formatPercentage, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import type { Deal } from '@/lib/types/database';

// Fallback pins for when API returns no results
const FALLBACK_PINS = [
  { name: 'Thai Paradise', discount: '50%', type: 'sponti', top: '25%', left: '35%', price: '$24.99' },
  { name: 'Glow Spa', discount: '40%', type: 'regular', top: '40%', left: '55%', price: '$39.99' },
  { name: 'FitZone Gym', discount: '60%', type: 'sponti', top: '55%', left: '30%', price: '$15.00' },
  { name: 'Burger Joint', discount: '30%', type: 'regular', top: '35%', left: '70%', price: '$8.99' },
  { name: 'Zen Yoga', discount: '45%', type: 'sponti', top: '65%', left: '60%', price: '$12.00' },
  { name: 'AutoShine', discount: '35%', type: 'regular', top: '20%', left: '50%', price: '$29.99' },
  { name: 'Bella Nails', discount: '55%', type: 'sponti', top: '50%', left: '45%', price: '$18.00' },
];

interface MapPin {
  id: string;
  name: string;
  discount: string;
  price: string;
  type: string;
  top: string;
  left: string;
  dealId?: string;
}

function dealsToMapPins(deals: Deal[]): MapPin[] {
  // Distribute deals across the map area using a pseudo-random spread
  return deals.slice(0, 8).map((deal, i) => {
    const seed = deal.id.charCodeAt(0) + deal.id.charCodeAt(1);
    const top = 15 + ((seed * 7 + i * 13) % 55);
    const left = 15 + ((seed * 11 + i * 17) % 65);

    return {
      id: deal.id,
      name: deal.vendor?.business_name || deal.title,
      discount: `${formatPercentage(deal.discount_percentage)}`,
      price: formatCurrency(deal.deal_price),
      type: deal.deal_type === 'sponti_coupon' ? 'sponti' : 'regular',
      top: `${top}%`,
      left: `${left}%`,
      dealId: deal.id,
    };
  });
}

export function DealMapPreview() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [activePin, setActivePin] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeals() {
      try {
        const res = await fetch('/api/deals?limit=8');
        const data = await res.json();
        if (data.deals?.length > 0) {
          setPins(dealsToMapPins(data.deals));
        } else {
          setPins(FALLBACK_PINS.map((p, i) => ({ ...p, id: `fallback-${i}` })));
        }
      } catch {
        setPins(FALLBACK_PINS.map((p, i) => ({ ...p, id: `fallback-${i}` })));
      }
    }
    fetchDeals();
  }, []);

  return (
    <section className="py-10 sm:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-full px-5 py-2 mb-3 shadow-sm">
              <Navigation className="w-4 h-4 text-cyan-500" strokeWidth={1.8} />
              <span className="text-sm font-semibold text-cyan-600">Deals Near You</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-secondary-500">
              Discover Local Savings
            </h2>
            <p className="text-gray-500 mt-2 text-base sm:text-lg">
              Hundreds of verified businesses offering deals in your area
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="scale-up">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-100 h-[300px] sm:h-[400px] md:h-[450px] shadow-xl border border-white/50">
            {/* Map-like background pattern */}
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64748b" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Road lines */}
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-300/40" />
            <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-gray-300/40" />
            <div className="absolute top-0 bottom-0 left-1/3 w-[2px] bg-gray-300/30 rotate-12 origin-top" />
            <div className="absolute top-0 bottom-0 right-1/4 w-[2px] bg-gray-300/30 -rotate-6 origin-top" />

            {/* Deal Pins */}
            {pins.map((pin, i) => (
              <div
                key={pin.id}
                className="absolute z-10 group cursor-pointer"
                style={{ top: pin.top, left: pin.left, animationDelay: `${i * 200}ms` }}
                onMouseEnter={() => setActivePin(pin.id)}
                onMouseLeave={() => setActivePin(null)}
                onClick={() => setActivePin(activePin === pin.id ? null : pin.id)}
              >
                <div className="relative animate-bounce-subtle" style={{ animationDelay: `${i * 300}ms` }}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white transition-transform ${
                    pin.type === 'sponti' ? 'bg-primary-500' : 'bg-secondary-500'
                  } ${activePin === pin.id ? 'scale-125' : ''}`}>
                    {pin.type === 'sponti' ? (
                      <SpontiIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    ) : (
                      <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    )}
                  </div>
                  {/* Pin shadow */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/10 rounded-full blur-sm" />

                  {/* Tooltip */}
                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 transition-all duration-200 pointer-events-none ${
                    activePin === pin.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                  }`}>
                    <div className="bg-white rounded-lg shadow-xl px-3 py-2.5 whitespace-nowrap border border-gray-100">
                      <p className="text-xs font-bold text-secondary-500">{pin.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-primary-500 font-semibold">{pin.discount} OFF</p>
                        <p className="text-[10px] text-gray-500 font-medium">{pin.price}</p>
                      </div>
                      {pin.dealId && (
                        <Link
                          href={`/deals/${pin.dealId}`}
                          className="block text-[10px] text-primary-500 font-medium mt-1 hover:underline pointer-events-auto"
                        >
                          View Deal →
                        </Link>
                      )}
                    </div>
                    <div className="w-2 h-2 bg-white rotate-45 mx-auto -mt-1 shadow border-r border-b border-gray-100" />
                  </div>
                </div>
              </div>
            ))}

            {/* "You are here" marker */}
            <div className="absolute top-[45%] left-[48%] z-20">
              <div className="w-4 h-4 bg-blue-500 rounded-full ring-4 ring-blue-200 ring-opacity-50 animate-ping" />
              <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full ring-4 ring-blue-200" />
            </div>

            {/* Deal count badge */}
            <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md">
              <span className="text-xs font-semibold text-secondary-500">
                {pins.length} deals nearby
              </span>
            </div>

            {/* Overlay CTA */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/90 to-transparent pt-16 pb-6 px-6 text-center">
              <Link
                href="/deals?view=map"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 hover:scale-105 transition-transform shadow-lg"
              >
                <MapPin className="w-4 h-4" />
                Explore Deals on Map
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
