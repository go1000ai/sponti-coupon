import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, password, businessName } = await request.json();

    if (!sessionId || !password || !businessName) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, password, businessName' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Retrieve and verify the Stripe checkout session
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const subscription = session.subscription as import('stripe').Stripe.Subscription | null;
    const subStatus = subscription?.status;
    const isPaidOrTrialing =
      session.payment_status === 'paid' ||
      session.payment_status === 'no_payment_required' ||
      subStatus === 'trialing' ||
      subStatus === 'active';

    if (!isPaidOrTrialing) {
      return NextResponse.json({ error: 'Checkout session is not completed' }, { status: 400 });
    }

    const email = session.customer_details?.email || session.customer_email;
    const tier = session.metadata?.tier || 'starter';
    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = subscription?.id;

    if (!email) {
      return NextResponse.json({ error: 'No email found in checkout session' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Check if a user with this email already exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users?.find((u) => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      // Update password for existing user
      await supabase.auth.admin.updateUserById(userId, { password });

      // Ensure user_profiles exists with vendor role
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        await supabase.from('user_profiles').insert({ id: userId, role: 'vendor' });
      } else {
        await supabase.from('user_profiles').update({ role: 'vendor' }).eq('id', userId);
      }

      // Update or create vendor record
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingVendor) {
        await supabase.from('vendors').update({
          business_name: businessName,
          stripe_customer_id: stripeCustomerId,
          subscription_tier: tier,
          subscription_status: 'active',
        }).eq('id', userId);
      } else {
        await supabase.from('vendors').insert({
          id: userId,
          business_name: businessName,
          email,
          stripe_customer_id: stripeCustomerId,
          subscription_tier: tier,
          subscription_status: 'active',
        });
      }
    } else {
      // Create new auth user with confirmed email
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { account_type: 'vendor', flow: 'payment_first' },
      });

      if (createError || !newUser.user) {
        console.error('Failed to create auth user:', createError);
        return NextResponse.json(
          { error: createError?.message || 'Failed to create user account' },
          { status: 500 },
        );
      }

      userId = newUser.user.id;

      // Create user_profiles record
      await supabase.from('user_profiles').insert({ id: userId, role: 'vendor' });

      // Create vendors record
      await supabase.from('vendors').insert({
        id: userId,
        business_name: businessName,
        email,
        stripe_customer_id: stripeCustomerId,
        subscription_tier: tier,
        subscription_status: 'active',
      });
    }

    // Create subscription record if it doesn't exist
    if (stripeSubscriptionId) {
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .single();

      if (!existingSub && subscription) {
        const dbStatus = subscription.status === 'trialing' || subscription.status === 'active'
          ? 'active'
          : subscription.status;

        // Stripe returns Unix seconds when expanded; convert safely
        const toISO = (val: unknown): string => {
          if (typeof val === 'number') return new Date(val * 1000).toISOString();
          if (typeof val === 'string') return new Date(val).toISOString();
          return new Date().toISOString();
        };

        await supabase.from('subscriptions').insert({
          vendor_id: userId,
          stripe_subscription_id: stripeSubscriptionId,
          tier,
          status: dbStatus,
          current_period_start: toISO((subscription as unknown as Record<string, unknown>).current_period_start),
          current_period_end: toISO((subscription as unknown as Record<string, unknown>).current_period_end),
        });
      }
    }

    // Update Stripe customer metadata with vendor_id
    if (stripeCustomerId) {
      await getStripe().customers.update(stripeCustomerId, {
        metadata: { vendor_id: userId },
        name: businessName,
      });
    }

    // Update Stripe subscription metadata with vendor_id
    if (stripeSubscriptionId) {
      await getStripe().subscriptions.update(stripeSubscriptionId, {
        metadata: {
          vendor_id: userId,
          tier,
          ...(session.metadata?.interval ? { interval: session.metadata.interval } : {}),
          ...(session.metadata?.promo ? { promo: session.metadata.promo } : {}),
        },
      });
    }

    // Sign the user in by setting auth cookies
    const authClient = await createServerSupabaseClient();
    await authClient.auth.signInWithPassword({ email, password });

    return NextResponse.json({ success: true, userId });
  } catch (error: unknown) {
    console.error('Create vendor from checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create vendor account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
