import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/vendor/deals — Return the authenticated vendor's deals
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 20, 50);

  const { data: deals, error } = await supabase
    .from('deals')
    .select('id, title, deal_type, original_price, deal_price, status')
    .eq('vendor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deals: deals || [] });
}
