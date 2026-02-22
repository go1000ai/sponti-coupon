import { NextRequest, NextResponse } from 'next/server';
import { getStripe, Stripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

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
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    console.error('Webhook verification failed:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const vendorId = session.metadata?.vendor_id;
      const tier = session.metadata?.tier;

      if (vendorId && tier && session.subscription) {
        const subscriptionResponse = await getStripe().subscriptions.retrieve(
          session.subscription as string
        );
        const subscription = subscriptionResponse as unknown as {
          id: string;
          current_period_start: number;
          current_period_end: number;
          status: string;
        };

        await supabase.from('subscriptions').insert({
          vendor_id: vendorId,
          stripe_subscription_id: subscription.id,
          tier,
          status: 'active',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });

        await supabase
          .from('vendors')
          .update({
            subscription_tier: tier,
            subscription_status: 'active',
          })
          .eq('id', vendorId);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subObj = event.data.object as unknown as {
        id: string;
        status: string;
        current_period_start: number;
        current_period_end: number;
      };
      const status = subObj.status === 'active' ? 'active'
        : subObj.status === 'past_due' ? 'past_due'
        : 'canceled';

      await supabase
        .from('subscriptions')
        .update({
          status,
          current_period_start: new Date(subObj.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subObj.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subObj.id);

      // Also update vendor status
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('vendor_id')
        .eq('stripe_subscription_id', subObj.id)
        .single();

      if (sub) {
        await supabase
          .from('vendors')
          .update({ subscription_status: status })
          .eq('id', sub.vendor_id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const deletedSub = event.data.object as unknown as { id: string };

      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', deletedSub.id);

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('vendor_id')
        .eq('stripe_subscription_id', deletedSub.id)
        .single();

      if (sub) {
        await supabase
          .from('vendors')
          .update({ subscription_status: 'canceled', subscription_tier: null })
          .eq('id', sub.vendor_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
