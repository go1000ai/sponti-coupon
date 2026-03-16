import { NextRequest, NextResponse } from 'next/server';
import { getStripe, Stripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  sendSubscriptionConfirmationEmail,
  sendCancellationConfirmationEmail,
} from '@/lib/email/subscription-notification';

// Plan pricing map for email notifications (must match SUBSCRIPTION_TIERS)
const TIER_PRICES: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 49, annual: 39 },
  pro: { monthly: 99, annual: 79 },
  business: { monthly: 199, annual: 159 },
  enterprise: { monthly: 499, annual: 399 },
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      webhookSecret
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
        if (vendorId && session.subscription) {
          // Vendor already completed signup — sync subscription data
          const subscriptionResponse = await getStripe().subscriptions.retrieve(
            session.subscription as string
          );
          const subscription = subscriptionResponse as unknown as {
            id: string;
            current_period_start: number;
            current_period_end: number;
            status: string;
            items?: { data: Array<{ price?: { id: string } }> };
          };

          // Resolve tier from Stripe price ID (canonical source), fallback to metadata
          const verifiedTier = (subscription.items?.data?.[0]?.price?.id
            ? resolveTierFromPriceId(subscription.items.data[0].price.id)
            : null) || tier;

          if (!verifiedTier) break;

          const dbStatus = subscription.status === 'trialing' || subscription.status === 'active'
            ? 'active'
            : subscription.status;

          // Upsert to prevent duplicate inserts if webhook fires twice
          await supabase.from('subscriptions').upsert({
            vendor_id: vendorId,
            stripe_subscription_id: subscription.id,
            tier: verifiedTier,
            status: dbStatus,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }, { onConflict: 'stripe_subscription_id', ignoreDuplicates: true });

          await supabase
            .from('vendors')
            .update({
              subscription_tier: verifiedTier,
              subscription_status: dbStatus,
            })
            .eq('id', vendorId);
        }
        // If no vendorId, the user hasn't completed signup yet — nothing to do
        break;
      }

      // Standard flow (authenticated checkout): vendor_id is always present
      if (vendorId && session.subscription) {
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
          items?: { data: Array<{ price?: { id: string } }> };
        };

        // Resolve tier from Stripe price ID (canonical source), fallback to metadata
        const verifiedTier = (subscription.items?.data?.[0]?.price?.id
          ? resolveTierFromPriceId(subscription.items.data[0].price.id)
          : null) || tier;

        if (!verifiedTier) break;

        // Map Stripe status — treat 'trialing' as 'active' for vendor access
        const dbStatus = subscription.status === 'trialing' || subscription.status === 'active'
          ? 'active'
          : subscription.status;

        // Upsert to prevent duplicate inserts if webhook fires twice
        await supabase.from('subscriptions').upsert({
          vendor_id: vendorId,
          stripe_subscription_id: subscription.id,
          tier: verifiedTier,
          status: dbStatus,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { onConflict: 'stripe_subscription_id', ignoreDuplicates: true });

        await supabase
          .from('vendors')
          .update({
            subscription_tier: verifiedTier,
            subscription_status: dbStatus,
          })
          .eq('id', vendorId);

        // Send post-signup subscription confirmation email (FTC + NY GBL § 527)
        const { data: vendorForEmail } = await supabase
          .from('vendors')
          .select('business_name')
          .eq('id', vendorId)
          .single();
        const { data: profileForEmail } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('id', vendorId)
          .single();

        if (profileForEmail?.email && vendorForEmail?.business_name && verifiedTier) {
          const interval = subscription.items?.data?.[0]?.price?.id
            ? (process.env[`NEXT_PUBLIC_STRIPE_${verifiedTier.toUpperCase()}_ANNUAL_PRICE_ID`] === subscription.items.data[0].price.id ? 'year' : 'month')
            : 'month';
          const tierPrices = TIER_PRICES[verifiedTier] || { monthly: 0, annual: 0 };
          const pricePerPeriod = interval === 'year' ? tierPrices.annual : tierPrices.monthly;
          const trialEnd = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : undefined;

          await sendSubscriptionConfirmationEmail({
            vendorEmail: profileForEmail.email,
            vendorName: vendorForEmail.business_name,
            tier: verifiedTier,
            interval,
            pricePerPeriod,
            accessEndDate: trialEnd,
          });
        }
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
      const deletedSub = event.data.object as unknown as {
        id: string;
        current_period_end: number;
        items?: { data: Array<{ price?: { id: string } }> };
      };

      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', deletedSub.id);

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('vendor_id, tier')
        .eq('stripe_subscription_id', deletedSub.id)
        .single();

      if (sub) {
        await supabase
          .from('vendors')
          .update({ subscription_status: 'canceled', subscription_tier: null })
          .eq('id', sub.vendor_id);

        // Send cancellation confirmation email (FTC Negative Option Rule)
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('business_name')
          .eq('id', sub.vendor_id)
          .single();
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('id', sub.vendor_id)
          .single();

        if (profileData?.email && vendorData?.business_name) {
          const accessEndDate = new Date(deletedSub.current_period_end * 1000).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          });
          await sendCancellationConfirmationEmail({
            vendorEmail: profileData.email,
            vendorName: vendorData.business_name,
            tier: sub.tier || 'starter',
            accessEndDate,
          });
        }
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
        // Resolve tier from metadata first, then from price ID as fallback
        const tier = stripeSubscription.metadata?.tier
          || (stripeSubscription.items?.data?.[0]?.price?.id
            ? resolveTierFromPriceId(stripeSubscription.items.data[0].price.id)
            : null);

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
