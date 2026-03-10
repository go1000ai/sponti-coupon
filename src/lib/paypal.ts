/**
 * PayPal Commerce Platform (Connected Path) client utility.
 *
 * Unlike Stripe/Square, PayPal Connected Path does NOT store per-vendor tokens.
 * The partner (SpontiCoupon) uses its own client credentials to obtain an access token,
 * then uses a PayPal-Auth-Assertion JWT header to act on behalf of the vendor.
 */

// --- Environment ---

function getBaseUrl(): string {
  return process.env.PAYPAL_ENVIRONMENT === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

// --- Access Token (cached in-memory) ---

let _cachedToken: string | null = null;
let _tokenExpiry = 0;

/**
 * Get a PayPal access token using client credentials.
 * Tokens last ~9 hours; cached in-memory with 8-hour TTL.
 */
export async function getPayPalAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) {
    return _cachedToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token error: ${res.status} ${text}`);
  }

  const data = await res.json();
  _cachedToken = data.access_token;
  // Cache for 8 hours (tokens last ~9 hours)
  _tokenExpiry = Date.now() + 8 * 60 * 60 * 1000;
  return _cachedToken!;
}

// --- Auth Assertion Header ---

/**
 * Build the PayPal-Auth-Assertion JWT header for acting on behalf of a merchant.
 * This is an unsigned JWT (alg: "none") with base64url-encoded header + payload.
 */
function base64url(obj: Record<string, string>): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function buildAuthAssertion(merchantId: string): string {
  const header = base64url({ alg: 'none' });
  const payload = base64url({
    iss: process.env.PAYPAL_CLIENT_ID!,
    payer_id: merchantId,
  });
  return `${header}.${payload}.`; // empty signature
}

// --- API Fetch Wrapper ---

interface PayPalFetchOptions {
  method?: string;
  body?: unknown;
  merchantId?: string;
}

export async function paypalFetch<T = unknown>(path: string, options: PayPalFetchOptions = {}): Promise<T> {
  const token = await getPayPalAccessToken();
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  if (options.merchantId) {
    headers['PayPal-Auth-Assertion'] = buildAuthAssertion(options.merchantId);
  }

  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal API error: ${res.status} ${text}`);
  }

  return res.json();
}

// --- Partner Referrals (Vendor Onboarding) ---

interface PartnerReferralResponse {
  links: Array<{ href: string; rel: string }>;
}

/**
 * Create a partner referral to onboard a vendor.
 * Returns the action_url where the vendor logs in / creates a PayPal Business account.
 */
export async function createPartnerReferral(
  vendorId: string,
  returnUrl: string
): Promise<string> {
  const data = await paypalFetch<PartnerReferralResponse>('/v2/customer/partner-referrals', {
    method: 'POST',
    body: {
      tracking_id: vendorId,
      partner_config_override: {
        return_url: returnUrl,
      },
      operations: [
        {
          operation: 'API_INTEGRATION',
          api_integration_preference: {
            rest_api_integration: {
              integration_method: 'PAYPAL',
              integration_type: 'THIRD_PARTY',
              third_party_details: {
                features: ['PAYMENT', 'REFUND'],
              },
            },
          },
        },
      ],
      products: ['EXPRESS_CHECKOUT'],
      legal_consents: [
        {
          type: 'SHARE_DATA_CONSENT',
          granted: true,
        },
      ],
    },
  });

  const actionLink = data.links.find(l => l.rel === 'action_url');
  if (!actionLink) {
    throw new Error('PayPal partner referral did not return an action_url');
  }
  return actionLink.href;
}

// --- Merchant Status ---

interface MerchantStatus {
  merchant_id: string;
  payments_receivable: boolean;
  primary_email_confirmed: boolean;
}

export async function getMerchantStatus(merchantId: string): Promise<MerchantStatus> {
  const partnerId = process.env.PAYPAL_PARTNER_MERCHANT_ID!;
  const data = await paypalFetch<{
    merchant_id: string;
    payments_receivable: boolean;
    primary_email_confirmed: boolean;
  }>(`/v1/customer/partners/${partnerId}/merchant-integrations/${merchantId}`);

  return {
    merchant_id: data.merchant_id,
    payments_receivable: data.payments_receivable ?? false,
    primary_email_confirmed: data.primary_email_confirmed ?? false,
  };
}

// --- Orders API ---

interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string }>;
}

/**
 * Create a PayPal order where money goes directly to the vendor.
 * Returns the order object with an `approve` link for the customer.
 */
export async function createOrder(
  merchantId: string,
  amount: number,
  description: string,
  returnUrl: string,
  cancelUrl: string
): Promise<PayPalOrder> {
  return paypalFetch<PayPalOrder>('/v2/checkout/orders', {
    method: 'POST',
    merchantId,
    body: {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2),
          },
          description,
          payee: {
            merchant_id: merchantId,
          },
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: 'SpontiCoupon',
        user_action: 'PAY_NOW',
      },
    },
  });
}

/**
 * Capture a PayPal order after the customer has approved it.
 */
export async function captureOrder(orderId: string, merchantId: string): Promise<PayPalOrder> {
  return paypalFetch<PayPalOrder>(`/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    merchantId,
  });
}

/**
 * Get order details to check payment status.
 */
export async function getOrderDetails(orderId: string, merchantId: string): Promise<PayPalOrder> {
  return paypalFetch<PayPalOrder>(`/v2/checkout/orders/${orderId}`, {
    merchantId,
  });
}

// --- Webhook Verification ---

/**
 * Verify a PayPal webhook signature by calling PayPal's verification endpoint.
 */
export async function verifyWebhookSignature(
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  const token = await getPayPalAccessToken();
  const webhookId = process.env.PAYPAL_WEBHOOK_ID!;

  const res = await fetch(`${getBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}
