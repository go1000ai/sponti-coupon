import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getMerchantStatus } from '@/lib/paypal';

// GET /api/paypal/connect/callback
// Called when vendor returns from PayPal onboarding.
// Query params: merchantId, merchantIdInPayPal, permissionsGranted, accountStatus, consentStatus
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const merchantIdInPayPal = searchParams.get('merchantIdInPayPal');
  const permissionsGranted = searchParams.get('permissionsGranted');
  const consentStatus = searchParams.get('consentStatus');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Verify the vendor is logged in
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/auth/login?redirect=/vendor/payments`);
  }

  if (!merchantIdInPayPal || permissionsGranted !== 'true') {
    console.error('[PayPal Connect] Callback missing params or permissions denied:', {
      merchantIdInPayPal,
      permissionsGranted,
      consentStatus,
    });
    return NextResponse.redirect(
      `${appUrl}/vendor/payments?connect_error=paypal_permissions_denied`
    );
  }

  try {
    // Check merchant integration status
    const status = await getMerchantStatus(merchantIdInPayPal);
    const chargesEnabled = status.payments_receivable && status.primary_email_confirmed;

    const serviceClient = await createServiceRoleClient();

    // Update vendor with PayPal connection info
    await serviceClient
      .from('vendors')
      .update({
        paypal_connect_merchant_id: merchantIdInPayPal,
        paypal_connect_onboarding_complete: true,
        paypal_connect_charges_enabled: chargesEnabled,
      })
      .eq('id', user.id);

    // Create or update integrated PayPal payment method
    const { data: existing } = await serviceClient
      .from('vendor_payment_methods')
      .select('id')
      .eq('vendor_id', user.id)
      .eq('processor_type', 'paypal')
      .eq('payment_tier', 'integrated')
      .maybeSingle();

    if (!existing) {
      // Demote existing primary methods
      await serviceClient
        .from('vendor_payment_methods')
        .update({ is_primary: false })
        .eq('vendor_id', user.id)
        .eq('is_primary', true);

      // Create the integrated PayPal payment method as primary
      await serviceClient
        .from('vendor_payment_methods')
        .insert({
          vendor_id: user.id,
          processor_type: 'paypal',
          payment_link: `paypal_connect:${merchantIdInPayPal}`,
          display_name: 'PayPal (Integrated)',
          is_primary: true,
          is_active: true,
          payment_tier: 'integrated',
        });
    } else {
      await serviceClient
        .from('vendor_payment_methods')
        .update({
          payment_link: `paypal_connect:${merchantIdInPayPal}`,
          is_active: true,
        })
        .eq('id', existing.id);
    }

    return NextResponse.redirect(
      `${appUrl}/vendor/payments?paypal_connect_success=true`
    );
  } catch (error) {
    console.error('[PayPal Connect] Callback error:', error);
    return NextResponse.redirect(
      `${appUrl}/vendor/payments?connect_error=paypal_callback_failed`
    );
  }
}
