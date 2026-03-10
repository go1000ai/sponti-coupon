import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { captureOrder } from '@/lib/paypal';
import { generateQRCodeId, getRedemptionUrl, generateUniqueRedemptionCode } from '@/lib/qr';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET /api/paypal/capture?token=ORDER_ID&PayerID=xxx
// PayPal redirects the customer here after they approve payment.
// Unlike Stripe/Square, PayPal requires an explicit capture step.
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('token');

  if (!orderId) {
    return NextResponse.redirect(`${APP_URL}/vendor/scan?paypal_error=missing_order`);
  }

  const supabase = await createServiceRoleClient();

  // Find the claim associated with this PayPal order
  const { data: claim } = await supabase
    .from('claims')
    .select('id, deal_id, deposit_confirmed, customer_id')
    .eq('paypal_checkout_order_id', orderId)
    .maybeSingle();

  if (!claim) {
    // This might be a balance collection (not a deposit), check redemptions
    const { data: redemption } = await supabase
      .from('redemptions')
      .select('id, claim_id, claim:claims(deal_id, customer_id)')
      .eq('paypal_order_id', orderId)
      .maybeSingle();

    // For balance collection, find the vendor via the claim
    if (redemption) {
      const claimData = Array.isArray(redemption.claim) ? redemption.claim[0] : redemption.claim;
      if (claimData) {
        const { data: deal } = await supabase
          .from('deals')
          .select('vendor_id')
          .eq('id', claimData.deal_id)
          .single();

        if (deal) {
          const { data: vendor } = await supabase
            .from('vendors')
            .select('paypal_connect_merchant_id')
            .eq('id', deal.vendor_id)
            .single();

          if (vendor?.paypal_connect_merchant_id) {
            try {
              const captured = await captureOrder(orderId, vendor.paypal_connect_merchant_id);
              if (captured.status === 'COMPLETED') {
                await supabase
                  .from('redemptions')
                  .update({
                    collection_completed: true,
                    collection_completed_at: new Date().toISOString(),
                  })
                  .eq('id', redemption.id);
              }
            } catch (err) {
              console.error('[PayPal Capture] Balance capture error:', err);
            }
          }
        }
      }
    }

    return NextResponse.redirect(`${APP_URL}/payment-success?paypal_order=true`);
  }

  // This is a deposit payment — find the vendor
  const { data: deal } = await supabase
    .from('deals')
    .select('vendor_id')
    .eq('id', claim.deal_id)
    .single();

  if (!deal) {
    return NextResponse.redirect(`${APP_URL}/vendor/scan?paypal_error=deal_not_found`);
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('paypal_connect_merchant_id')
    .eq('id', deal.vendor_id)
    .single();

  if (!vendor?.paypal_connect_merchant_id) {
    return NextResponse.redirect(`${APP_URL}/vendor/scan?paypal_error=no_merchant`);
  }

  try {
    const captured = await captureOrder(orderId, vendor.paypal_connect_merchant_id);

    if (captured.status === 'COMPLETED' && !claim.deposit_confirmed) {
      const qrCode = generateQRCodeId();
      const qrCodeUrl = getRedemptionUrl(qrCode);
      const redemptionCode = await generateUniqueRedemptionCode(supabase);

      await supabase
        .from('claims')
        .update({
          deposit_confirmed: true,
          deposit_confirmed_at: new Date().toISOString(),
          qr_code: qrCode,
          qr_code_url: qrCodeUrl,
          redemption_code: redemptionCode,
        })
        .eq('id', claim.id);

      await supabase.rpc('increment_claims_count', { deal_id_param: claim.deal_id });
      console.log('[PayPal Capture] Deposit confirmed for claim:', claim.id);
    }

    return NextResponse.redirect(`${APP_URL}/payment-success?paypal_order=true`);
  } catch (err) {
    console.error('[PayPal Capture] Error:', err);
    return NextResponse.redirect(`${APP_URL}/vendor/scan?paypal_error=capture_failed`);
  }
}
