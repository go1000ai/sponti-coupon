import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/social/crypto';

const SQUARE_REVOKE_URL = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com/oauth2/revoke'
  : 'https://connect.squareupsandbox.com/oauth2/revoke';

// POST /api/square/connect/disconnect
// Revokes the Square OAuth connection and removes integrated payment method
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();

  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('square_connect_merchant_id, square_connect_access_token_encrypted')
    .eq('id', user.id)
    .single();

  if (!vendor?.square_connect_merchant_id) {
    return NextResponse.json({ error: 'No Square account linked' }, { status: 400 });
  }

  // Revoke the token with Square
  if (vendor.square_connect_access_token_encrypted) {
    try {
      const accessToken = decrypt(vendor.square_connect_access_token_encrypted);
      await fetch(SQUARE_REVOKE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Client ${process.env.SQUARE_APP_SECRET}`,
        },
        body: JSON.stringify({
          client_id: process.env.SQUARE_APP_ID,
          access_token: accessToken,
          revoke_all_tokens: true,
        }),
      });
    } catch (revokeErr) {
      console.warn('[Square Connect] Token revocation failed (continuing disconnect):', revokeErr);
    }
  }

  // Clear vendor's Square Connect fields
  await serviceClient
    .from('vendors')
    .update({
      square_connect_merchant_id: null,
      square_connect_access_token_encrypted: null,
      square_connect_refresh_token_encrypted: null,
      square_connect_token_expires_at: null,
      square_connect_location_id: null,
      square_connect_onboarding_complete: false,
      square_connect_charges_enabled: false,
    })
    .eq('id', user.id);

  // Deactivate the integrated Square payment method
  await serviceClient
    .from('vendor_payment_methods')
    .update({ is_active: false, is_primary: false })
    .eq('vendor_id', user.id)
    .eq('payment_tier', 'integrated')
    .eq('processor_type', 'square');

  // Promote next available method to primary
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
