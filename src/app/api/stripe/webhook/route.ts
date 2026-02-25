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
      const flowType = session.metadata?.flow_type;

      // Guest signup flow: the /auth/complete-signup page creates all records.
      // The webhook may fire before or after the user completes signup.
      // If vendor doesn't exist yet, skip — the complete-signup endpoint handles it.
      if (flowType === 'guest_signup') {
        if (vendorId && tier && session.subscription) {
          // Vendor already completed signup — sync subscription data
          const subscriptionResponse = await getStripe().subscriptions.retrieve(
            session.subscription as string
          );
          const subscription = subscriptionResponse as unknown as {
            id: string;
            current_period_start: number;
            current_period_end: number;
            status: string;
          };

          const dbStatus = subscription.status === 'trialing' || subscription.status === 'active'
            ? 'active'
            : subscription.status;

          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (!existingSub) {
            await supabase.from('subscriptions').insert({
              vendor_id: vendorId,
              stripe_subscription_id: subscription.id,
              tier,
              status: dbStatus,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            });
          }

          await supabase
            .from('vendors')
            .update({
              subscription_tier: tier,
              subscription_status: dbStatus,
            })
            .eq('id', vendorId);
        }
        // If no vendorId, the user hasn't completed signup yet — nothing to do
        break;
      }

      // Standard flow (authenticated checkout): vendor_id is always present
      if (vendorId && tier && session.subscription) {
        const subscriptionResponse = await getStripe().subscriptions.retrieve(
          session.subscription as string
        );
        const subscription = subscriptionResponse as unknown as {
          id: string;
          current_period_start: number;
          current_period_end: number;
          trial_start: number | null;
          trial_end: number | null;
          status: string;
        };

        // Map Stripe status — treat 'trialing' as 'active' for vendor access
        const dbStatus = subscription.status === 'trialing' || subscription.status === 'active'
          ? 'active'
          : subscription.status;

        // Check if subscription record already exists (avoid duplicates)
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (!existingSub) {
          await supabase.from('subscriptions').insert({
            vendor_id: vendorId,
            stripe_subscription_id: subscription.id,
            tier,
            status: dbStatus,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });
        }

        await supabase
          .from('vendors')
          .update({
            subscription_tier: tier,
            subscription_status: dbStatus,
          })
          .eq('id', vendorId);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subObj = event.data.object as unknown as {
        id: string;
        status: string;
        metadata?: Record<string, string>;
        items?: { data: Array<{ price?: { id: string } }> };
        current_period_start: number;
        current_period_end: number;
      };
      const stripeSubId = subObj.id;

      // Determine status
      const status = (subObj.status === 'active' || subObj.status === 'trialing') ? 'active'
        : subObj.status === 'past_due' ? 'past_due'
        : 'canceled';

      // Get the tier from metadata (set by our change-plan endpoint)
      const tier = subObj.metadata?.tier || null;

      // Get the current price to determine the tier if metadata isn't set
      let resolvedTier = tier;
      if (!resolvedTier && subObj.items?.data?.[0]?.price?.id) {
        const priceId = subObj.items.data[0].price.id;
        resolvedTier = resolveTierFromPriceId(priceId);
      }

      // Update subscriptions table
      const updateData: Record<string, unknown> = {
        status,
        current_period_start: new Date(subObj.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subObj.current_period_end * 1000).toISOString(),
      };
      if (resolvedTier) {
        updateData.tier = resolvedTier;
      }

      await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('stripe_subscription_id', stripeSubId);

      // Update vendor
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('vendor_id')
        .eq('stripe_subscription_id', stripeSubId)
        .single();

      if (sub) {
        const vendorUpdate: Record<string, unknown> = { subscription_status: status };
        if (resolvedTier) {
          vendorUpdate.subscription_tier = resolvedTier;
        }
        await supabase
          .from('vendors')
          .update(vendorUpdate)
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

    case 'invoice.paid': {
      // When a renewal invoice is paid, sync the tier from the subscription
      const invoice = event.data.object as unknown as { subscription?: string | { id: string } };
      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : (invoice.subscription as { id: string } | undefined)?.id;

      if (subscriptionId) {
        const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);
        const tier = stripeSubscription.metadata?.tier;

        if (tier) {
          await supabase
            .from('subscriptions')
            .update({ tier })
            .eq('stripe_subscription_id', subscriptionId);

          const { data: sub } = await supabase
            .from('subscriptions')
            .select('vendor_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (sub) {
            await supabase
              .from('vendors')
              .update({ subscription_tier: tier })
              .eq('id', sub.vendor_id);
          }
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

// Helper: resolve tier from Stripe price ID
function resolveTierFromPriceId(priceId: string): string | null {
  const priceMap: Record<string, string> = {};

  // Monthly prices
  if (process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) priceMap[process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID] = 'starter';
  if (process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) priceMap[process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID] = 'pro';
  if (process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID) priceMap[process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID] = 'business';
  if (process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID) priceMap[process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID] = 'enterprise';

  // Annual prices
  if (process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID) priceMap[process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID] = 'starter';
  if (process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID) priceMap[process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID] = 'pro';
  if (process.env.NEXT_PUBLIC_STRIPE_BUSINESS_ANNUAL_PRICE_ID) priceMap[process.env.NEXT_PUBLIC_STRIPE_BUSINESS_ANNUAL_PRICE_ID] = 'business';
  if (process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL_PRICE_ID) priceMap[process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL_PRICE_ID] = 'enterprise';

  return priceMap[priceId] || null;
}
