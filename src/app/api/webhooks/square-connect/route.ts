import { NextRequest, NextResponse } from 'next/server';
import { WebhooksHelper } from 'square';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateQRCodeId, getRedemptionUrl, generateUniqueRedemptionCode } from '@/lib/qr';

// POST /api/webhooks/square-connect
// Handles Square payment events for connected vendor accounts
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-square-hmacsha256-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/square-connect`;

  if (!signatureKey) {
    console.error('[Square Webhook] SQUARE_WEBHOOK_SIGNATURE_KEY not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Verify signature
  const isValid = await WebhooksHelper.verifySignature({
    requestBody: body,
    signatureHeader: signature,
    signatureKey,
    notificationUrl,
  });
  if (!isValid) {
    console.error('[Square Webhook] Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body);
  const supabase = await createServiceRoleClient();

  switch (event.type) {
    case 'payment.updated': {
      const payment = event.data?.object?.payment;
      if (!payment) break;

      // Only process completed payments
      if (payment.status !== 'COMPLETED') break;

      const orderId = payment.order_id;
      if (!orderId) break;

      // Check if this is a balance collection (claim has square_checkout_order_id)
      const { data: claim } = await supabase
        .from('claims')
        .select('id, deal_id, deposit_confirmed, session_token')
        .eq('square_checkout_order_id', orderId)
        .maybeSingle();

      if (!claim) {
        console.log('[Square Webhook] No claim found for order:', orderId);
        break;
      }

      // If deposit not yet confirmed, this is a deposit payment
      if (!claim.deposit_confirmed) {
        const amountPaid = payment.amount_money?.amount
          ? Number(payment.amount_money.amount) / 100
          : 0;

        const qrCode = generateQRCodeId();
        const qrCodeUrl = getRedemptionUrl(qrCode);
        const redemptionCode = await generateUniqueRedemptionCode(supabase);

        const { error: updateError } = await supabase
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

        if (updateError) {
          console.error('[Square Webhook] Claim update error:', updateError);
          break;
        }

        await supabase.rpc('increment_claims_count', { deal_id_param: claim.deal_id });
        console.log('[Square Webhook] Deposit confirmed for claim:', claim.id);
      } else {
        // This is a balance collection payment
        // Find the redemption linked to this claim
        const { data: redemption } = await supabase
          .from('redemptions')
          .select('id')
          .eq('claim_id', claim.id)
          .order('redeemed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (redemption) {
          const amountCollected = payment.amount_money?.amount
            ? Number(payment.amount_money.amount) / 100
            : 0;

          await supabase
            .from('redemptions')
            .update({
              collection_completed: true,
              collection_completed_at: new Date().toISOString(),
              amount_collected: amountCollected,
            })
            .eq('id', redemption.id);

          console.log('[Square Webhook] Balance collected for redemption:', redemption.id);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
