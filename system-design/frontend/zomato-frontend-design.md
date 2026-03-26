# Design the frontend for Zomato (interview framing)

> **Scope:** Food-delivery variant of e-commerce design — geo-aware discovery, maps, emerging market constraints. For the generalized e-commerce pattern (PLP/PDP/cart/filters), see [Q6 — E-commerce](./q06-ecommerce-plp-pdp-cart.md).

[← Frontend prep index](./README.md)

**Zomato-class** clients combine **geo-aware discovery** (list + **map**), **rich restaurant pages**, **menus**, **cart & checkout**, **reviews**, and **order tracking**. Constraints: **emerging-market** networks, **mobile-first**, and **conversion** on food ordering paths.

---

## 1. Clarify scope (first 2 minutes)

- **Flows:** **Discovery** (home, search, filters) → **restaurant detail** → **menu + cart** → **checkout / payment** → **order status** ("live" map optional).
- **Markets:** India-heavy — **UPI**, COD, **regional** languages, **low-end devices** and spotty networks.
- **Maps:** **List–map split** or toggle; **cluster** pins at city zoom; **deep links** to restaurant.

**Non-functional:** **Fast first paint** on 3G; **small bundle** for main path; **LCP** for hero food imagery; **WCAG** for forms at checkout; **PII** hygiene on payment pages.

---

## 2. High-level architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         App Shell                              │
│     Location gate · Auth · Cart badge · Feature flags          │
└────┬──────────┬───────────────┬──────────────┬─────────────────┘
     │          │               │              │
 Discovery  Restaurant        Cart /        Order
 (SSR+CSR)  Detail + Menu   Checkout       Tracking
     │          │               │              │
     │       Menu list      localStorage    WebSocket /
     │      (virtual)        draft cart      SSE push
     │          │               │              │
     └──────────┴───────────────┴──────────────┘
                         │
            ┌────────────┴─────────────┐
            │   BFF (Backend for       │
            │   Frontend)              │
            │ Aggregates catalog +     │
            │ offers + ETA in 1 call   │
            └────────────┬─────────────┘
                         │
               CDN · Image service
               Maps SDK (lazy chunk)
```

| Layer | Role |
|--------|------|
| **App shell** | Location permission / **manual city**, auth, cart **badge**, promos band. |
| **Discovery** | **SSR or static** shell optional for SEO; **client** filters, sort, infinite list; **map** SDK isolated (lazy). |
| **Restaurant** | Hero, offers, **menu sections** (accordion / virtualized long menus), allergens tooltips if needed. |
| **Cart** | **Optimistic** add/remove; **multi-restaurant** policy (usually blocked) — business rule surfaced clearly. |
| **Checkout** | Address book, slot/time, payment WebView / **redirect** flows, **3DS** handling. |
| **Order tracking** | Polling or **push** for status; **ETA** display; support chat link. |

**Data:** **BFF** common — aggregates **catalog + offers + delivery ETA** into one response per screen to cut chatter on slow networks.

---

## 3. Core UX flows with code

### 3A. Geo-aware discovery — location → nearby restaurants, clustered map

```tsx
// Step 1: Acquire location with graceful fallback
async function getUserLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        // Fallback: show city picker modal; use last cached location if available
        const cached = localStorage.getItem('lastLocation');
        if (cached) resolve(JSON.parse(cached));
        else reject(new Error('Location unavailable'));
      },
      { timeout: 5000, maximumAge: 60_000 }
    );
  });
}

// Map view: lazy-load the heavy map SDK only when user switches to map mode
const MapView = lazy(() => import('./MapView')); // ~150 kB Leaflet chunk

function RestaurantMap({ restaurants }: { restaurants: Restaurant[] }) {
  // Cluster pins at lower zoom levels to avoid marker overload
  const clusters = useMarkerClustering(restaurants, { maxZoom: 14 });

  return (
    <Suspense fallback={<MapSkeleton />}>
      <MapView
        clusters={clusters}
        onBoundsChange={debounce((bbox: BBox) => {
          // Refetch restaurants visible in current map viewport
          // Debounce to avoid thrashing on pan
          fetchRestaurantsInBbox(bbox);
        }, 400)}
        onPinClick={(restaurantId) => {
          // Sync map pin selection with list card highlight
          setSelectedRestaurantId(restaurantId);
        }}
      />
    </Suspense>
  );
}
```

### 3B. Restaurant list — virtualized, filter/sort, URL-as-filter-state

```tsx
// URL is the source of truth for filters — shareable, bookmarkable
// e.g. /restaurants?cuisine=Indian&sort=rating&veg=true&lat=12.9&lng=77.6

