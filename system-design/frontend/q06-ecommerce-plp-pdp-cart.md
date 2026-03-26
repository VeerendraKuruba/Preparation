# Q6. E-commerce: PLP → PDP → cart

**Prompt variants:** **Amazon**-style listing, product page, cart — including **faceted filters, sort, and huge listings** (SEO + virtualization).

[← Question index](./README.md)

**Focus area:** [Filters & listing at scale](#filters-and-listing-at-scale) — faceted nav, URL state, virtualization.

---

### One-line mental model

**URL is product state** for SEO and shareability; the client **streams** above-the-fold first, **virtualizes** long grids, and treats **cart as a set of optimistic actions reconciled against idempotent server state** — the cart is never fully trusted on the client alone.

---

### Clarify scope in the interview

Before drawing anything, nail down:
- **Guest checkout vs. authenticated** — Guest carts live in a cookie/localStorage; on login they must merge with the server cart.
- **SEO must-win pages** — PLP and PDP need to be crawlable. CSR-only means Googlebot sees nothing.
- **International pricing / locale** — Currency and locale must be in the URL or a stable CDN cache key, not a cookie, to avoid serving wrong prices from edge.
- **Inventory model** — Soft reserve on add-to-cart, or hard reserve only at checkout? This determines how you handle `409 Conflict`.
- **Scale of catalog** — 1 000 SKUs: no virtualization needed. 1 000 000 SKUs: server-side pagination + cursor, client virtualizes the current page.

---

### Goals & requirements

**Functional**
- Faceted filter sidebar (color, size, brand, price range, rating)
- Sort (relevance, price asc/desc, newest, rating)
- PLP: product grid with images, names, prices, ratings
- PDP: hero image, image carousel, size/variant picker, add to cart, reviews tab
- Cart: add/remove/update quantity, promo code, checkout CTA

**Non-functional**
- PLP and PDP fully crawlable by search engines (LCP < 2.5 s)
- Zero layout shift on image grids (CLS = 0)
- Cart operations feel instant (optimistic UI)
- Filter state is shareable via URL copy-paste
- Cart survives tab refresh and device switch (server-persisted)

---

### High-level frontend architecture

```
Browser
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  URL: /search?q=shoes&color=red&size=10&sort=price_asc&page=2      │
│          │                                                          │
│          ▼                                                          │
│  ┌──────────────────────────────────┐  ┌────────────────────────┐  │
│  │   PLP (SSR/ISR at Edge)          │  │  Cart Drawer (CSR)     │  │
│  │  ┌─────────────┐ ┌────────────┐  │  │  ┌──────────────────┐  │  │
│  │  │Filter       │ │ Product    │  │  │  │ Line items       │  │  │
│  │  │Sidebar      │ │ Grid       │  │  │  │ (optimistic)     │  │  │
│  │  │(URL-synced) │ │(virtualized│  │  │  └──────────────────┘  │  │
│  │  └─────────────┘ │ + lazy img)│  │  │  ┌──────────────────┐  │  │
│  │                  └────────────┘  │  │  │ Reconcile on     │  │  │
│  └──────────────────────────────────┘  │  │ server response  │  │  │
│                                        │  └──────────────────┘  │  │
│  ┌──────────────────────────────────┐  └────────────────────────┘  │
│  │   PDP (SSR/ISR at Edge)          │                              │
│  │  Hero image (LCP) → Gallery →    │                              │
│  │  Variant picker → Buy box →      │                              │
│  │  Reviews tab (lazy)              │                              │
│  └──────────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
          │ SSR HTML              │ /cart API          │ /products API
          ▼                       ▼                     ▼
    Edge CDN               Cart Service           Product/Search
    (ISR, Vary: locale)    (idempotent POST)       Service (BFF)
```

**Rendering strategy per surface:**

| Surface | Strategy | Reason |
|---|---|---|
| PLP popular filters | ISR / edge-cached SSR | Crawlable, cacheable, fast TTFB |
| PLP long-tail filters | SSR on-demand (cache miss) | Too many combos to pre-build |
| PDP | ISR with short TTL (60 s) | Price/inventory changes frequently |
| Cart drawer | CSR only | User-specific, never cached |
| Reviews tab | Lazy CSR | Below fold, not SEO-critical |

---

### What the client does (core mechanics)

#### 1. URL as the single source of truth for all filter state

Every filter dimension maps to a query param. Checking a checkbox updates the URL; the URL drives the fetch. This makes filters shareable, bookmarkable, and back-button safe.

```js
// Parse current URL into filter state
function parseFiltersFromURL(searchParams) {
  return {
    query:    searchParams.get('q') ?? '',
    colors:   searchParams.getAll('color'),       // repeated keys: ?color=red&color=blue
    sizes:    searchParams.getAll('size'),
    brands:   searchParams.getAll('brand'),
    priceMin: Number(searchParams.get('priceMin') ?? 0),
    priceMax: Number(searchParams.get('priceMax') ?? Infinity),
    sort:     searchParams.get('sort') ?? 'relevance',
    page:     Number(searchParams.get('page') ?? 1),
  };
}

// Sync filter changes back to URL — debounced so every checkbox doesn't spam history
const debouncedPush = debounce((params) => {
  const url = new URL(window.location);
  // Rebuild params in canonical order so CDN cache key is stable
  url.search = '';
  if (params.query)    url.searchParams.set('q', params.query);
  params.colors.forEach(c => url.searchParams.append('color', c));
  params.sizes.forEach(s  => url.searchParams.append('size', s));
  params.brands.forEach(b => url.searchParams.append('brand', b));
  if (params.priceMin) url.searchParams.set('priceMin', params.priceMin);
  if (params.priceMax !== Infinity) url.searchParams.set('priceMax', params.priceMax);
  url.searchParams.set('sort', params.sort);
  // Use replaceState while filter panel is open; pushState on "Apply"
  history.pushState(null, '', url.toString());
}, 300);

// On URL change (popstate or programmatic), re-fetch products
window.addEventListener('popstate', () => {
  const filters = parseFiltersFromURL(new URLSearchParams(window.location.search));
  fetchProducts(filters);
});
```

#### 2. Virtualized product grid

Rendering 1 000 product cards into the DOM simultaneously kills scroll performance. Virtualization renders only the rows visible in the viewport plus a small overscan buffer.

```js
// Simplified virtual grid (react-window style)
function VirtualGrid({ items, rowHeight, columns, containerHeight }) {
  const [scrollTop, setScrollTop] = useState(0);
  const overscan = 2; // render 2 extra rows above and below viewport

  const totalRows = Math.ceil(items.length / columns);
  const startRow  = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow    = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan);

  const visibleItems = [];
  for (let row = startRow; row < endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const idx = row * columns + col;
      if (idx < items.length) visibleItems.push({ item: items[idx], row, col });
    }
  }

  return (
    <div
      style={{ height: containerHeight, overflowY: 'auto', position: 'relative' }}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* Spacer that gives the scrollbar correct total height */}
      <div style={{ height: totalRows * rowHeight }} />
      {visibleItems.map(({ item, row, col }) => (
        <ProductCard
          key={item.id}
          item={item}
          style={{
            position: 'absolute',
            top:  row * rowHeight,
            left: `${(col / columns) * 100}%`,
            width: `${100 / columns}%`,
          }}
        />
      ))}
    </div>
  );
}

// Images: always reserve aspect ratio to prevent CLS
// <img style={{ aspectRatio: '4/3', width: '100%' }} loading="lazy" />
```

#### 3. Abort in-flight requests on filter change

When the user changes a filter, the previous results fetch is stale. Abort it immediately so stale results don't arrive and paint over the new ones.

```js
let currentController = null;

async function fetchProducts(filters) {
  if (currentController) currentController.abort();
  currentController = new AbortController();

  // Reset scroll position — new filter = new result set
  window.scrollTo({ top: 0 });

  try {
    const res = await fetch(buildSearchURL(filters), {
      signal: currentController.signal,
    });
    const data = await res.json();
    setProducts(data.items);
    setFacets(data.facets);
  } catch (err) {
    if (err.name === 'AbortError') return; // expected — filter changed mid-flight
    showErrorBanner();
  }
}
```

#### 4. Optimistic add-to-cart with server reconciliation

The cart action must feel instant. Optimistically add the item, then fire the server request. On conflict (item out of stock, price changed), reconcile with clear UX.

```js
// Cart state lives in a client store + server
async function addToCart(product, variantId, quantity = 1) {
  const tempId = `temp-${Date.now()}`;

  // 1. Optimistically add to local cart state immediately
  dispatch({ type: 'CART_ADD_OPTIMISTIC', payload: { tempId, product, variantId, quantity } });
  openCartDrawer();

  try {
    // 2. Fire idempotent POST with idempotency key
    const res = await fetch('/api/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `${sessionId}-${variantId}-${Date.now()}`,
      },
      body: JSON.stringify({ variantId, quantity }),
    });

    if (res.status === 409) {
      // Conflict: out of stock or quantity cap
      const { reason, availableQty } = await res.json();
      dispatch({ type: 'CART_RECONCILE', payload: { tempId, availableQty } });
      showInlineError(`Only ${availableQty} left in stock`);
      return;
    }

    const serverItem = await res.json();
    // 3. Replace temp item with confirmed server line item (has real lineId)
    dispatch({ type: 'CART_CONFIRM', payload: { tempId, serverItem } });

  } catch (err) {
    // 4. Network failure: roll back optimistic add
    dispatch({ type: 'CART_ROLLBACK', payload: { tempId } });
    showToast('Could not add to cart. Please try again.');
  }
}
```

#### 5. Guest → logged-in cart reconciliation

When a guest user adds items and then logs in, the guest cart (stored in a cookie or localStorage) must merge with any existing server cart.

```js
async function reconcileCartOnLogin(guestCartToken, userId) {
  // POST to a merge endpoint — backend handles conflict resolution
  const res = await fetch('/api/cart/merge', {
    method: 'POST',
    body: JSON.stringify({ guestToken: guestCartToken, userId }),
  });
  const mergedCart = await res.json();
  // Replace client state with merged authoritative server cart
  dispatch({ type: 'CART_REPLACE', payload: mergedCart });
  // Clear guest token
  localStorage.removeItem('guestCartToken');
}
```

#### 6. PDP: hero image as LCP candidate

```html
<!-- LCP: preload the hero, use fetchpriority=high, no lazy loading -->
<link rel="preload" as="image" href="/products/shoe-red-800.webp" fetchpriority="high" />

<img
  src="/products/shoe-red-800.webp"
  srcset="/products/shoe-red-400.webp 400w,
          /products/shoe-red-800.webp 800w,
          /products/shoe-red-1600.webp 1600w"
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Red running shoe, side view"
  fetchpriority="high"
  width="800" height="600"
/>
<!-- width + height prevents CLS. Reviews tab is lazy: -->
<details>
  <summary>Reviews</summary>
  <!-- Load reviews only when tab is expanded -->
</details>
```

---

### Filters and listing at scale

This section applies when the prompt stresses facet filters, sort, or a very large catalog.

1. **URL as source of truth** — All filter dimensions encode to canonical query params. Define param order so identical filter sets produce identical URLs (CDN cache key stability). Use `replaceState` while the filter panel is open; `pushState` only on explicit "Apply" or panel close.

2. **Dependent facets** — When one facet changes (e.g., selecting "Nike" under brand), the counts for other facets (size, color) update based on the constrained result set. Either refetch facet metadata on each change, or accept stale counts with a "refresh" indicator. Disable facet values that would return zero results if the API supports constrained facet graphs.

3. **Request churn control** — On filter change: abort the previous fetch, reset scroll to top, and **key** the virtual list by the serialized filter state so React does not recycle rows from an incompatible previous query into the new result set.

4. **Pagination under infinite scroll** — Use cursor-based pagination for CSR infinite scroll (cursor is the last item ID, not a page number). Use offset pagination only when SSR HTML must align with bot crawling. Cap how many pages are held in memory; drop far pages from the client store when the user has scrolled far enough.

5. **Mobile filter sheet** — Use a bottom sheet / drawer. "Apply" button reduces API calls vs instant-apply (which fires on every checkbox). Sync sheet state back to the URL on Apply.

---

### Trade-offs

| Decision | Option A | Option B | Reasoning |
|---|---|---|---|
| **Filter state location** | URL query params | Redux/Zustand state only | URL wins: shareable, SEO-friendly, back-button safe; Redux is a secondary mirror |
| **Filter application** | Server-side (re-fetch on change) | Client-side (filter already-fetched results) | Server-side: accurate counts, handles 1M products; client-side: instant but only works on current page |
| **PLP rendering** | Full SSR on every request | ISR (static + revalidate) | ISR: fast TTFB from edge cache; use shorter TTL for time-sensitive data (price/stock) |
| **Cart storage** | LocalStorage only | Server-persisted (DB) + local cache | Server: cross-device, survives browser clear; local: optimistic UI layer on top |
| **Image loading** | Eager load all | Lazy load below fold, `fetchpriority=high` on hero | Priority on hero for LCP; lazy for grid images to save bandwidth |
| **Infinite scroll vs pagination** | Infinite scroll | Page numbers | Infinite scroll: better engagement; page numbers: SEO (each page has a URL), deep linking, back button |

---

### Failure modes & degradation

| Failure | Degradation strategy |
|---|---|
| Facet service down | Render PLP without facets; show "Filters temporarily unavailable" banner; allow browsing without filtering |
| Search service timeout | Show cached previous results with stale indicator; retry with shorter timeout |
| Cart API 500 | Roll back optimistic update; show toast with retry CTA; queue the action for retry |
| PDP inventory API down | Show "Check availability" CTA that hits inventory on demand; do not block page render |
| Image CDN failure | `onerror` fallback to placeholder SVG; no broken img icons |
| Payment service down at checkout | Surface error at cart, not deep in checkout funnel |

---

### Accessibility checklist

- Filter changes announce result count update via `aria-live="polite"` region
- Sort dropdown is a `<select>` or has proper `role="listbox"` + keyboard navigation
- Product gallery carousel: arrow keys cycle images; `aria-roledescription="carousel"`
- "Added to cart" action announces to screen reader immediately after optimistic update
- Focus management: after "Add to cart" button fires, move focus to cart icon/drawer open button
- Price ranges are announced as "Price: $20 to $80" not "$20 - $80" (screen reader reads hyphen oddly)

---

### What to draw (whiteboard)

```
URL → Filter state → Fetch → Render flow
────────────────────────────────────────────────────────────
 User checks "Red" checkbox
         │
         ▼
 filterState.colors = ['red']  (local state update, instant)
         │
         ▼  debounce 300ms
 URL: /search?q=shoes&color=red&sort=relevance
         │
         ▼
 Abort previous fetch (AbortController)
         │
         ▼
 GET /api/search?q=shoes&color=red&sort=relevance
         │
         ▼
 { items: [...], facets: { size: { 10: 45, 11: 30 }, brand: {...} } }
         │
         ├──► Update virtual grid (keyed by filter state, no row recycling)
         └──► Update facet sidebar counts
```

```
Optimistic cart flow
────────────────────────────────────────────────────────────
 User clicks "Add to Cart"
         │
         ├──► (instant) Add temp item to client cart state
         ├──► Open cart drawer
         │
         └──► POST /api/cart/items (async)
                    │
              ┌─────┴─────┐
              │           │
            200 OK      409 Conflict
              │           │
           Replace       Show "Only N left"
           temp with      + update qty
           server item
```

---

### Suggested time boxes (60-minute round)

| Block | Minutes | Focus |
|---|---:|---|
| Clarify + requirements | 8–12 | Guest vs account, locales, SEO must-haves, inventory rules |
| High-level architecture | 12–18 | PLP/PDP rendering strategy, URL design, cart service boundary |
| Deep dive 1 | 12–18 | SEO + URL/filter state, or PLP virtualization |
| Deep dive 2 | 12–18 | Filters/facets + virtualization, or cart, or PDP media |
| Trade-offs, failure, metrics | 8–12 | Degraded faceted nav, observability |

---

### Deep dives — pick 2

**A. SEO & routing** — SSR/ISR vs CSR; canonical URLs for filtered views; duplicate content pitfalls (color=red vs color=RED); structured data (Product schema, BreadcrumbList — mention briefly); robots.txt to block low-value filter combos; bot vs human strategy.

**B. Filters & facets** — Dependent counts; debounced URL updates vs instant-apply; abort + resync on facet change; inclusive vs exclusive facet UX; price slider debouncing (use `onMouseUp`, not `onChange`); facet API down → browse without facets banner.

**C. PLP performance** — Virtualized grid for large counts; skeleton vs empty state; image lazy load with fixed aspect ratio for CLS; memory cap for infinite scroll (drop far pages); request abort on filter change.

**D. PDP media** — Single LCP candidate with `fetchpriority=high`; `srcset`/`sizes` for responsive images; carousel a11y (arrow keys, aria labels); zoom/lightbox trade-off (lightbox adds accessibility complexity, use native `<dialog>`).

**E. Cart correctness** — Idempotent POST with idempotency key (prevents double-add on retry); merge server cart on load; concurrency across two tabs (broadcast channel to sync); inventory 409 → inline fix UX; guest → login merge.

Pick any two; **B + C** pair well for filter + listing scale prompts.

---

### Common follow-ups

- **"Wishlist?"** — Separate surface with same isolation patterns. Auth required; guest wishlist can be stored locally and merged on login (same pattern as cart).
- **"A/B tests on PLP?"** — Assign cohort at edge (cookie set by CDN); stable assignment per user; use `Vary: X-AB-Cohort` header for CDN caching; mitigate flash-of-wrong-variant with SSR cohort-aware HTML, not client-side swap.
- **"International pricing?"** — Locale and currency in the URL path or stable header (`/en-US/search?...`). Never rely on a cookie that varies per user for CDN cache keys — you will serve wrong prices. Backend returns pre-formatted price strings (never format currency client-side with raw numbers from the API).

---

### What you'd measure

**Performance**
- LCP on PDP hero image (target < 2.5 s)
- INP on PLP filter interactions (target < 200 ms)
- CLS on product grid (target < 0.1) — fixed image aspect ratios are the main lever

**Business**
- Add-to-cart rate per page type
- Checkout funnel drop-off by step
- Facet usage heatmap (which filters are actually used)

**Reliability**
- Cart API error rate and retry success rate
- Reconciliation conflicts per session (409 frequency)
- Facet service availability and its effect on bounce rate

---

### Minute summary (closing)

"I would treat the URL as the authoritative contract for the entire PLP experience: every filter, sort, and page lives in query params with a canonical ordering so that the same filter combination always produces the same URL, which makes results shareable, back-button safe, and edge-cacheable. The product grid renders SSR HTML for the first page so search engines and users on slow connections both get content immediately, then hydrates into a virtualized client grid that only renders the visible rows with fixed-aspect-ratio images to hold CLS at zero. Cart operations are optimistic by default — the user sees the item in the drawer instantly, the server call happens in the background, and any conflict such as an out-of-stock `409` is surfaced inline without rolling back the drawer state. The whole system degrades gracefully: facets down means browse without filters, cart API down means a clear retry CTA, and PDP inventory down means a deferred availability check rather than a blocked buy button."
