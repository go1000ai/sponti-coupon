import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSquareForVendor } from '@/lib/square';
import { encrypt } from '@/lib/social/crypto';

const SQUARE_TOKEN_URL = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com/oauth2/token'
  : 'https://connect.squareupsandbox.com/oauth2/token';

// GET /api/square/connect/callback?code=xxx&state=vendor_id
// Called when vendor returns from Square OAuth authorization
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const vendorId = searchParams.get('state');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!code || !vendorId) {
    return NextResponse.redirect(
      `${appUrl}/vendor/payments?connect_error=missing_params`
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(SQUARE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SQUARE_APP_ID,
        client_secret: process.env.SQUARE_APP_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('[Square Connect] Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(
        `${appUrl}/vendor/payments?connect_error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token as string;
    const refreshToken = tokenData.refresh_token as string;
    const merchantId = tokenData.merchant_id as string;
    const expiresAt = tokenData.expires_at as string;

    // Fetch the merchant's primary location
    const squareClient = getSquareForVendor(accessToken);
    let locationId: string | null = null;
    try {
      const locationsResponse = await squareClient.locations.list();
      const locations = locationsResponse.locations;
      if (locations && locations.length > 0) {
        // Use the first active location, or fall back to the first one
        const activeLocation = locations.find(l => l.status === 'ACTIVE') || locations[0];
        locationId = activeLocation.id || null;
      }
    } catch (locErr) {
      console.warn('[Square Connect] Could not fetch locations:', locErr);
    }

    const supabase = await createServiceRoleClient();

    // Encrypt and store tokens
    await supabase
      .from('vendors')
      .update({
        square_connect_merchant_id: merchantId,
        square_connect_access_token_encrypted: encrypt(accessToken),
        square_connect_refresh_token_encrypted: encrypt(refreshToken),
        square_connect_token_expires_at: expiresAt,
        square_connect_location_id: locationId,
        square_connect_onboarding_complete: true,
        square_connect_charges_enabled: true,
      })
      .eq('id', vendorId);

    // Create or update integrated Square payment method
    const { data: existing } = await supabase
      .from('vendor_payment_methods')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('processor_type', 'square')
      .eq('payment_tier', 'integrated')
      .maybeSingle();

    if (!existing) {
      // Demote existing primary methods
      await supabase
        .from('vendor_payment_methods')
        .update({ is_primary: false })
        .eq('vendor_id', vendorId)
        .eq('is_primary', true);

      // Create the integrated Square payment method as primary
      await supabase
        .from('vendor_payment_methods')
        .insert({
          vendor_id: vendorId,
          processor_type: 'square',
          payment_link: `square_connect:${merchantId}`,
          display_name: 'Square (Integrated)',
          is_primary: true,
          is_active: true,
          payment_tier: 'integrated',
        });
    } else {
      // Update existing integrated method
      await supabase
        .from('vendor_payment_methods')
        .update({
          payment_link: `square_connect:${merchantId}`,
          is_active: true,
        })
        .eq('id', existing.id);
    }

    return NextResponse.redirect(
      `${appUrl}/vendor/payments?square_connect_success=true`
    );
  } catch (error) {
    console.error('[Square Connect] Callback error:', error);
    return NextResponse.redirect(
      `${appUrl}/vendor/payments?connect_error=callback_failed`
    );
  }
}
