import { MetadataRoute } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                            lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/deals`,                 lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE_URL}/pricing`,               lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE_URL}/how-it-works`,          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/about`,                 lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/faq`,                   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/roi`,                   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contact`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/auth/signup`,           lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/auth/signup?type=vendor`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/auth/login`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    // Legal pages (lower priority but crawlable)
    { url: `${BASE_URL}/terms`,                 lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/vendor-terms`,          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/loyalty-terms`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE_URL}/dispute-policy`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/dmca-policy`,           lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE_URL}/accessibility`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE_URL}/cookies`,               lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
  ];

  // Dynamic deal pages
  let dealPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createServiceRoleClient();
    const { data: deals } = await supabase
      .from('deals')
      .select('id, slug, created_at, expires_at')
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(500);

    if (deals) {
      dealPages = deals.map((deal) => ({
        url: `${BASE_URL}/deals/${deal.slug || deal.id}`,
        lastModified: new Date(deal.created_at),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));
    }
  } catch {
    // Silently fail — static pages will still be in the sitemap
  }

  return [...staticPages, ...dealPages];
}
