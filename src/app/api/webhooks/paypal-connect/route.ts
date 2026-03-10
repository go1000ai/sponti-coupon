import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyWebhookSignature, getMerchantStatus } from '@/lib/paypal';
import { generateQRCodeId, getRedemptionUrl, generateUniqueRedemptionCode } from '@/lib/qr';

// POST /api/webhooks/paypal-connect
// Handles PayPal webhook events for connected vendor accounts
export async function POST(request: NextRequest) {
  const body = await request.text();

  // Collect headers needed for verification
  const headers: Record<string, string> = {};
  for (const key of ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time']) {
    const val = request.headers.get(key);
    if (val) headers[key] = val;
  }

  // Verify webhook signature
  const isValid = await verifyWebhookSignature(headers, body);
  if (!isValid) {
    console.error('[PayPal Webhook] Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body);
  const supabase = await createServiceRoleClient();

  switch (event.event_type) {
    case 'MERCHANT.ONBOARDING.COMPLETED': {
      // Vendor completed PayPal onboarding
      const merchantId = event.resource?.merchant_id;
      if (!merchantId) break;

      try {
        const status = await getMerchantStatus(merchantId);
        const chargesEnabled = status.payments_receivable && status.primary_email_confirmed;

        await supabase
          .from('vendors')
          .update({
            paypal_connect_onboarding_complete: true,
            paypal_connect_charges_enabled: chargesEnabled,
          })
          .eq('paypal_connect_merchant_id', merchantId);

        console.log('[PayPal Webhook] Onboarding complete for merchant:', merchantId, { chargesEnabled });
      } catch (err) {
        console.error('[PayPal Webhook] Merchant status check error:', err);
      }
      break;
    }

    case 'PAYMENT.CAPTURE.COMPLETED': {
      // A payment capture completed — check if it's for one of our orders
      const capture = event.resource;
      if (!capture) break;

      // The supplementary_data contains the order_id
      const orderId = capture.supplementary_data?.related_ids?.order_id;
      if (!orderId) break;

      // Check if this is a deposit (claim has paypal_checkout_order_id)
      const { data: claim } = await supabase
        .from('claims')
        .select('id, deal_id, deposit_confirmed')
        .eq('paypal_checkout_order_id', orderId)
        .maybeSingle();

      if (!claim) {
        console.log('[PayPal Webhook] No claim found for order:', orderId);
        break;
      }

      if (!claim.deposit_confirmed) {
        // Deposit payment
        const qrCode = generateQRCodeId();
        const qrCodeUrl = getRedemptionUrl(qrCode);
        const redemptionCode = await generateUniqueRedemptionCode(supabase);

        const amountPaid = capture.amount?.value ? parseFloat(capture.amount.value) : 0;

        await supabase
          .from('claims')
          .update({
            deposit_confirmed: true,
            deposit_confirmed_at: new Date().toISOString(),
            qr_code: qrCode,
            qr_code_url: qrCodeUrl,
            redemption_code: redemptionCode,
            deposit_amount_paid: amountPaid,
          })
          .eq('id', claim.id);

        await supabase.rpc('increment_claims_count', { deal_id_param: claim.deal_id });
        console.log('[PayPal Webhook] Deposit confirmed for claim:', claim.id);
      } else {
        // Balance collection — find the latest redemption for this claim
        const { data: redemption } = await supabase
          .from('redemptions')
          .select('id')
          .eq('claim_id', claim.id)
          .order('redeemed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (redemption) {
          const amountCollected = capture.amount?.value ? parseFloat(capture.amount.value) : 0;

          await supabase
            .from('redemptions')
            .update({
              collection_completed: true,
              collection_completed_at: new Date().toISOString(),
              amount_collected: amountCollected,
            })
            .eq('id', redemption.id);

          console.log('[PayPal Webhook] Balance collected for redemption:', redemption.id);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
