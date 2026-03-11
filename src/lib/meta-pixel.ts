/**
 * Meta Pixel helper — fire standard & custom events from client components.
 * Usage: import { trackEvent } from '@/lib/meta-pixel';
 *        trackEvent('Lead');
 *        trackEvent('CompleteRegistration');
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
  }
}
