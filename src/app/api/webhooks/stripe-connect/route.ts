import { NextRequest, NextResponse } from 'next/server';
import { getStripe, Stripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateQRCodeId, getRedemptionUrl, generateRedemptionCode } from '@/lib/qr';

// POST /api/webhooks/stripe-connect
// Handles Stripe Connect events (deposit payments on connected accounts)
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    console.error('[Stripe Connect Webhook] Verification failed:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      // Only process deal deposit checkouts
      if (session.metadata?.type !== 'deal_deposit') break;

      const sessionToken = session.metadata?.session_token;
      const claimId = session.metadata?.claim_id;

      if (!sessionToken || !claimId) {
        console.error('[Stripe Connect Webhook] Missing metadata:', session.metadata);
        break;
      }

      console.log('[Stripe Connect Webhook] Processing deposit for claim:', claimId);

      // Find the pending claim
      const { data: claim } = await supabase
        .from('claims')
        .select('*, deal:deals(*)')
        .eq('id', claimId)
        .eq('session_token', sessionToken)
        .eq('deposit_confirmed', false)
        .single();

      if (!claim) {
        console.error('[Stripe Connect Webhook] No pending claim found for:', claimId);
        break;
      }

      // Check expiration
      if (new Date(claim.expires_at) < new Date()) {
        console.error('[Stripe Connect Webhook] Claim expired:', claimId);
        break;
      }

      // Generate QR code + redemption code
      const qrCode = generateQRCodeId();
      const qrCodeUrl = getRedemptionUrl(qrCode);
      const redemptionCode = generateRedemptionCode();

      // Confirm the deposit
      const { error: updateError } = await supabase
        .from('claims')
        .update({
          deposit_confirmed: true,
          deposit_confirmed_at: new Date().toISOString(),
          qr_code: qrCode,
          qr_code_url: qrCodeUrl,
          redemption_code: redemptionCode,
          deposit_amount_paid: (session.amount_total || 0) / 100,
        })
        .eq('id', claim.id);

      if (updateError) {
        console.error('[Stripe Connect Webhook] Update error:', updateError);
        break;
      }

      // Increment claims count
      await supabase.rpc('increment_claims_count', { deal_id_param: claim.deal_id });

      console.log('[Stripe Connect Webhook] Deposit confirmed, QR generated for claim:', claimId);
      break;
    }

    case 'account.updated': {
      // Vendor's Stripe account status changed (e.g., completed onboarding)
      const account = event.data.object as Stripe.Account;

      const { error } = await supabase
        .from('vendors')
        .update({
          stripe_connect_onboarding_complete: account.details_submitted || false,
          stripe_connect_charges_enabled: account.charges_enabled || false,
        })
        .eq('stripe_connect_account_id', account.id);

      if (error) {
        console.error('[Stripe Connect Webhook] Account update error:', error);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