function useFilterState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: FilterState = {
    cuisine: searchParams.get('cuisine') ?? '',
    sort: (searchParams.get('sort') as SortOption) ?? 'relevance',
    vegOnly: searchParams.get('veg') === 'true',
    maxDeliveryTime: Number(searchParams.get('maxTime')) || undefined,
    minRating: Number(searchParams.get('rating')) || undefined,
  };

  const setFilter = (key: keyof FilterState, value: unknown) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, String(value));
      else next.delete(key);
      return next;
    }, { replace: true }); // replace not push — don't bloat back stack
  };

  return { filters, setFilter };
}

// Virtualized restaurant list — handles hundreds of results without jank
function RestaurantList({ filters }: { filters: FilterState }) {
  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: ['restaurants', filters],
    queryFn: ({ pageParam = 0 }) =>
      fetchRestaurants({ ...filters, offset: pageParam }),
    getNextPageParam: (last, pages) =>
      last.hasMore ? pages.length * 20 : undefined,
  });

  const restaurants = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <WindowScroller>
      {({ isScrolling, scrollTop }) => (
        <List
          autoHeight
          height={window.innerHeight}
          rowCount={restaurants.length}
          rowHeight={120}
          scrollTop={scrollTop}
          isScrolling={isScrolling}
          rowRenderer={({ index, key, style }) => (
            <RestaurantCard
              key={key}
              style={style}
              restaurant={restaurants[index]}
              isSelected={selectedId === restaurants[index].id}
            />
          )}
          onRowsRendered={({ overscanStopIndex }) => {
            if (overscanStopIndex >= restaurants.length - 5) fetchNextPage();
          }}
        />
      )}
    </WindowScroller>
  );
}
```

### 3C. Menu — virtualized grouped list with sticky category headers

```tsx
// Menu can have 200+ items in 15+ categories — must virtualize
// Sticky headers for categories improve scannability

