import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/reviews
 * List all reviews with customer name, vendor name, deal title.
 * Supports: search, rating query params.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const rating = searchParams.get('rating') || '';

    // Fetch all reviews with joined customer, vendor, and deal data
    let query = serviceClient
      .from('reviews')
      .select(`
        id,
        vendor_id,
        customer_id,
        deal_id,
        claim_id,
        rating,
        comment,
        reply,
        auto_response_scheduled_at,
        auto_response_sent_at,
        verified,
        created_at,
        customer:customers(first_name, last_name),
        vendor:vendors(business_name),
        deal:deals(title)
      `)
      .order('created_at', { ascending: false });

    // Apply rating filter at DB level
    if (rating && rating !== 'all') {
      const ratingNum = parseInt(rating, 10);
      if (ratingNum >= 1 && ratingNum <= 5) {
        query = query.eq('rating', ratingNum);
      }
    }

    const { data: rawReviews, error } = await query;

    if (error) {
      console.error('[GET /api/admin/reviews] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    if (!rawReviews || rawReviews.length === 0) {
      return NextResponse.json({ reviews: [] });
    }

    // Map raw data to typed rows
    interface ReviewRow {
      id: string;
      vendor_id: string;
      customer_id: string;
      deal_id: string;
      claim_id: string | null;
      rating: number;
      comment: string | null;
      reply: string | null;
      auto_response_scheduled_at: string | null;
      auto_response_sent_at: string | null;
      verified: boolean;
      created_at: string;
      customer_name: string;
      vendor_name: string;
      deal_title: string;
    }

    let reviews: ReviewRow[] = rawReviews.map((review: Record<string, unknown>) => {
      const customer = review.customer as { first_name: string | null; last_name: string | null } | null;
      const vendor = review.vendor as { business_name: string } | null;
      const deal = review.deal as { title: string } | null;

      return {
        id: review.id as string,
        vendor_id: review.vendor_id as string,
        customer_id: review.customer_id as string,
        deal_id: review.deal_id as string,
        claim_id: review.claim_id as string | null,
        rating: review.rating as number,
        comment: review.comment as string | null,
        reply: review.reply as string | null,
        auto_response_scheduled_at: review.auto_response_scheduled_at as string | null,
        auto_response_sent_at: review.auto_response_sent_at as string | null,
        verified: review.verified as boolean,
        created_at: review.created_at as string,
        customer_name: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Unknown',
        vendor_name: vendor?.business_name || 'Unknown Vendor',
        deal_title: deal?.title || 'Unknown Deal',
      };
    });

    // Apply search filter (customer name, vendor name, deal title)
    if (search) {
      reviews = reviews.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(search) ||
          r.vendor_name.toLowerCase().includes(search) ||
          r.deal_title.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('[GET /api/admin/reviews] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
