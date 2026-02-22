import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/deals/stats - Lightweight stats for urgency badges
export async function GET() {
  const supabase = await createServiceRoleClient();
  const now = new Date().toISOString();
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  try {
    // Total active deals
    const { count: totalActive } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('expires_at', now);

    // Deals expiring in < 2 hours
    const { count: expiringSoon } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('expires_at', now)
      .lte('expires_at', twoHoursFromNow);

    // Claims made today
    const { count: claimedToday } = await supabase
      .from('deal_claims')
      .select('*', { count: 'exact', head: true })
      .gte('claimed_at', startOfToday.toISOString());

    // Total saved this week (sum of savings from redeemed claims)
    const { data: weekClaims } = await supabase
      .from('deal_claims')
      .select('deal:deals(original_price, deal_price)')
      .eq('status', 'redeemed')
      .gte('claimed_at', startOfWeek.toISOString());

    const totalSavedThisWeek = (weekClaims || []).reduce((sum, claim) => {
      const deal = claim.deal as unknown as { original_price: number; deal_price: number } | null;
      if (deal) {
        return sum + (deal.original_price - deal.deal_price);
      }
      return sum;
    }, 0);

    return NextResponse.json({
      totalActive: totalActive || 0,
      expiringSoon: expiringSoon || 0,
      claimedToday: claimedToday || 0,
      totalSavedThisWeek: Math.round(totalSavedThisWeek),
    });
  } catch {
    // Return sensible defaults on error
    return NextResponse.json({
      totalActive: 0,
      expiringSoon: 0,
      claimedToday: 0,
      totalSavedThisWeek: 0,
    });
  }
}
