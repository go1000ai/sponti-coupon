/**
 * Google Analytics 4 event tracking utilities.
 * Call these from client components to track key user actions.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { gtag?: (...args: any[]) => void; } }

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
}

// ── Deal Events ──

export function trackDealView(dealId: string, dealTitle: string, dealType: string) {
  gtag('event', 'view_item', {
    item_id: dealId,
    item_name: dealTitle,
    item_category: dealType,
  });
}

export function trackDealClaim(dealId: string, dealTitle: string, dealPrice: number, dealType: string) {
  gtag('event', 'add_to_cart', {
    currency: 'USD',
    value: dealPrice,
    items: [{ item_id: dealId, item_name: dealTitle, item_category: dealType, price: dealPrice }],
  });
}

export function trackDealRedeem(dealId: string, dealTitle: string, dealPrice: number) {
  gtag('event', 'purchase', {
    currency: 'USD',
    value: dealPrice,
    transaction_id: dealId,
    items: [{ item_id: dealId, item_name: dealTitle, price: dealPrice }],
  });
}

// ── Auth Events ──

export function trackSignUp(method: string = 'email') {
  gtag('event', 'sign_up', { method });
}

export function trackLogin(method: string = 'email') {
  gtag('event', 'login', { method });
}

// ── Vendor Events ──

export function trackVendorSubscription(tier: string, interval: string, value: number) {
  gtag('event', 'purchase', {
    currency: 'USD',
    value,
    transaction_id: `sub_${Date.now()}`,
    items: [{ item_id: `plan_${tier}`, item_name: `${tier} Plan (${interval})`, price: value }],
  });
}

export function trackDealCreate(dealId: string, dealType: string) {
  gtag('event', 'deal_create', { deal_id: dealId, deal_type: dealType });
}

// ── Search & Navigation ──

export function trackSearch(searchTerm: string, resultsCount: number) {
  gtag('event', 'search', { search_term: searchTerm, results_count: resultsCount });
}

export function trackContactForm() {
  gtag('event', 'generate_lead', { currency: 'USD', value: 0 });
}

// ── Engagement ──

export function trackShare(method: string, contentType: string, itemId: string) {
  gtag('event', 'share', { method, content_type: contentType, item_id: itemId });
}
