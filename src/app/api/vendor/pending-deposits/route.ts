import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/vendor/pending-deposits
// External-merchant deposits a customer reported paying but the vendor hasn't verified yet.
// The vendor matches each against their own merchant account (by reference code + amount)
// and confirms via /api/vendor/verify-deposit.
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();
  const { data, error } = await serviceClient
    .from('claims')
    .select('id, payment_reference, payment_method_type, deposit_reported_at, redeemed, deposit_amount_paid, deal:deals!inner(title, vendor_id, deal_price, deposit_amount), customer:customers(first_name, last_name, email)')
    .eq('deal.vendor_id', user.id)
    .eq('payment_tier', 'link')
    .not('deposit_reported_at', 'is', null)
    .is('deposit_verified_at', null)
    .order('deposit_reported_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deposits = (data || []).map((c: any) => ({
    claim_id: c.id,
    deal_title: c.deal?.title,
    deposit_amount: c.deposit_amount_paid ?? c.deal?.deposit_amount ?? 0,
    payment_reference: c.payment_reference,
    processor: c.payment_method_type,
    reported_at: c.deposit_reported_at,
    redeemed: c.redeemed,
    customer_name: [c.customer?.first_name, c.customer?.last_name].filter(Boolean).join(' ')
      || c.customer?.email?.split('@')[0] || 'Customer',
    customer_email: c.customer?.email || null,
  }));

  return NextResponse.json({ deposits });
}
