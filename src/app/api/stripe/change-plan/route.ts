import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS, TIER_ORDER } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';

const TIER_NAMES: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

// POST /api/stripe/change-plan — Upgrade or downgrade subscription
// Upgrade: immediate, prorated charge
// Downgrade: takes effect at end of current billing period
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier: newTier, interval = 'month' } = await request.json();

    if (!newTier || !TIER_NAMES[newTier]) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    if (interval !== 'month' && interval !== 'year') {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();

    // Get vendor info
    const { data: vendor } = await serviceClient
      .from('vendors')
      .select('subscription_tier, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const currentTier = vendor.subscription_tier as SubscriptionTier | null;

    // If same tier, reject
    if (currentTier === newTier) {
      return NextResponse.json({ error: 'You are already on this plan' }, { status: 400 });
    }

    // Get the target price ID
    const tierConfig = SUBSCRIPTION_TIERS[newTier as SubscriptionTier];
    const newPriceId = interval === 'year'
      ? tierConfig.stripe_annual_price_id
      : tierConfig.stripe_price_id;

    if (!newPriceId) {
      return NextResponse.json(
        { error: `No Stripe price ID configured for ${TIER_NAMES[newTier]} (${interval})` },
        { status: 500 },
      );
    }

    // Check if vendor has an active Stripe subscription
    const { data: existingSub } = await serviceClient
      .from('subscriptions')
      .select('stripe_subscription_id, tier, status')
      .eq('vendor_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // No existing subscription — redirect to new checkout
    if (!existingSub?.stripe_subscription_id) {
      // No active subscription, create a new checkout session
      let customerId = vendor.stripe_customer_id;

      if (!customerId) {
        const { data: vendorInfo } = await serviceClient
          .from('vendors')
          .select('email, business_name')
          .eq('id', user.id)
          .single();

        const customer = await getStripe().customers.create({
          email: vendorInfo?.email,
          name: vendorInfo?.business_name,
          metadata: { vendor_id: user.id },
        });
        customerId = customer.id;

        await serviceClient
          .from('vendors')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
      }

      const session = await getStripe().checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: newPriceId, quantity: 1 }],
        subscription_data: { trial_period_days: 14 },
        metadata: { vendor_id: user.id, tier: newTier, interval },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/subscription?changed=success&tier=${newTier}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/subscription?changed=canceled`,
      });

      return NextResponse.json({ url: session.url, action: 'checkout' });
    }

    // Existing subscription — modify it via Stripe
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id);

    const currentTierIndex = TIER_ORDER.indexOf(currentTier || 'starter');
    const newTierIndex = TIER_ORDER.indexOf(newTier as SubscriptionTier);
    const isUpgrade = newTierIndex > currentTierIndex;

    // Get the current subscription item ID
    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      return NextResponse.json({ error: 'Could not find subscription item' }, { status: 500 });
    }

    if (isUpgrade) {
      // UPGRADE: Immediate change, prorated charge
      const updatedSub = await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
        items: [{ id: subscriptionItemId, price: newPriceId }],
        proration_behavior: 'create_prorations',
        metadata: { tier: newTier, interval },
      });

      // Update database immediately
      await serviceClient
        .from('vendors')
        .update({ subscription_tier: newTier })
        .eq('id', user.id);

      await serviceClient
        .from('subscriptions')
        .update({ tier: newTier })
        .eq('stripe_subscription_id', existingSub.stripe_subscription_id);

      return NextResponse.json({
        success: true,
        action: 'upgrade',
        tier: newTier,
        message: `Upgraded to ${TIER_NAMES[newTier]}! Changes are effective immediately.`,
      });
    } else {
      // DOWNGRADE: Takes effect at end of current billing period
      const updatedSub = await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
        items: [{ id: subscriptionItemId, price: newPriceId }],
        proration_behavior: 'none',
        metadata: { tier: newTier, interval, pending_downgrade: 'true' },
      });

      // Get period end for user messaging
      const rawSub = updatedSub as unknown as { current_period_end: number };
      const periodEnd = new Date(rawSub.current_period_end * 1000);

      // Note: We do NOT update the vendor's tier yet — it stays at current tier
      // The webhook for invoice.paid or subscription.updated at next renewal will update it

      return NextResponse.json({
        success: true,
        action: 'downgrade',
        tier: newTier,
        effectiveDate: periodEnd.toISOString(),
        message: `Your plan will change to ${TIER_NAMES[newTier]} on ${periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. You'll keep your current features until then.`,
      });
    }
  } catch (error: unknown) {
    console.error('Stripe change-plan error:', error);
    const message = error instanceof Error ? error.message : 'Failed to change plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
