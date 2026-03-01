import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/deals/payment-logos?vendor_ids=id1,id2,id3
// Returns a map of vendor_id -> array of processor_type strings
// Used to display payment logos on deal listing cards
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vendorIdsParam = searchParams.get('vendor_ids');

  if (!vendorIdsParam) {
    return NextResponse.json({ logos: {} });
  }

  const vendorIds = vendorIdsParam.split(',').filter(Boolean);
  if (vendorIds.length === 0) {
    return NextResponse.json({ logos: {} });
  }

  const supabase = await createServerSupabaseClient();

  // Fetch all active payment methods for these vendors in one query
  const { data: methods } = await supabase
    .from('vendor_payment_methods')
    .select('vendor_id, processor_type')
    .in('vendor_id', vendorIds)
    .eq('is_active', true);

  // Also check which vendors have Stripe Connect
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id')
    .in('id', vendorIds)
    .not('stripe_connect_account_id', 'is', null)
    .eq('stripe_connect_charges_enabled', true);

  const stripeConnectVendors = new Set((vendors || []).map(v => v.id));

  // Build map: vendor_id -> unique processor types
  const logoMap: Record<string, string[]> = {};

  for (const vendorId of vendorIds) {
    const processors = new Set<string>();

    // Add Stripe if vendor has Stripe Connect
    if (stripeConnectVendors.has(vendorId)) {
      processors.add('stripe');
    }

    // Add all their configured payment methods
    const vendorMethods = (methods || []).filter(m => m.vendor_id === vendorId);
    for (const m of vendorMethods) {
      processors.add(m.processor_type);
    }

    if (processors.size > 0) {
      logoMap[vendorId] = Array.from(processors);
    }
  }

  return NextResponse.json({ logos: logoMap });
}
