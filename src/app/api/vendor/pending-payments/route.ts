import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/vendor/pending-payments
// Returns claims on this vendor's deals where deposit not yet confirmed (manual tier)
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: claims, error } = await supabase
    .from('claims')
    .select('*, deal:deals(title, deal_price, deposit_amount, vendor_id), customer:customers(email, first_name, last_name)')
    .eq('deposit_confirmed', false)
    .eq('deal.vendor_id', user.id)
    .in('payment_tier', ['manual'])
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    // Fallback: if the filter-on-join fails, query differently
    const { data: vendorDeals } = await supabase
      .from('deals')
      .select('id')
      .eq('vendor_id', user.id);

    if (!vendorDeals || vendorDeals.length === 0) {
      return NextResponse.json({ claims: [] });
    }

    const dealIds = vendorDeals.map(d => d.id);

    const { data: fallbackClaims, error: fallbackError } = await supabase
      .from('claims')
      .select('*, deal:deals(title, deal_price, deposit_amount), customer:customers(email, first_name, last_name)')
      .eq('deposit_confirmed', false)
      .eq('payment_tier', 'manual')
      .in('deal_id', dealIds)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }

    return NextResponse.json({ claims: fallbackClaims || [] });
  }

  // Filter out claims whose deal doesn't belong to the vendor (join filter may not work with PostgREST)
  const filtered = (claims || []).filter(c => c.deal?.vendor_id === user.id);

  return NextResponse.json({ claims: filtered });
}