function RestaurantMenu({ menu }: { menu: MenuCategory[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten for virtualization but track which indices are headers
  const flatItems = useMemo(() => {
    const items: FlatMenuItem[] = [];
    menu.forEach((category) => {
      const filteredItems = category.items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filteredItems.length === 0) return; // hide category if no search results

      items.push({ type: 'header', category });
      filteredItems.forEach((item) => items.push({ type: 'item', item, category }));
    });
    return items;
  }, [menu, searchQuery]);

  const isSticky = (index: number) => flatItems[index].type === 'header';

  return (
    <>
      {/* Inline search — filter menu without a page transition */}
      <input
        placeholder="Search menu..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Category pills: quick-scroll navigation */}
      <CategoryPillsNav
        categories={menu.map((c) => c.name)}
        onSelect={(name) => scrollToCategory(name)}
      />

      <List
        rowCount={flatItems.length}
        rowHeight={({ index }) => (isSticky(index) ? 48 : 96)}
        rowRenderer={({ index, style }) => {
          const item = flatItems[index];
          return item.type === 'header'
            ? <CategoryHeader key={item.category.id} style={style} category={item.category} />
            : <MenuItemCard key={item.item.id} style={style} item={item.item} />;
        }}
        // Sticky row implementation: re-render header at top as fixed element
        noRowsRenderer={() => <EmptySearch query={searchQuery} />}
      />
    </>
  );
}
```

### 3D. Cart — localStorage draft, optimistic add, debounced sync

```tsx
// Cart state: localStorage as persistent draft, server as authoritative for price
// This is critical for emerging markets — users often switch apps mid-order

const cartAtom = atomWithStorage<CartState>('zomato_cart', {
  restaurantId: null,
  items: {},
  lastUpdated: 0,
});

function useCart() {
  const [cart, setCart] = useAtom(cartAtom);

  // Debounced sync: don't hit server on every tap
  const syncToServer = useDebouncedCallback(async (items: CartItems) => {
    const quote = await api.quoteCart({ items });
    // Server quote is authoritative: update taxes, fees, delivery charge
    setCart((prev) => ({ ...prev, serverQuote: quote }));
  }, 800);

  const addItem = (item: MenuItem, quantity: number) => {
    // Block cross-restaurant cart — show confirmation modal
    if (cart.restaurantId && cart.restaurantId !== item.restaurantId) {
      confirmClearCart().then((confirmed) => {
        if (confirmed) setCart({ restaurantId: item.restaurantId, items: {}, lastUpdated: Date.now() });
      });
      return;
    }

    setCart((prev) => {
      const next = {
        ...prev,
        restaurantId: item.restaurantId,
        items: {
          ...prev.items,
          [item.id]: { ...item, quantity: (prev.items[item.id]?.quantity ?? 0) + quantity },
        },
        lastUpdated: Date.now(),
      };
      syncToServer(next.items); // debounced server sync
      return next;
    });
  };

  const totalItemCount = Object.values(cart.items).reduce((s, i) => s + i.quantity, 0);

  return { cart, addItem, totalItemCount };
}

// Sticky cart CTA: always visible while browsing menu
function StickyCartButton() {
  const { cart, totalItemCount } = useCart();
  if (totalItemCount === 0) return null;

  return (
    <div className="sticky-cart-cta">
      <span>{totalItemCount} item{totalItemCount > 1 ? 's' : ''}</span>
      <span>{formatPrice(cart.serverQuote?.subtotal ?? localSubtotal(cart))}</span>
      <button onClick={() => navigate('/checkout')}>View Cart</button>
    </div>
  );
}
```

### 3E. Order tracking — WebSocket real-time position, delivery marker

```tsx
// Real-time delivery tracking: WebSocket for position updates
function useOrderTracking(orderId: string) {
  const [trackingState, setTrackingState] = useState<TrackingState>({
    status: 'confirmed',
    deliveryLocation: null,
    eta: null,
  });

  useEffect(() => {
    const ws = new WebSocket(`wss://tracking.zomato.com/order/${orderId}`);

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data) as TrackingUpdate;

      setTrackingState({
        status: update.status,             // confirmed → preparing → picked_up → nearby → delivered
        deliveryLocation: update.location, // { lat, lng } of delivery partner
        eta: update.etaSeconds,
      });
    };

    ws.onerror = () => {
      // Graceful fallback: poll every 15 s if WebSocket fails
      startPolling(orderId, setTrackingState);
    };

    return () => ws.close();
  }, [orderId]);

  return trackingState;
}

function OrderTrackingMap({ orderId }: { orderId: string }) {
  const { deliveryLocation, status, eta } = useOrderTracking(orderId);

  return (
    <div className="tracking-container">
      <StatusTimeline currentStatus={status} />
      <ETABanner seconds={eta} />

      <Suspense fallback={<MapSkeleton />}>
        <MapView center={deliveryLocation}>
          <DeliveryMarker position={deliveryLocation} animate />
          <RestaurantMarker position={restaurant.location} />
          <UserMarker position={userAddress.location} />
        </MapView>
      </Suspense>

      <SupportChatButton orderId={orderId} />
    </div>
  );
}
```

### 3F. Emerging market — 2G/3G fallback, code splitting, Service Worker

```tsx
// Route-level code splitting: each route loads only what it needs
// Discovery (~40 kB) loads before restaurant detail (~60 kB)
const Discovery = lazy(() => import('./routes/Discovery'));
const RestaurantDetail = lazy(() => import('./routes/RestaurantDetail'));
const Checkout = lazy(() => import('./routes/Checkout'));
const OrderTracking = lazy(() => import('./routes/OrderTracking'));

// Maps are the heaviest chunk — always lazy, only load on first use
// Leaflet: ~150 kB; Google Maps SDK: larger but better cluster support
const MapView = lazy(() => import('./components/MapView'));

// Service Worker: cache-first for static assets, stale-while-revalidate for menu
// workbox-webpack-plugin config (vite-plugin-pwa equivalent):
//
// runtimeCaching: [
//   { urlPattern: /\/api\/menu\//, handler: 'StaleWhileRevalidate',
//     options: { cacheName: 'menu-cache', expiration: { maxAgeSeconds: 300 } } },
//   { urlPattern: /\/api\/restaurants\//, handler: 'NetworkFirst',
//     options: { cacheName: 'restaurant-cache', networkTimeoutSeconds: 3 } },
// ]

