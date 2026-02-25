import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Default settings (used when table doesn't exist or is empty)
const DEFAULTS: Record<string, Record<string, string>> = {
  sponti_points: {
    earning_rate: '25 points per claim',
    redemption_rate: '500 points = $5 off next deal',
    first_claim_bonus: '25 points (25 cents)',
    expiry_policy: '12 months of inactivity',
  },
  deal_config: {
    deal_types: 'Regular, SpontiCoupon (deposit-based)',
    max_claim_period: '7 days',
    qr_code_format: 'UUID-based',
  },
  system_limits: {
    max_image_size: '5 MB',
    supported_formats: 'JPEG, PNG, WebP',
    api_rate_limit: '100 requests/min',
  },
  platform_info: {
    name: 'SpontiCoupon',
    version: '1.0.0',
    environment: 'Production',
  },
};

/**
 * GET /api/admin/settings
 * Get all platform settings.
 */
export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('platform_settings')
      .select('key, value');

    if (error) {
      // Table doesn't exist — return defaults
      console.warn('[GET /api/admin/settings] Table read error, returning defaults:', error.message);
      return NextResponse.json({ settings: DEFAULTS, source: 'defaults' });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ settings: DEFAULTS, source: 'defaults' });
    }

    // Build settings map
    const settings: Record<string, Record<string, string>> = { ...DEFAULTS };
    for (const row of data) {
      settings[row.key] = row.value as Record<string, string>;
    }

    return NextResponse.json({ settings, source: 'database' });
  } catch (error) {
    console.error('[GET /api/admin/settings] Error:', error);
    return NextResponse.json({ settings: DEFAULTS, source: 'defaults' });
  }
}

/**
 * PUT /api/admin/settings
 * Update platform settings.
 * Body: { key: string, value: object }
 */
export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { key, value } = body as { key: string; value: Record<string, string> };

    if (!key || !value || typeof value !== 'object') {
      return NextResponse.json({ error: 'key and value (object) are required' }, { status: 400 });
    }

    const validKeys = ['sponti_points', 'deal_config', 'system_limits', 'platform_info'];
    if (!validKeys.includes(key)) {
      return NextResponse.json({ error: `Invalid key. Must be one of: ${validKeys.join(', ')}` }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();

    const { error } = await serviceClient
      .from('platform_settings')
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('[PUT /api/admin/settings] Upsert error:', error);
      return NextResponse.json({ error: error.message || 'Failed to update setting' }, { status: 500 });
    }

    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    console.error('[PUT /api/admin/settings] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
