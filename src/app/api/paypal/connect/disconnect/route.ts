import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/paypal/connect/disconnect
// Disconnects the vendor's PayPal account.
// Note: PayPal does not have a partner API to revoke permissions programmatically.
// The vendor must manually remove the connection from their PayPal account settings.
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();

  // Clear PayPal connection fields
  await serviceClient
    .from('vendors')
    .update({
      paypal_connect_merchant_id: null,
      paypal_connect_email: null,
      paypal_connect_onboarding_complete: false,
      paypal_connect_charges_enabled: false,
    })
    .eq('id', user.id);

  // Deactivate integrated PayPal payment method
  await serviceClient
    .from('vendor_payment_methods')
    .update({ is_active: false, is_primary: false })
    .eq('vendor_id', user.id)
    .eq('processor_type', 'paypal')
    .eq('payment_tier', 'integrated');

  // Promote next available active method as primary
  const { data: nextMethod } = await serviceClient
    .from('vendor_payment_methods')
    .select('id')
    .eq('vendor_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextMethod) {
    await serviceClient
      .from('vendor_payment_methods')
      .update({ is_primary: true })
      .eq('id', nextMethod.id);
  }

  return NextResponse.json({ success: true });
}
