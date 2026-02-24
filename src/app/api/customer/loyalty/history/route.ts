import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/customer/loyalty/history — Transaction history for logged-in customer
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
  const offset = (page - 1) * limit;
  const programId = searchParams.get('program_id');

  const serviceClient = await createServiceRoleClient();

  let query = serviceClient
    .from('loyalty_transactions')
    .select('*, vendor:vendors(business_name, logo_url)', { count: 'exact' })
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (programId) {
    // Filter transactions by card's program
    const { data: card } = await serviceClient
      .from('loyalty_cards')
      .select('id')
      .eq('customer_id', user.id)
      .eq('program_id', programId)
      .single();

    if (card) {
      query = query.eq('card_id', card.id);
    }
  }

  const { data: transactions, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    transactions: transactions || [],
    total: count || 0,
    page,
    limit,
  });
}
