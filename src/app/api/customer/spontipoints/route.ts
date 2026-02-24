import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// GET /api/customer/spontipoints — Get balance, recent transactions, available credit
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();

  // Get current balance (non-expired points)
  const { data: balance } = await serviceClient
    .rpc('get_spontipoints_balance', { p_user_id: user.id });

  // Get recent ledger entries (last 50)
  const { data: transactions } = await serviceClient
    .from('spontipoints_ledger')
    .select(`
      *,
      deal:deals(title),
      vendor:vendors(business_name, logo_url)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get total lifetime earned
  const { data: lifetimeEarned } = await serviceClient
    .from('spontipoints_ledger')
    .select('points')
    .eq('user_id', user.id)
    .gt('points', 0);

  const totalEarned = (lifetimeEarned || []).reduce((sum, t) => sum + t.points, 0);

  // Get total redeemed
  const { data: redemptions } = await serviceClient
    .from('spontipoints_redemptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const totalRedeemed = (redemptions || []).reduce((sum, r) => sum + r.points_used, 0);
  const totalCreditEarned = (redemptions || []).reduce((sum, r) => sum + r.credit_amount, 0);

  // Calculate available credit (100 pts = $1, minimum 500 pts to redeem)
  const currentBalance = balance || 0;
  const canRedeem = currentBalance >= 500;
  const maxCredit = Math.floor(currentBalance / 100);

  return NextResponse.json({
    balance: currentBalance,
    total_earned: totalEarned,
    total_redeemed: totalRedeemed,
    total_credit_earned: totalCreditEarned,
    can_redeem: canRedeem,
    max_credit: maxCredit,
    min_redeem_points: 500,
    points_per_dollar: 100,
    transactions: transactions || [],
    redemptions: redemptions || [],
  });
}
