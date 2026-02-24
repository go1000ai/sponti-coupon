const CACHE_NAME = 'sponticoupon-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: very conservative caching — only cache safe static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // NEVER intercept: auth, API, Supabase, Stripe, or non-http(s) requests
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/_next/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('stripe') ||
    url.protocol === 'chrome-extension:' ||
    url.protocol !== 'https:' && url.protocol !== 'http:'
  ) {
    return;
  }

  // For everything else: network-first, cache as fallback for offline only
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
