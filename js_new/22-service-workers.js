/**
 * Q22. Service Workers for offline support and cache strategies
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS A SERVICE WORKER?
 * ──────────────────────────
 * A Service Worker (SW) is a JS script that runs in a background thread,
 * separate from the main page. It acts as a programmable NETWORK PROXY between
 * your app and the network.
 *
 * Key traits:
 *  • Runs off the main thread (no DOM access)
 *  • Persists across page loads (registered once, runs in background)
 *  • Can intercept all fetch requests from your origin
 *  • Has access to the Cache API (a key-value store of Request/Response pairs)
 *  • Requires HTTPS (+ localhost for dev)
 *  • Has a lifecycle: install → activate → fetch
 *
 * USE CASES
 * ──────────
 *  ✅ Offline support (serve cached assets when network is unavailable)
 *  ✅ Background sync (queue mutations, sync when online)
 *  ✅ Push notifications
 *  ✅ Precaching app shell (instant repeat visits)
 *  ✅ Performance (serve resources from cache, avoid network)
 */

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE WORKER LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────
/*
  1. Registration (in your app):
     navigator.serviceWorker.register('/sw.js')

  2. Install event (sw.js):
     → Precache static assets (app shell)
     → Fires once when new SW is installed

  3. Activate event (sw.js):
     → Clean up old caches from previous versions
     → Fires when SW takes control

  4. Fetch event (sw.js):
     → Intercepts every network request
     → Decide: from cache? from network? both?
*/

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION (main thread / app entry point)
// ─────────────────────────────────────────────────────────────────────────────
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none", // always check for SW updates (don't use HTTP cache)
    });
    console.log("SW registered:", reg.scope);

    // Check for updates periodically
    setInterval(() => reg.update(), 60 * 60 * 1000); // every hour
  } catch (err) {
    console.error("SW registration failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE WORKER FILE (sw.js)
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME     = "app-v1";
const PRECACHE_URLS  = [
  "/",
  "/index.html",
  "/styles/main.css",
  "/scripts/app.js",
  "/fonts/inter.woff2",
  "/images/logo.svg",
];

// ── INSTALL: precache the app shell ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Precaching app shell");
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting(); // activate immediately (don't wait for old SW to go away)
});

// ── ACTIVATE: clean up old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME) // delete old versions
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // take control of existing pages immediately
});

// ─────────────────────────────────────────────────────────────────────────────
// CACHING STRATEGIES
// ─────────────────────────────────────────────────────────────────────────────

// 1. CACHE FIRST (Cache → Network fallback)
//    Best for: static assets (JS, CSS, fonts, images)
//    → Fastest; serves from cache; only hits network on miss
function cacheFirst(request, cacheName) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      const clone = response.clone();
      caches.open(cacheName).then((cache) => cache.put(request, clone));
      return response;
    });
  });
}

// 2. NETWORK FIRST (Network → Cache fallback)
//    Best for: HTML pages, API data where freshness matters
//    → Always tries network; falls back to cache if offline
function networkFirst(request, cacheName) {
  return fetch(request)
    .then((response) => {
      const clone = response.clone();
      caches.open(cacheName).then((cache) => cache.put(request, clone));
      return response;
    })
    .catch(() => caches.match(request));
}

// 3. STALE WHILE REVALIDATE (Cache immediately + update in background)
//    Best for: non-critical data where speed + freshness both matter
//    → Instant response from cache, silently updates cache from network
function staleWhileRevalidate(request, cacheName) {
  const fetchAndCache = fetch(request).then((response) => {
    caches.open(cacheName).then((cache) => cache.put(request, response.clone()));
    return response;
  });

  return caches.match(request).then((cached) => {
    fetchAndCache.catch(() => {}); // revalidate in background
    return cached ?? fetchAndCache; // return cached immediately if available
  });
}

// 4. CACHE ONLY (Cache only, never network)
//    Best for: precached resources during install
function cacheOnly(request) {
  return caches.match(request);
}

// 5. NETWORK ONLY (No caching)
//    Best for: sensitive requests (authentication, analytics, POST)
function networkOnly(request) {
  return fetch(request);
}

// ── FETCH: route requests to strategies ──────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request }  = event;
  const url          = new URL(request.url);

  // Skip non-GET requests and cross-origin requests
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // HTML → network first (always fresh page)
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(request, "pages-cache"));
    return;
  }

  // Hashed static assets → cache first (immutable)
  if (/\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, "static-assets"));
    return;
  }

  // API data → stale while revalidate
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(staleWhileRevalidate(request, "api-cache"));
    return;
  }

  // Images → cache first with fallback placeholder
  if (/\.(webp|avif|png|jpg|jpeg|svg)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, "images"));
    return;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WORKBOX (Google's SW library — recommended for production)
// ─────────────────────────────────────────────────────────────────────────────
/*
  Workbox automates everything above with simpler APIs:

  // sw.js with Workbox
  import { registerRoute, Route } from 'workbox-routing';
  import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
  import { ExpirationPlugin } from 'workbox-expiration';

  // Static assets
  registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new CacheFirst({ cacheName: 'static-resources' })
  );

  // Images
  registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
      cacheName: 'images',
      plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    })
  );

  // API calls
  registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new StaleWhileRevalidate({ cacheName: 'api-cache' })
  );

  Workbox Webpack plugin also handles precaching automatically.
*/

/**
 * STRATEGY CHEAT SHEET
 * ─────────────────────
 *  Cache First         → static assets with content hashes
 *  Network First       → HTML pages, critical fresh API data
 *  Stale While Reval.  → non-critical API, user-generated content
 *  Cache Only          → app shell during offline (after install)
 *  Network Only        → auth, payment, analytics, POST requests
 */
