import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/settings/init
 * Initializes the platform_settings table if it doesn't exist.
 * Only needs to be called once.
 */
export async function POST() {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();

    // Check if table exists by trying to read from it
    const { error: checkError } = await serviceClient
      .from('platform_settings')
      .select('key')
      .limit(1);

    if (checkError && checkError.message.includes('platform_settings')) {
      // Table doesn't exist — we can't create it via REST API
      // Return instructions to create it
      return NextResponse.json({
        error: 'Table does not exist yet',
        instructions: 'Run the SQL from supabase/migrations/018_platform_settings.sql in the Supabase dashboard SQL editor',
      }, { status: 500 });
    }

    // Table exists — seed defaults if empty
    const { data: existing } = await serviceClient
      .from('platform_settings')
      .select('key');

    if (!existing || existing.length === 0) {
      const defaults = [
        {
          key: 'sponti_points',
          value: {
            earning_rate: '25 points per claim',
            redemption_rate: '500 points = $5 off next deal',
            first_claim_bonus: '25 points (25 cents)',
            expiry_policy: '12 months of inactivity',
          },
        },
        {
          key: 'deal_config',
          value: {
            deal_types: 'Regular, SpontiCoupon (deposit-based)',
            max_claim_period: '7 days',
            qr_code_format: 'UUID-based',
          },
        },
        {
          key: 'system_limits',
          value: {
            max_image_size: '5 MB',
            supported_formats: 'JPEG, PNG, WebP',
            api_rate_limit: '100 requests/min',
          },
        },
        {
          key: 'platform_info',
          value: {
            name: 'SpontiCoupon',
            version: '1.0.0',
            environment: 'Production',
          },
        },
      ];

      const { error: seedError } = await serviceClient
        .from('platform_settings')
        .upsert(defaults, { onConflict: 'key' });

      if (seedError) {
        console.error('[POST /api/admin/settings/init] Seed error:', seedError);
        return NextResponse.json({ error: 'Failed to seed settings' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Settings table seeded with defaults' });
    }

    return NextResponse.json({ success: true, message: 'Settings table already has data' });
  } catch (error) {
    console.error('[POST /api/admin/settings/init] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
