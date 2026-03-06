import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { generatePromoCodes, insertPromoCodes } from '@/lib/promo-codes';

// GET /api/vendor/promo-codes?deal_id=xxx — Get promo code stats + codes for a deal
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dealId = request.nextUrl.searchParams.get('deal_id');
  if (!dealId) return NextResponse.json({ error: 'deal_id required' }, { status: 400 });

  // Verify vendor owns this deal
  const { data: deal } = await supabase
    .from('deals')
    .select('id, vendor_id')
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

  const total = codes?.length || 0;
  const claimed = codes?.filter(c => c.claim_id).length || 0;
  const available = total - claimed;

  return NextResponse.json({ total, available, claimed, codes: codes || [] });
}

// POST /api/vendor/promo-codes — Generate codes or upload vendor's own codes
// Body: { deal_id, action: 'generate' | 'upload', count?: number, codes?: string[] }
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { deal_id, action, count, codes: uploadedCodes } = body;

  if (!deal_id) return NextResponse.json({ error: 'deal_id required' }, { status: 400 });
  if (!action || !['generate', 'upload'].includes(action)) {
    return NextResponse.json({ error: 'action must be "generate" or "upload"' }, { status: 400 });
  }

  // Verify vendor owns this deal
  const { data: deal } = await supabase
    .from('deals')
    .select('id, vendor_id, max_claims')
    .eq('id', deal_id)
    .eq('vendor_id', user.id)
    .single();

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

  const adminClient = await createServiceRoleClient();
  let newCodes: string[];

  if (action === 'generate') {
    // SpontiCoupon generates codes
    const codeCount = Math.min(Math.max(Number(count) || 10, 1), 500);
    newCodes = generatePromoCodes(codeCount);
  } else {
    // Vendor uploads their own codes
    if (!Array.isArray(uploadedCodes) || uploadedCodes.length === 0) {
      return NextResponse.json({ error: 'codes array required for upload' }, { status: 400 });
    }
    if (uploadedCodes.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 codes per upload' }, { status: 400 });
    }
    // Clean and deduplicate
    const cleaned = uploadedCodes
      .map((c: string) => c?.toString().trim().toUpperCase())
      .filter((c: string) => c && c.length >= 3);
    newCodes = Array.from(new Set(cleaned));
    if (newCodes.length === 0) {
      return NextResponse.json({ error: 'No valid codes provided' }, { status: 400 });
    }
  }

  // Insert codes
  const result = await insertPromoCodes(adminClient, deal_id, newCodes);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Update max_claims to match total code count
  const { count: totalCodes } = await adminClient
    .from('deal_promo_codes')
    .select('id', { count: 'exact', head: true })
    .eq('deal_id', deal_id);

  await adminClient
    .from('deals')
    .update({ max_claims: totalCodes || result.inserted })
    .eq('id', deal_id);

  return NextResponse.json({
    inserted: result.inserted,
    total: totalCodes || result.inserted,
    codes: newCodes,
  });
}
