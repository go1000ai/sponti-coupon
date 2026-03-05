'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import type { Deal } from '@/lib/types/database';

interface DealTranslation {
  title?: string;
  description?: string;
  how_it_works?: string;
  fine_print?: string;
  terms_and_conditions?: string;
  highlights?: string[];
  amenities?: string[];
}

// In-memory cache to avoid refetching on re-renders and locale toggles
const translationCache = new Map<string, DealTranslation>();

/**
 * Hook that returns a deal with translated content when locale is non-English.
 * Shows original content immediately, then swaps in translated text.
 * Accepts Deal | null for pages that load deals asynchronously.
 */
export function useTranslatedDeal<T extends Deal | null>(deal: T): T {
  const { locale } = useLanguage();
  const [translation, setTranslation] = useState<DealTranslation | null>(null);
  const fetchedRef = useRef<string>('');

  useEffect(() => {
    if (locale === 'en' || !deal?.id) {
      setTranslation(null);
      return;
    }

    const cacheKey = `${deal.id}:${locale}`;

    // Check memory cache
    const cached = translationCache.get(cacheKey);
    if (cached) {
      setTranslation(cached);
      return;
    }

    // Avoid duplicate fetches
    if (fetchedRef.current === cacheKey) return;
    fetchedRef.current = cacheKey;

    fetch('/api/translate/deal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: deal.id, locale }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.translation) {
          translationCache.set(cacheKey, data.translation);
          setTranslation(data.translation);
        }
      })
      .catch(err => {
        console.error('Translation fetch error:', err);
        fetchedRef.current = ''; // allow retry
      });
  }, [deal?.id, locale]);

  if (!deal || locale === 'en' || !translation) return deal;

  // Overlay translated fields on the deal object
  return {
    ...deal,
    ...(translation.title && { title: translation.title }),
    ...(translation.description && { description: translation.description }),
    ...(translation.how_it_works && { how_it_works: translation.how_it_works }),
    ...(translation.fine_print && { fine_print: translation.fine_print }),
    ...(translation.terms_and_conditions && { terms_and_conditions: translation.terms_and_conditions }),
    ...(translation.highlights?.length && { highlights: translation.highlights }),
    ...(translation.amenities?.length && { amenities: translation.amenities }),
  } as T;
}

/**
 * Hook for batch translating multiple deals (e.g., listing pages).
 * Returns the same array with translated content overlaid.
 */
export function useTranslatedDeals(deals: Deal[]): Deal[] {
  const { locale } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, DealTranslation>>({});
  const fetchedRef = useRef<string>('');

  useEffect(() => {
    if (locale === 'en' || !deals.length) {
      setTranslations({});
      return;
    }

    const dealIds = deals.map(d => d.id);
    const batchKey = `${dealIds.join(',')}:${locale}`;

    // Check if all are already cached in memory
    const allCached: Record<string, DealTranslation> = {};
    let allHit = true;
    for (const id of dealIds) {
      const cached = translationCache.get(`${id}:${locale}`);
      if (cached) {
        allCached[id] = cached;
      } else {
        allHit = false;
      }
    }

    if (allHit) {
      setTranslations(allCached);
      return;
    }

    // Avoid duplicate fetches for same batch
    if (fetchedRef.current === batchKey) return;
    fetchedRef.current = batchKey;

    // Start with whatever we have cached
    if (Object.keys(allCached).length > 0) {
      setTranslations(allCached);
    }

    // Only request uncached ones
    const uncachedIds = dealIds.filter(id => !translationCache.has(`${id}:${locale}`));

    fetch('/api/translate/deal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealIds: uncachedIds, locale }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.translations) {
          const merged = { ...allCached };
          for (const [id, t] of Object.entries(data.translations)) {
            translationCache.set(`${id}:${locale}`, t as DealTranslation);
            merged[id] = t as DealTranslation;
          }
          setTranslations(merged);
        }
      })
      .catch(err => {
        console.error('Batch translation error:', err);
        fetchedRef.current = ''; // allow retry
      });
  }, [deals.map(d => d.id).join(','), locale]);

  if (locale === 'en' || Object.keys(translations).length === 0) return deals;

  return deals.map(deal => {
    const t = translations[deal.id];
    if (!t) return deal;
    return {
      ...deal,
      ...(t.title && { title: t.title }),
      ...(t.description && { description: t.description }),
      ...(t.how_it_works && { how_it_works: t.how_it_works }),
      ...(t.fine_print && { fine_print: t.fine_print }),
      ...(t.terms_and_conditions && { terms_and_conditions: t.terms_and_conditions }),
      ...(t.highlights?.length && { highlights: t.highlights }),
      ...(t.amenities?.length && { amenities: t.amenities }),
    };
  });
}
