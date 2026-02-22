import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: analytics, error } = await supabase.rpc('get_vendor_analytics', {
    vendor_id_param: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get deal-level analytics
  const { data: deals } = await supabase
    .from('deals')
    .select('id, title, deal_type, claims_count, discount_percentage, deposit_amount, status, created_at')
    .eq('vendor_id', user.id)
    .order('created_at', { ascending: false });

  // Get monthly stats
  const { data: redemptions } = await supabase
    .from('redemptions')
    .select('scanned_at')
    .eq('vendor_id', user.id)
    .gte('scanned_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  return NextResponse.json({
    overview: analytics,
    deals: deals || [],
    recent_redemptions: redemptions?.length || 0,
    period: '30d',
  });
}
