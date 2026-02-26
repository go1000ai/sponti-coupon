import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { SubscriptionTier, AutoResponseSettings } from '@/lib/types/database';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import { sanitizeText } from '@/lib/sanitize';

// GET /api/reviews?vendor_id=...&deal_id=...&page=1&limit=10
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const vendorId = searchParams.get('vendor_id');
    const dealId = searchParams.get('deal_id');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('reviews')
      .select('*, customer:customers(first_name, last_name, email), deal:deals(title)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }
    if (dealId) {
      query = query.eq('deal_id', dealId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[GET /api/reviews] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    // Also get average rating for this vendor
    let avgRating = 0;
    let totalReviews = 0;
    if (vendorId) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('avg_rating, total_reviews')
        .eq('id', vendorId)
        .single();
      if (vendor) {
        avgRating = Number(vendor.avg_rating) || 0;
        totalReviews = vendor.total_reviews || 0;
      }
    }

    // Rating distribution
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (vendorId) {
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('vendor_id', vendorId);
      if (allReviews) {
        allReviews.forEach(r => {
          distribution[r.rating] = (distribution[r.rating] || 0) + 1;
        });
      }
    }

    return NextResponse.json({
      reviews: data || [],
      total: count || 0,
      page,
      limit,
      avg_rating: avgRating,
      total_reviews: totalReviews,
      distribution,
    });
  } catch (error) {
    console.error('[GET /api/reviews] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/reviews - Customer creates a review
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a customer
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'customer') {
      return NextResponse.json({ error: 'Only customers can leave reviews' }, { status: 403 });
    }

    const body = await request.json();
    const { vendor_id, deal_id, claim_id, rating, comment } = body;

    if (!vendor_id || !rating) {
      return NextResponse.json({ error: 'vendor_id and rating are required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    // Verify customer has redeemed a deal from this vendor
    const { data: canReview } = await supabase.rpc('can_customer_review', {
      p_customer_id: user.id,
      p_vendor_id: vendor_id,
      p_deal_id: deal_id || null,
    });

    if (!canReview) {
      // Distinguish between "hasn't redeemed" vs "hasn't waited 24h"
      // Check if they have a redeemed claim at all (regardless of time)
      const serviceClient = await createServiceRoleClient();
      const { data: hasRedeemedClaim } = await serviceClient
        .from('claims')
        .select('redeemed_at')
        .eq('customer_id', user.id)
        .eq('redeemed', true)
        .not('redeemed_at', 'is', null)
        .limit(1)
        .single();

      if (hasRedeemedClaim) {
        // They have redeemed but the 24h window hasn't passed yet
        return NextResponse.json(
          { error: 'Please wait 24 hours after redeeming your deal before leaving a review, so you have time to enjoy the experience!', code: 'REVIEW_TOO_EARLY' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'You can only review businesses where you have redeemed a deal' },
        { status: 403 }
      );
    }

    // Check for existing review on this deal
    if (deal_id) {
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('customer_id', user.id)
        .eq('deal_id', deal_id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'You have already reviewed this deal' },
          { status: 409 }
        );
      }
    }

    // Create review
    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        vendor_id,
        customer_id: user.id,
        deal_id: deal_id || null,
        claim_id: claim_id || null,
        rating,
        comment: sanitizeText(comment),
        is_verified: true, // They redeemed a deal, so it's verified
      })
      .select('*, customer:customers(first_name, last_name, email), deal:deals(title)')
      .single();

    if (insertError) {
      console.error('[POST /api/reviews] Insert error:', insertError);
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You have already reviewed this deal' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
    }

    // Schedule auto-response if vendor has it enabled
    try {
      const serviceClient = await createServiceRoleClient();
      const { data: vendorPrefs } = await serviceClient
        .from('vendors')
        .select('notification_preferences, subscription_tier')
        .eq('id', vendor_id)
        .single();

      const autoSettings = (vendorPrefs?.notification_preferences as { auto_response?: AutoResponseSettings } | null)?.auto_response;
      const vendorTier = (vendorPrefs?.subscription_tier as SubscriptionTier) || 'starter';
      const hasTierAccess = SUBSCRIPTION_TIERS[vendorTier].ai_deal_assistant;

      if (autoSettings?.enabled && hasTierAccess && review) {
        await serviceClient
          .from('reviews')
          .update({ auto_response_scheduled_at: new Date().toISOString() })
          .eq('id', review.id);
      }
    } catch (scheduleErr) {
      // Non-critical: don't fail the review creation if scheduling fails
      console.error('[POST /api/reviews] Auto-response scheduling error:', scheduleErr);
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/reviews] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/reviews - Vendor replies to a review or customer updates their review
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const body = await request.json();
    const { review_id, vendor_reply, rating, comment } = body;

    if (!review_id) {
      return NextResponse.json({ error: 'review_id is required' }, { status: 400 });
    }

    // Get the review
    const { data: review } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', review_id)
      .single();

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Vendor replying
    if (profile?.role === 'vendor' && review.vendor_id === user.id && vendor_reply !== undefined) {
      const { data: updated, error: updateError } = await supabase
        .from('reviews')
        .update({
          vendor_reply: sanitizeText(vendor_reply),
          vendor_replied_at: sanitizeText(vendor_reply) ? new Date().toISOString() : null,
        })
        .eq('id', review_id)
        .select('*, customer:customers(first_name, last_name, email), deal:deals(title)')
        .single();

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update reply' }, { status: 500 });
      }
      return NextResponse.json({ review: updated });
    }

    // Customer updating their own review
    if (profile?.role === 'customer' && review.customer_id === user.id) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (rating !== undefined) {
        if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
          return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
        }
        updates.rating = rating;
      }
      if (comment !== undefined) {
        updates.comment = sanitizeText(comment);
      }

      const { data: updated, error: updateError } = await supabase
        .from('reviews')
        .update(updates)
        .eq('id', review_id)
        .select('*, customer:customers(first_name, last_name, email), deal:deals(title)')
        .single();

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
      }
      return NextResponse.json({ review: updated });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('[PATCH /api/reviews] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
