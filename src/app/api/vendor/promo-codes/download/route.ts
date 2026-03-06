import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

function escapeCell(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// GET /api/vendor/promo-codes/download?deal_id=xxx — CSV download of promo codes
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dealId = request.nextUrl.searchParams.get('deal_id');
  if (!dealId) return NextResponse.json({ error: 'deal_id required' }, { status: 400 });

  // Verify vendor owns this deal
  const { data: deal } = await supabase
    .from('deals')
    .select('id, vendor_id, title')
    .eq('id', dealId)
    .eq('vendor_id', user.id)
    .single();

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

  const adminClient = await createServiceRoleClient();
  const { data: codes } = await adminClient
    .from('deal_promo_codes')
    .select('code, claim_id, created_at')
    .eq('deal_id', dealId)
    .order('created_at');

  if (!codes || codes.length === 0) {
    return NextResponse.json({ error: 'No promo codes found' }, { status: 404 });
  }

  // Build CSV
  const rows = [['Code', 'Status', 'Created At']];
  for (const code of codes) {
    rows.push([
      escapeCell(code.code),
      code.claim_id ? 'Claimed' : 'Available',
      escapeCell(new Date(code.created_at).toISOString()),
    ]);
  }

  const csv = rows.map(r => r.join(',')).join('\n');
  const filename = `promo-codes-${(deal.title || 'deal').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
