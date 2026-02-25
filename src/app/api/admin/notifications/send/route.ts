import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/notifications/send
 * Send a notification to a specific customer or broadcast to all customers.
 * Body: { customer_id? (omit for broadcast), type, title, message, channel }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return forbiddenResponse();

    const serviceClient = await createServiceRoleClient();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { customer_id, customer_ids, type, title, message, channel } = body as {
      customer_id?: string;
      customer_ids?: string[];
      type: string;
      title: string;
      message: string;
      channel: string;
    };

    // Validate required fields
    if (!type || !title || !message || !channel) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, message, channel' },
        { status: 400 }
      );
    }

    const validTypes = ['deal_claimed', 'deal_expiring', 'review_request', 'deal_near_you', 'welcome', 'points_earned', 'loyalty_reward'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const validChannels = ['in_app', 'push', 'email'];
    if (!validChannels.includes(channel)) {
      return NextResponse.json({ error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` }, { status: 400 });
    }

    // Determine target customer IDs
    const targetIds: string[] = customer_ids && customer_ids.length > 0
      ? customer_ids
      : customer_id
        ? [customer_id]
        : [];

    if (targetIds.length > 0) {
      // Send to specific customers
      const rows = targetIds.map((id) => ({
        customer_id: id,
        type,
        title,
        message,
        channel,
        read: false,
      }));

      const { error } = await serviceClient
        .from('notifications')
        .insert(rows);

      if (error) {
        console.error('[POST /api/admin/notifications/send] Insert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: targetIds.length });
    } else {
      // Broadcast to all customers
      const { data: customers, error: fetchError } = await serviceClient
        .from('customers')
        .select('id');

      if (fetchError) {
        console.error('[POST /api/admin/notifications/send] Fetch customers error:', fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }

      if (!customers || customers.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: 'No customers to notify' });
      }

      const rows = customers.map((c) => ({
        customer_id: c.id,
        type,
        title,
        message,
        channel,
        read: false,
      }));

      const { error: insertError } = await serviceClient
        .from('notifications')
        .insert(rows);

      if (insertError) {
        console.error('[POST /api/admin/notifications/send] Broadcast insert error:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: customers.length });
    }
  } catch (error) {
    console.error('[POST /api/admin/notifications/send] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
