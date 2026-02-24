import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sponticoupon.com';

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = await createServiceRoleClient();
    const { data: deal } = await supabase
      .from('deals')
      .select('*, vendor:vendors(business_name, city, state, category)')
      .eq('id', id)
      .single();

    if (!deal) {
      return {
        title: 'Deal Not Found',
        description: 'This deal may have expired or been removed.',
      };
    }

    const discountText = `${Math.round(deal.discount_percentage)}% Off`;
    const isSponti = deal.deal_type === 'sponti_coupon';
    const vendorName = deal.vendor?.business_name || '';
    const location = deal.vendor?.city ? `${deal.vendor.city}, ${deal.vendor.state}` : '';

    const title = `${deal.title} — ${discountText}`;
    const description = deal.description
      ? `${deal.description.substring(0, 140)}${deal.description.length > 140 ? '...' : ''} Save ${discountText} at ${vendorName}${location ? ` in ${location}` : ''}.`
      : `Save ${discountText} at ${vendorName}${location ? ` in ${location}` : ''}. ${isSponti ? '24-hour Sponti Deal — claim before it expires!' : 'Verified local deal on SpontiCoupon.'}`;

    const ogImage = deal.image_url || `${BASE_URL}/og-image.png`;

    return {
      title,
      description,
      alternates: {
        canonical: `${BASE_URL}/deals/${id}`,
      },
      openGraph: {
        title: `${title} | SpontiCoupon`,
        description,
        url: `${BASE_URL}/deals/${id}`,
        type: 'website',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: deal.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | SpontiCoupon`,
        description,
        images: [ogImage],
      },
      robots: {
        index: true,
        follow: true,
        noarchive: true, // Prevent cached expired deals (like Groupon does)
      },
    };
  } catch {
    return {
      title: 'Deal',
      description: 'View this deal on SpontiCoupon.',
    };
  }
}

export default async function DealDetailLayout({
  params,
  children,
}: Props) {
  const { id } = await params;

  // Fetch deal data for JSON-LD (Product/Offer schema for rich results + GEO)
  let jsonLd = null;
  try {
    const supabase = await createServiceRoleClient();
    const { data: deal } = await supabase
      .from('deals')
      .select('*, vendor:vendors(business_name, city, state, address, zip, category, lat, lng)')
      .eq('id', id)
      .single();

    if (deal) {
      const isExpired = new Date(deal.expires_at) < new Date();
      const isSoldOut = deal.max_claims ? deal.claims_count >= deal.max_claims : false;

      // Product + Offer schema — critical for deal rich results
      const productSchema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: deal.title,
        description: deal.description || deal.title,
        image: deal.image_url || `${BASE_URL}/og-image.png`,
        url: `${BASE_URL}/deals/${id}`,
        offers: {
          '@type': 'Offer',
          price: deal.deal_price.toFixed(2),
          priceCurrency: 'USD',
          availability: isExpired || isSoldOut
            ? 'https://schema.org/SoldOut'
            : 'https://schema.org/InStock',
          validThrough: deal.expires_at,
          priceValidUntil: deal.expires_at.split('T')[0],
          seller: deal.vendor
            ? {
                '@type': 'LocalBusiness',
                name: deal.vendor.business_name,
                address: {
                  '@type': 'PostalAddress',
                  streetAddress: deal.vendor.address || '',
                  addressLocality: deal.vendor.city || '',
                  addressRegion: deal.vendor.state || '',
                  postalCode: deal.vendor.zip || '',
                  addressCountry: 'US',
                },
                ...(deal.vendor.lat && deal.vendor.lng
                  ? {
                      geo: {
                        '@type': 'GeoCoordinates',
                        latitude: deal.vendor.lat,
                        longitude: deal.vendor.lng,
                      },
                    }
                  : {}),
              }
            : undefined,
        },
      };

      // BreadcrumbList schema
      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: BASE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Deals',
            item: `${BASE_URL}/deals`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: deal.title,
            item: `${BASE_URL}/deals/${id}`,
          },
        ],
      };

      jsonLd = { productSchema, breadcrumbSchema };
    }
  } catch {
    // Silently fail — page still renders without JSON-LD
  }

  return (
    <>
      {jsonLd && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.productSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.breadcrumbSchema) }}
          />
        </>
      )}
      {children}
    </>
  );
}
