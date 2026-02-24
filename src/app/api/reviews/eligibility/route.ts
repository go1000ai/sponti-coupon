import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// GET /api/reviews/eligibility?vendor_id=...&deal_id=...
// Returns review eligibility status for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ can_review: false });
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendor_id');
    const dealId = searchParams.get('deal_id');

    if (!vendorId) {
      return NextResponse.json({ error: 'vendor_id required' }, { status: 400 });
    }

    // Check if user already reviewed this deal
    if (dealId) {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('customer_id', user.id)
        .eq('deal_id', dealId)
        .single();

      if (existingReview) {
        return NextResponse.json({ can_review: false, has_reviewed: true });
      }
    }

    // Check if user has a redeemed claim for this deal/vendor
    let claimQuery = supabase
      .from('claims')
      .select('redeemed_at')
      .eq('customer_id', user.id)
      .eq('redeemed', true)
      .not('redeemed_at', 'is', null)
      .order('redeemed_at', { ascending: false })
      .limit(1);

    if (dealId) {
      claimQuery = claimQuery.eq('deal_id', dealId);
    }

    const { data: claims } = await claimQuery;

    if (!claims || claims.length === 0) {
      // No redeemed claim found
      return NextResponse.json({ can_review: false, has_redeemed: false });
    }

    const redeemedAt = new Date(claims[0].redeemed_at!).getTime();
    const hoursSince = (Date.now() - redeemedAt) / (1000 * 60 * 60);

    if (hoursSince < 24) {
      // Still within the 24-hour wait period
      return NextResponse.json({
        can_review: false,
        has_redeemed: true,
        wait_hours: 24 - hoursSince,
      });
    }

    // All checks passed
    return NextResponse.json({ can_review: true, has_redeemed: true });
  } catch (error) {
    console.error('[GET /api/reviews/eligibility] Error:', error);
    return NextResponse.json({ can_review: false });
  }
}
