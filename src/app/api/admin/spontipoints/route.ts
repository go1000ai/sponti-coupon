import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/admin/spontipoints — Platform-wide SpontiPoints stats and ledger entries
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const serviceClient = await createServiceRoleClient();

  // Fetch all ledger entries to compute stats and per-user balances
  const { data: allLedger, error: ledgerStatsError } = await serviceClient
    .from('spontipoints_ledger')
    .select('user_id, points, reason');

  if (ledgerStatsError) {
    return NextResponse.json({ error: ledgerStatsError.message }, { status: 500 });
  }

  // Compute platform-wide stats
  // earn_redemption and bonus are positive (issued)
  // adjustment with negative points = deducted
  let totalIssued = 0;
  let totalRedeemed = 0;

  // Also compute per-user balances
  const userBalances: Record<string, number> = {};

  (allLedger || []).forEach((entry: { user_id: string; points: number; reason: string }) => {
    if (entry.reason === 'earn_redemption' || entry.reason === 'bonus') {
      totalIssued += entry.points;
    } else if (entry.reason === 'adjustment' && entry.points < 0) {
      totalRedeemed += Math.abs(entry.points);
    } else if (entry.reason === 'adjustment' && entry.points > 0) {
      totalIssued += entry.points;
    }
    userBalances[entry.user_id] = (userBalances[entry.user_id] || 0) + entry.points;
  });

  const activeBalance = totalIssued - totalRedeemed;

  // Fetch recent 50 ledger entries with vendor info
  const { data: recentLedger, error: recentLedgerError } = await serviceClient
    .from('spontipoints_ledger')
    .select('*, vendor:vendors(business_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (recentLedgerError) {
    return NextResponse.json({ error: recentLedgerError.message }, { status: 500 });
  }

  // Get unique user_ids from ledger to fetch customer names
  const userIds = Array.from(new Set((recentLedger || []).map((e: Record<string, unknown>) => e.user_id as string)));
  let customerMap: Record<string, { first_name: string; last_name: string; email: string }> = {};

  if (userIds.length > 0) {
    const { data: customers } = await serviceClient
      .from('customers')
      .select('id, first_name, last_name, email')
      .in('id', userIds);

    if (customers) {
      customers.forEach((c: { id: string; first_name: string; last_name: string; email: string }) => {
        customerMap[c.id] = { first_name: c.first_name, last_name: c.last_name, email: c.email };
      });
    }
  }

  // Map ledger entries with customer info
  const ledgerWithCustomers = (recentLedger || []).map((entry: Record<string, unknown>) => {
    const customer = customerMap[entry.user_id as string] || null;
    const vendor = entry.vendor as { business_name: string } | null;
    return {
      id: entry.id,
      user_id: entry.user_id,
      vendor_id: entry.vendor_id,
      deal_id: entry.deal_id,
      redemption_id: entry.redemption_id,
      points: entry.points,
      reason: entry.reason,
      expires_at: entry.expires_at,
      created_at: entry.created_at,
      customer_name: customer ? `${customer.first_name} ${customer.last_name}`.trim() : null,
      customer_email: customer?.email || null,
      vendor_name: vendor?.business_name || null,
    };
  });

  return NextResponse.json({
    stats: {
      total_issued: totalIssued,
      total_redeemed: totalRedeemed,
      active_balance: activeBalance,
    },
    ledger: ledgerWithCustomers,
    user_balances: userBalances,
  });
}
