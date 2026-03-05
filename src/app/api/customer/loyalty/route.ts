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

  // Attach rewards and grace period info to each card
  const now = new Date();
  const cardsWithRewards = (cards || []).map(card => {
    const expiresAt = card.program?.expires_at;
    let graceInfo = {};
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      const graceEnd = new Date(expiryDate);
      graceEnd.setDate(graceEnd.getDate() + 30);
      const isExpired = expiryDate < now;
      const isInGracePeriod = isExpired && graceEnd > now;
      const isGraceExpired = now > graceEnd;
      graceInfo = {
        is_expired: isExpired,
        is_in_grace_period: isInGracePeriod,
        is_grace_expired: isGraceExpired,
        grace_period_end: isExpired ? graceEnd.toISOString() : null,
      };
    }
    return {
      ...card,
      available_rewards: rewards[card.program_id] || [],
      ...graceInfo,
    };
  });

  return NextResponse.json({ cards: cardsWithRewards });
}
