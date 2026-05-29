import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

const PROMO_CODE = 'FOUNDING15';
const MAX_USES = 15;

export async function GET() {
  const supabase = await createServiceRoleClient();
  const { count } = await supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true })
    .eq('promo_code', PROMO_CODE);

  const used = count ?? 0;
  return NextResponse.json({
    promoCode: PROMO_CODE,
    used,
    max: MAX_USES,
    remaining: Math.max(0, MAX_USES - used),
    full: used >= MAX_USES,
  });
}
