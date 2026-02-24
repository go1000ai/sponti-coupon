import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/stripe/customer-portal — Open Stripe billing portal
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = await createServiceRoleClient();

    const { data: vendor } = await serviceClient
      .from('vendors')
      .select('stripe_customer_id, email, business_name')
      .eq('id', user.id)
      .single();

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    let customerId = vendor.stripe_customer_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: vendor.email,
        name: vendor.business_name,
        metadata: { vendor_id: user.id },
      });
      customerId = customer.id;

      await serviceClient
        .from('vendors')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Stripe portal error:', error);
    const message = error instanceof Error ? error.message : 'Failed to open billing portal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
