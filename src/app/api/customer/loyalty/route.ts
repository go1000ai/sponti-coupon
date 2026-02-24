import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/customer/loyalty — List all loyalty cards for the logged-in customer
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();

  const { data: cards, error } = await serviceClient
    .from('loyalty_cards')
    .select(`
      *,
      program:loyalty_programs(*),
      vendor:vendors(business_name, logo_url, category)
    `)
    .eq('customer_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // For points programs, also fetch available rewards
  const programIds = Array.from(new Set((cards || [])
    .filter(c => c.program?.program_type === 'points')
    .map(c => c.program_id)));

  let rewards: Record<string, unknown[]> = {};
  if (programIds.length > 0) {
    const { data: allRewards } = await serviceClient
      .from('loyalty_rewards')
      .select('*')
      .in('program_id', programIds)
      .eq('is_active', true)
      .order('points_cost', { ascending: true });

    if (allRewards) {
      rewards = allRewards.reduce((acc, r) => {
        if (!acc[r.program_id]) acc[r.program_id] = [];
        acc[r.program_id].push(r);
        return acc;
      }, {} as Record<string, unknown[]>);
    }
  }

  // Attach rewards to each card
  const cardsWithRewards = (cards || []).map(card => ({
    ...card,
    available_rewards: rewards[card.program_id] || [],
  }));

  return NextResponse.json({ cards: cardsWithRewards });
}
