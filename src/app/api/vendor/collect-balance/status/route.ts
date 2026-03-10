import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { getSquareForVendor } from '@/lib/square';
import { getValidSquareToken } from '@/lib/square-token';
import { getOrderDetails as getPayPalOrderDetails } from '@/lib/paypal';

// GET /api/vendor/collect-balance/status?session_id=cs_xxx OR ?order_id=xxx OR ?paypal_order_id=xxx
// Polls Stripe, Square, or PayPal to check if the customer has completed payment.
// Vendor scan page calls this every 3 seconds after sending a payment link.
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orderId = request.nextUrl.searchParams.get('order_id');
  const sessionId = request.nextUrl.searchParams.get('session_id');
  const paypalOrderId = request.nextUrl.searchParams.get('paypal_order_id');

  // --- PayPal branch ---
  if (paypalOrderId) {
    const serviceClient = await createServiceRoleClient();
    const { data: vendor } = await serviceClient
      .from('vendors')
      .select('paypal_connect_merchant_id')
      .eq('id', user.id)
      .single();

    if (!vendor?.paypal_connect_merchant_id) {
      return NextResponse.json({ error: 'No PayPal account connected', paid: false }, { status: 400 });
    }

    try {
      const order = await getPayPalOrderDetails(paypalOrderId, vendor.paypal_connect_merchant_id);
      const paid = order.status === 'COMPLETED';
      return NextResponse.json({ paid, payment_status: order.status });
    } catch {
      return NextResponse.json({ paid: false, payment_status: 'UNKNOWN' });
    }
  }

  // --- Square branch ---
  if (orderId) {
    const serviceClient = await createServiceRoleClient();
    const accessToken = await getValidSquareToken(serviceClient, user.id);

    if (!accessToken) {
      return NextResponse.json({ error: 'Square token expired', paid: false }, { status: 400 });
    }

    const squareClient = getSquareForVendor(accessToken);
    const order = await squareClient.orders.get({ orderId });

    const paid = order.order?.state === 'COMPLETED';
    return NextResponse.json({ paid, payment_status: order.order?.state || 'UNKNOWN' });
  }

  // --- Stripe branch ---
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id, order_id, or paypal_order_id' }, { status: 400 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const paid = session.payment_status === 'paid';
  return NextResponse.json({ paid, payment_status: session.payment_status });
}
