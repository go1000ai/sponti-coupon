import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/deals/[id]/payment-methods
// Returns vendor's "accepted at location" payment methods (manual tier) for display on deal page
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params;
  const supabase = await createServerSupabaseClient();

  // Get the vendor_id from the deal
  const { data: deal } = await supabase
    .from('deals')
    .select('vendor_id')
    .eq('id', dealId)
    .single();

  if (!deal) {
    return NextResponse.json({ methods: [] });
  }

  // Fetch only manual (at-location) payment methods
  const { data: methods } = await supabase
    .from('vendor_payment_methods')
    .select('processor_type, display_name')
    .eq('vendor_id', deal.vendor_id)
    .eq('payment_tier', 'manual')
    .eq('is_active', true);

  return NextResponse.json({ methods: methods || [] });
}