// Network-aware image loading: serve smaller images on slow connections
function SmartImage({ src, alt, sizes }: SmartImageProps) {
  const connection = navigator.connection;
  const is2G = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';

  // On 2G: load 200px thumbnail only; on 3G+: load 400px; on WiFi/4G: 800px
  const targetWidth = is2G ? 200 : connection?.effectiveType === '3g' ? 400 : 800;

  return (
    <img
      src={`${src}?w=${targetWidth}&fmt=webp&q=${is2G ? 60 : 80}`}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

// Reduce prefetch budget on metered/slow connections
function usePrefetchPolicy() {
  const connection = navigator.connection;
  const isSlow = ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '');
  const isSaveData = connection?.saveData === true;

  return {
    shouldPrefetch: !isSlow && !isSaveData,
    imageQuality: isSlow ? 'low' : 'high',
    prefetchRadius: isSlow ? 0 : 3, // how many next list items to prefetch
  };
}
```

---

## 4. Maps library trade-off

| Library | Upside | Cost |
|---------|--------|------|
| **Leaflet + OSM** | Free, ~150 kB, open data | Fewer features, clustering via plugin |
| **Google Maps JS SDK** | Best cluster, POI density, Street View | ~300 kB+, per-request billing at scale |
| **Mapbox GL** | Vector tiles, custom styling, offline | Billing model, ~250 kB |

**Recommendation for Zomato-scale:** Start with Leaflet + Leaflet.markercluster for cost efficiency. Migrate to Google Maps if rich POI data and turn-by-turn previews become requirements. Always lazy-load the entire chunk.

---

## 5. Trade-offs & failure modes

| Choice | Upside | Cost |
|--------|--------|------|
| SSR for discovery | SEO, fast first paint | TTFB + edge cache invalidation complexity |
| Client-side filters | Instant UX, no round trip | Large catalog payload unless server returns facets |
| Leaflet over Google Maps | Zero cost, open data | Less accurate ETAs, weaker clustering at scale |
| Always-on map | Exploration, spatial UX | 150–300 kB extra chunk, GPU, battery |
| Real-time tracking WS | Live ETA feels premium | Battery drain on long waits; fall back to polling |
| Aggressive image compression | Fast on 2G | Quality degradation visible on good screens |
| localStorage cart | Survives app switches | Stale if prices change; require server re-quote at checkout |

**Failure modes and mitigations:**

- **Location denied:** Show city picker modal; pre-populate from IP geolocation as soft default.
- **API outage mid-checkout:** Preserve cart in localStorage. Show "Something went wrong" with a retry rather than losing the order.
- **Price changed between add and checkout:** Server re-quote at checkout start; show `PriceChangedModal` with diff before allowing payment.
- **WebSocket unavailable:** Fall back to 15-second polling for order status. User sees slightly stale ETA but flow continues.
- **Payment redirect fails:** 3DS callbacks must be idempotent; detect duplicate order creation and deduplicate by client-generated order token.
- **Menu fails to load:** Show cached version (via Service Worker stale-while-revalidate) with "Menu may be outdated" badge.

---

## 6. Observability

- **RUM on checkout funnel:** Track drop-off at each step (cart → address → payment → confirm). Even a 5% drop at payment input indicates UX friction.
- **Feature timers:** Instrument `menu:render` (time from route enter to last menu section visible), `search:first-result` latency.
- **Source maps:** Upload to Sentry; crash groups by component. Critical for diagnosing payment page failures without leaking PII.
- **Core Web Vitals per route:** Discovery LCP target ≤ 2.5 s on simulated 3G; Checkout FID target ≤ 100 ms.

---

## 7. Closing statement

"Zomato's frontend optimizes the **discovery → menu → checkout** funnel on **slow, metered networks**: a BFF aggregates catalog, offers, and delivery ETA into single-screen payloads to cut round trips; the map SDK is lazy-loaded (~150 kB) and only activated on toggle; restaurant lists and menus are **virtualized** with URL-as-filter-state for shareability; the **cart is localStorage-persisted** with debounced server sync and a mandatory re-quote at checkout to handle price drift; and **order tracking** uses WebSocket with a polling fallback. The entire bundle is aggressively code-split — discovery loads under 50 kB JS — and Service Worker provides stale-while-revalidate menu caching for the flaky-network reality of emerging markets."
