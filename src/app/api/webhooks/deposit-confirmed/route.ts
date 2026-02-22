import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateQRCodeId, getRedemptionUrl, generateRedemptionCode } from '@/lib/qr';
import crypto from 'crypto';

// POST /api/webhooks/deposit-confirmed
// Webhook endpoint for vendor's payment processor to confirm deposit
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    const vendorId = request.headers.get('x-vendor-id');

    const supabase = await createServiceRoleClient();

    // Parse the payload
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Extract session token from payment metadata
    // Support both Stripe and generic webhook formats
    let sessionToken: string | null = null;

    // Stripe format
    if (payload.data && typeof payload.data === 'object') {
      const eventData = payload.data as Record<string, unknown>;
      const obj = eventData.object as Record<string, unknown> | undefined;
      if (obj?.client_reference_id) {
        sessionToken = obj.client_reference_id as string;
      } else if (obj?.metadata && typeof obj.metadata === 'object') {
        sessionToken = (obj.metadata as Record<string, string>).session_token || null;
      }
    }

    // Generic format
    if (!sessionToken && payload.session_token) {
      sessionToken = payload.session_token as string;
    }

    if (!sessionToken) {
      return NextResponse.json({ error: 'No session token found in payload' }, { status: 400 });
    }

    // Validate webhook signature if vendor has a webhook secret configured
    if (vendorId && signature) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('deposit_webhook_secret')
        .eq('id', vendorId)
        .single();

      if (vendor?.deposit_webhook_secret) {
        const expectedSignature = crypto
          .createHmac('sha256', vendor.deposit_webhook_secret)
          .update(body)
          .digest('hex');

        if (signature !== `sha256=${expectedSignature}`) {
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
      }
    }

    // Find the pending claim with this session token
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*, deal:deals(*)')
      .eq('session_token', sessionToken)
      .eq('deposit_confirmed', false)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: 'No pending claim found for this session' }, { status: 404 });
    }

    // Check if deal is still active and not expired
    if (new Date(claim.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Claim has expired' }, { status: 400 });
    }

    // Generate QR code + 6-digit redemption code
    const qrCode = generateQRCodeId();
    const qrCodeUrl = getRedemptionUrl(qrCode);
    const redemptionCode = generateRedemptionCode();

    // Mark deposit as confirmed and assign QR code + redemption code
    const { error: updateError } = await supabase
      .from('claims')
      .update({
        deposit_confirmed: true,
        deposit_confirmed_at: new Date().toISOString(),
        qr_code: qrCode,
        qr_code_url: qrCodeUrl,
        redemption_code: redemptionCode,
      })
      .eq('id', claim.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Increment claims count on the deal
    await supabase.rpc('increment_claims_count', { deal_id_param: claim.deal_id });

    // TODO: Send confirmation email with QR code
    // TODO: Send push notification

    return NextResponse.json({
      success: true,
      claim_id: claim.id,
      qr_code: qrCode,
    });
  } catch (error: unknown) {
    console.error('Deposit webhook error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
