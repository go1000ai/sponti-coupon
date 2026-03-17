'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function getSessionId(): string {
  const key = 'sc_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function PageViewTracker() {
  const pathname = usePathname();
  const lastTracked = useRef('');

  useEffect(() => {
    // Skip admin pages
    if (pathname.startsWith('/admin')) return;
    // Skip duplicate fires
    if (pathname === lastTracked.current) return;
    lastTracked.current = pathname;

    try {
      const payload = JSON.stringify({
        path: pathname + window.location.search,
        referrer: document.referrer || null,
        session_id: getSessionId(),
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/track', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
      }
    } catch {
      // Tracking should never break the app
    }
  }, [pathname]);

  return null;
}
