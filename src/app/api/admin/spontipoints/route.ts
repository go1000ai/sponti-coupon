import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/spontipoints — Platform-wide SpontiPoints stats, ledger entries, and redemptions
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();

  // Fetch all ledger entries to compute stats
  const { data: allLedger, error: ledgerStatsError } = await serviceClient
    .from('sponti_points_ledger')
    .select('amount, type');

  if (ledgerStatsError) {
    return NextResponse.json({ error: ledgerStatsError.message }, { status: 500 });
  }

  // Compute platform-wide stats
  let totalIssued = 0;
  let totalRedeemed = 0;

  (allLedger || []).forEach((entry: { amount: number; type: string }) => {
    if (entry.type === 'earned' || entry.type === 'bonus') {
      totalIssued += entry.amount;
    } else if (entry.type === 'redeemed') {
      totalRedeemed += Math.abs(entry.amount);
    }
  });

  const activeBalance = totalIssued - totalRedeemed;

  // Fetch recent 50 ledger entries with user info
  const { data: recentLedger, error: recentLedgerError } = await serviceClient
    .from('sponti_points_ledger')
    .select('*, user:user_profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (recentLedgerError) {
    return NextResponse.json({ error: recentLedgerError.message }, { status: 500 });
  }

  // Fetch recent 50 redemptions with user info
  const { data: redemptions, error: redemptionsError } = await serviceClient
    .from('sponti_points_redemptions')
    .select('*, user:user_profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (redemptionsError) {
    return NextResponse.json({ error: redemptionsError.message }, { status: 500 });
  }

  return NextResponse.json({
    stats: {
      total_issued: totalIssued,
      total_redeemed: totalRedeemed,
      active_balance: activeBalance,
    },
    ledger: recentLedger || [],
    redemptions: redemptions || [],
  });
}
