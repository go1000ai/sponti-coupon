import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';
import crypto from 'crypto';

// GET /api/vendor/api-keys — List API keys for the vendor
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: keys, error } = await supabase
    .from('vendor_api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, is_active')
    .eq('vendor_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keys: keys || [] });
}

// POST /api/vendor/api-keys — Generate a new API key (Enterprise only)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check tier access
  const { data: vendor } = await supabase
    .from('vendors')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const tier = (vendor?.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].api_access) {
    return NextResponse.json(
      { error: 'API access requires an Enterprise plan.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: 'API key name is required.' }, { status: 400 });
  }

  // Generate a secure API key
  const rawKey = `sc_live_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12) + '...';

  const { data: apiKey, error } = await supabase
    .from('vendor_api_keys')
    .insert({
      vendor_id: user.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      is_active: true,
    })
    .select('id, name, key_prefix, created_at, is_active')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return the full key ONLY on creation — it's never shown again
  return NextResponse.json({ key: apiKey, secret: rawKey });
}

// DELETE /api/vendor/api-keys — Revoke an API key
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Key ID is required.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vendor_api_keys')
    .update({ is_active: false })
    .eq('id', id)
    .eq('vendor_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
