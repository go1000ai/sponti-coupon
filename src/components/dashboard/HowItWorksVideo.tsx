'use client';

import { useEffect, useState } from 'react';

/**
 * Plays the customer "How SpontiCoupon Works" explainer.
 * Serves the horizontal 16:9 cut on desktop and the vertical 9:16 cut on
 * mobile, picked via matchMedia so only one file is ever downloaded.
 */
export function HowItWorksVideo({ autoPlay = false }: { autoPlay?: boolean }) {
  // Default to desktop for SSR; corrected on mount.
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    setReady(true);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const src = isMobile ? '/videos/how-it-works-mobile.mp4' : '/videos/how-it-works-desktop.mp4';
  const poster = isMobile ? '/videos/how-it-works-mobile-thumb.jpg' : '/videos/how-it-works-desktop-thumb.jpg';

  return (
    <div
      className={`relative mx-auto w-full overflow-hidden rounded-2xl bg-black shadow-lg ${
        isMobile ? 'max-w-sm aspect-[9/16]' : 'aspect-video'
      }`}
    >
      {ready && (
        <video
          // key forces a clean reload when the source switches on resize
          key={src}
          src={src}
          poster={poster}
          controls
          playsInline
          autoPlay={autoPlay}
          muted={autoPlay}
          preload="metadata"
          className="absolute inset-0 h-full w-full"
        />
      )}
    </div>
  );
}
