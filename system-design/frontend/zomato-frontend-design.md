# Design the frontend for Zomato (interview framing)

 [← Frontend prep index](./README.md)

**Zomato-class** clients combine **geo-aware discovery** (list + **map**), **rich restaurant pages**, **menus**, **cart & checkout**, **reviews**, and **order tracking**. Constraints: **emerging-market** networks, **mobile-first**, and **conversion** on food ordering paths.

---

## 1. Clarify scope

- **Flows:** **Discovery** (home, search, filters) → **restaurant detail** → **menu + cart** → **checkout / payment** → **order status** (“live” map optional).
- **Markets:** India-heavy — **UPI**, COD, **regional** languages, **low-end devices** and spotty networks.
- **Maps:** **List–map split** or toggle; **cluster** pins at city zoom; **deep links** to restaurant.

**Non-functional:** **Fast first paint** on 3G; **small bundle** for main path; **LCP** for hero food imagery; **WCAG** for forms at checkout; **PII** hygiene on payment pages.

---

## 2. High-level architecture

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

## 3. Core UX & data

1. **Home** — **Personalized** rails (continue order, offers, collections); **image-heavy** — **LQIP**, **lazy**, **responsive**.
2. **Search** — **Debounced** query + **recent** searches local; **filters** (veg-only, rating, cuisine) as **facets** with URL-sync for shareability (`?cuisine=…`).
3. **Restaurant detail** — **Sticky** cart CTA; menu **sections** large → **virtualize** or **paginate** sections; **item modifiers** (size, add-ons) in sheet/modal.
4. **Cart** — **Price breakdown** (taxes, fees) server-authoritative; **free-delivery** thresholds as **computed** banners.
5. **Checkout** — **Validation** per field; **payment** failures **actionable**; preserve cart on **back**.

---

## 4. Maps & location

- **Lazy-load** map chunk; **throttle** camera moves before refetching “restaurants in bbox.”
- **Pin** → **card** sync on selection; **accessibility** alternative: list-first path without map.
- **Geolocation** failure → **city picker** fallback; **cache** last good location.

---

## 5. Deep dives (pick 2)

### A. Performance on constrained devices

**Route-level code splitting**; **image CDN** with aggressive **webp** + **small** breakpoints; **prefetch** only **next likely** screen (e.g. restaurant when row visible). **Service worker** optional for **offline menu cache** (stale badge).

### B. Reliability & API failure

**Retry** idempotent GETs; **cart** **dirty flag** if price changes → **re-quote** modal. **GraphQL** `@defer` / field-level errors — **partial UI** vs full error boundary per panel.

### C. Observability

**RUM** on **checkout funnel** drop-off steps; **feature** timers for **menu render**; **source maps** for crash groups.

### D. Trust & safety

**Review** **report** flow; **allergy** disclaimers; **payment** never log full PAN; **CSP** on web checkout if embedded.

---

## 6. Trade-offs

| Choice | Upside | Cost |
|--------|--------|------|
| Heavy SSR for SEO | Organic discovery | TTFB vs edge cache complexity |
| Client-side filters | Snappy | Large catalog payloads unless server facet |
| Always-on map | Exploration | Bundle + GPU + battery |

---

## 7. Minute summary

“**Zomato’s frontend** optimizes **discovery → menu → checkout** on **slow networks**: BFF-shaped APIs, **lazy maps**, **virtualized menus**, **image/CDN discipline**, **location fallbacks**, and **cart/checkout** flows that **re-quote** when prices change — with **RUM** on the funnel and **small bundles** for the critical path.”
