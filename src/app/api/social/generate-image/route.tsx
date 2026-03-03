import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * GET /api/social/generate-image?deal_id=xxx
 * Generates a branded 1080x1080 social media post image for a deal.
 * Returns a PNG image that can be used directly as a social media post.
 */
export async function GET(request: NextRequest) {
  const dealId = request.nextUrl.searchParams.get('deal_id');

  if (!dealId) {
    return new Response('Missing deal_id', { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  const { data: deal } = await supabase
    .from('deals')
    .select(`
      id, title, description, deal_type, original_price, deal_price,
      discount_percentage, image_url, vendor_id
    `)
    .eq('id', dealId)
    .single();

  if (!deal) {
    return new Response('Deal not found', { status: 404 });
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, city, state, category')
    .eq('id', deal.vendor_id)
    .single();

  const businessName = vendor?.business_name || 'Local Business';
  const location = vendor?.city && vendor?.state ? `${vendor.city}, ${vendor.state}` : '';
  const category = vendor?.category || '';
  const isSponti = deal.deal_type === 'sponti';
  const discountText = deal.discount_percentage
    ? `${deal.discount_percentage}% OFF`
    : deal.deal_price
      ? `$${deal.deal_price}`
      : 'SPECIAL DEAL';
  const originalPrice = deal.original_price ? `$${deal.original_price}` : '';

  // Truncate title if too long
  const title = deal.title.length > 60 ? deal.title.substring(0, 57) + '...' : deal.title;

  // Truncate description
  const desc = deal.description
    ? deal.description.length > 100
      ? deal.description.substring(0, 97) + '...'
      : deal.description
    : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1080px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: 'system-ui, sans-serif',
          overflow: 'hidden',
          backgroundColor: '#111827',
        }}
      >
        {/* Background deal image with overlay */}
        {deal.image_url && (
          <img
            src={deal.image_url}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1080px',
              height: '1080px',
              objectFit: 'cover',
              opacity: 0.3,
            }}
          />
        )}

        {/* Dark gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1080px',
            height: '1080px',
            display: 'flex',
            background: 'linear-gradient(180deg, rgba(17,24,39,0.6) 0%, rgba(17,24,39,0.85) 50%, rgba(17,24,39,0.95) 100%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '60px',
          }}
        >
          {/* Top bar: Logo + Deal type badge */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            {/* Logo text */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: '36px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                }}
              >
                <span style={{ color: '#E8632B' }}>SPONTI</span>
                <span style={{ color: '#29ABE2' }}>COUPON</span>
              </div>
            </div>

            {/* Deal type badge */}
            <div
              style={{
                display: 'flex',
                padding: '10px 28px',
                borderRadius: '40px',
                fontSize: '22px',
                fontWeight: 800,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                background: isSponti ? '#E8632B' : '#29ABE2',
                color: 'white',
              }}
            >
              {isSponti ? 'SPONTI DEAL' : 'STEADY DEAL'}
            </div>
          </div>

          {/* Deal image (centered, rounded) */}
          {deal.image_url && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '36px',
              }}
            >
              <img
                src={deal.image_url}
                style={{
                  width: '400px',
                  height: '400px',
                  borderRadius: '24px',
                  objectFit: 'cover',
                  border: `4px solid ${isSponti ? '#E8632B' : '#29ABE2'}`,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}
              />
            </div>
          )}

          {/* Spacer when no image */}
          {!deal.image_url && (
            <div style={{ display: 'flex', flex: 1 }} />
          )}

          {/* Discount badge */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 40px',
                borderRadius: '16px',
                background: isSponti
                  ? 'linear-gradient(135deg, #E8632B 0%, #F5A623 100%)'
                  : 'linear-gradient(135deg, #29ABE2 0%, #0EA5E9 100%)',
              }}
            >
              {originalPrice && (
                <span
                  style={{
                    fontSize: '32px',
                    color: 'rgba(255,255,255,0.6)',
                    textDecoration: 'line-through',
                    fontWeight: 600,
                  }}
                >
                  {originalPrice}
                </span>
              )}
              <span
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: 'white',
                }}
              >
                {discountText}
              </span>
            </div>
          </div>

          {/* Deal title */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              textAlign: 'center',
              fontSize: '42px',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
              marginBottom: '12px',
            }}
          >
            {title}
          </div>

          {/* Description */}
          {desc && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                textAlign: 'center',
                fontSize: '24px',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.4,
                marginBottom: '20px',
                padding: '0 40px',
              }}
            >
              {desc}
            </div>
          )}

          {/* Bottom: Business info + CTA */}
          <div
            style={{
              display: 'flex',
              marginTop: 'auto',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            {/* Business info */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {businessName}
              </div>
              {location && (
                <div
                  style={{
                    fontSize: '20px',
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: '4px',
                  }}
                >
                  {location}
                  {category ? ` · ${category}` : ''}
                </div>
              )}
            </div>

            {/* CTA */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '12px 32px',
                  borderRadius: '12px',
                  background: '#E8632B',
                  color: 'white',
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                }}
              >
                CLAIM NOW
              </div>
              <div
                style={{
                  fontSize: '18px',
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: '6px',
                }}
              >
                sponticoupon.com
              </div>
            </div>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '1080px',
            height: '6px',
            display: 'flex',
            background: 'linear-gradient(to right, #E8632B, #F5A623, #29ABE2)',
          }}
        />
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  );
}
