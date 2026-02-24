import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/notifications - Send notifications (authenticated vendors only)
export async function POST(request: NextRequest) {
  try {
    // Authenticate the caller
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify vendor role
    const { data: profile } = await authClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'vendor' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { type, deal_id, customer_ids, channel } = await request.json();
    const supabase = await createServiceRoleClient();

    const notifications = customer_ids.map((customer_id: string) => ({
      customer_id,
      type,
      deal_id,
      channel,
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Integrate with Firebase Cloud Messaging for push
    // TODO: Integrate with SendGrid for email

    if (channel === 'push') {
      // Firebase push notification logic would go here
      // For each customer, get their push_token and send via FCM
    }

    if (channel === 'email') {
      // SendGrid email logic would go here
      // For each customer, compose and send email
    }

    return NextResponse.json({ success: true, count: notifications.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/notifications/digest - Trigger daily digest (called by cron)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  // Get all customers opted in for digest
  const { data: customers } = await supabase
    .from('customers')
    .select('id, email, lat, lng, city, state')
    .eq('email_digest_opt_in', true);

  if (!customers || customers.length === 0) {
    return NextResponse.json({ message: 'No customers opted in' });
  }

  // Get active deals
  const { data: deals } = await supabase
    .from('deals')
    .select('*, vendor:vendors(business_name, city, state, lat, lng)')
    .eq('status', 'active')
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  // TODO: For each customer, filter deals by location and send personalized digest
  // This would use SendGrid to send HTML emails with deal cards

  const digestNotifications = customers.map(c => ({
    customer_id: c.id,
    type: 'digest' as const,
    channel: 'email' as const,
  }));

  await supabase.from('notifications').insert(digestNotifications);

  return NextResponse.json({
    success: true,
    customers_notified: customers.length,
    deals_included: deals?.length || 0,
  });
}
