'use client';

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import type { Deal } from '@/lib/types/database';

const DealsMapInner = dynamic(() => import('./DealsMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] sm:h-[600px] bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center">
      <div className="text-center">
        <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

interface DealsMapProps {
  deals: Deal[];
  userLocation?: { lat: number; lng: number } | null;
}

export function DealsMap({ deals, userLocation }: DealsMapProps) {
  return <DealsMapInner deals={deals} userLocation={userLocation} />;
}
