import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/vendor/customers
// Returns all customers who claimed this vendor's deals
// Query params: ?search=name/email, ?deal_id=uuid
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.get('search')?.trim() || '';
  const dealId = request.nextUrl.searchParams.get('deal_id') || '';

  // First get this vendor's deal IDs
  const { data: vendorDeals } = await supabase
    .from('deals')
    .select('id, title')
    .eq('vendor_id', user.id);

  if (!vendorDeals || vendorDeals.length === 0) {
    return NextResponse.json({ customers: [], deals: [] });
  }

  const dealIds = vendorDeals.map(d => d.id);
  const filterDealIds = dealId ? [dealId] : dealIds;

  // Get all claims for these deals with customer info
  const { data: claims, error } = await supabase
    .from('claims')
    .select('id, created_at, redeemed, redeemed_at, expires_at, deal_id, customer_id, deal:deals(id, title), customer:customers(first_name, last_name, email)')
    .in('deal_id', filterDealIds)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by search term (name or email) if provided
  let filtered = claims || [];
  if (search) {
    const lower = search.toLowerCase();
    filtered = filtered.filter(c => {
      const cust = c.customer as { first_name?: string; last_name?: string; email?: string } | null;
      if (!cust) return false;
      const name = `${cust.first_name || ''} ${cust.last_name || ''}`.toLowerCase();
      const email = (cust.email || '').toLowerCase();
      return name.includes(lower) || email.includes(lower);
    });
  }

  // Determine status for each claim
  const now = new Date();
  const customers = filtered.map(c => {
    const cust = c.customer as { first_name?: string; last_name?: string; email?: string } | null;
    const deal = c.deal as { id?: string; title?: string } | null;
    const expired = c.expires_at && new Date(c.expires_at) < now;
    const status = c.redeemed ? 'redeemed' : expired ? 'expired' : 'active';

    return {
      claim_id: c.id,
      customer_name: `${cust?.first_name || ''} ${cust?.last_name || ''}`.trim() || 'Customer',
      customer_email: cust?.email || '',
      deal_title: deal?.title || '',
      deal_ref: deal?.id ? (deal.id as string).slice(0, 8).toUpperCase() : '',
      claimed_at: c.created_at,
      redeemed_at: c.redeemed_at,
      status,
    };
  });

  return NextResponse.json({
    customers,
    deals: vendorDeals.map(d => ({ id: d.id, title: d.title })),
  });
}
