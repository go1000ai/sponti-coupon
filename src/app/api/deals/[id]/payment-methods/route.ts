import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/deals/[id]/payment-methods
// Returns all active vendor payment methods + Stripe Connect status for the deal page
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
    return NextResponse.json({ methods: [], has_stripe_connect: false });
  }

  // Check Stripe Connect status on the vendor record
  const { data: vendor } = await supabase
    .from('vendors')
    .select('stripe_connect_account_id, stripe_connect_charges_enabled')
    .eq('id', deal.vendor_id)
    .single();

  const hasStripeConnect = !!(
    vendor?.stripe_connect_account_id &&
    vendor?.stripe_connect_charges_enabled
  );

  // Fetch all active payment methods for this vendor
  const { data: methods } = await supabase
    .from('vendor_payment_methods')
    .select('processor_type, display_name, payment_tier')
    .eq('vendor_id', deal.vendor_id)
    .eq('is_active', true)
    .order('is_primary', { ascending: false });

  return NextResponse.json({
    methods: methods || [],
    has_stripe_connect: hasStripeConnect,
  });
}
