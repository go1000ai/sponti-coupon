import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    // Verify session is paid or trialing (for free trial plans)
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
    const tier = session.metadata?.tier;
    const interval = session.metadata?.interval;
    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = subscription?.id || null;

    if (!email) {
      return NextResponse.json({ error: 'No email found in checkout session' }, { status: 400 });
    }

    return NextResponse.json({
      email,
      tier,
      interval,
      stripeCustomerId,
      stripeSubscriptionId,
    });
  } catch (error: unknown) {
    console.error('Retrieve checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to retrieve checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
