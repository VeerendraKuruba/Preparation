# Q6. E-commerce: PLP → PDP → cart

**Prompt variants:** **Amazon**-style listing, product page, cart — including **faceted filters, sort, and huge listings** (SEO + virtualization).

 [← Question index](./README.md)

**Focus area:** [Filters & listing at scale](#filters-and-listing-at-scale) — faceted nav, URL state, virtualization.

---

### One-line mental model

**URL is product state** for SEO and shareability; the client **streams** above-the-fold first, **virtualizes** long grids, and treats **cart as reconciled** optimistic actions with idempotent server semantics.

### Clarify scope in the interview

Guest checkout? International pricing? **SEO** must-win pages?

### Goals & requirements

- **Functional:** filters, sort, PDP gallery, reviews, add to cart.
- **Non-functional:** SEO, fast **LCP** on PDP, resilient cart.

### High-level frontend architecture

**SSR/ISR/edge** for PLP/PDP where SEO matters → hydrate → **client caches** for repeat navigations → cart service with **server truth**.

### What the client does (core mechanics)

1. **Query params** encode filters; canonical URLs.
2. PLP: virtualized grid; filter drawer state ↔ URL.
3. PDP: one **hero** image prioritized; reviews lazy tab.
4. Cart: optimistic line item; **merge** on 409/inventory errors with clear UX.

### Filters and listing at scale

Use this when the prompt stresses **facet filters**, **sort**, or **tens of thousands of products** in one “browse” experience.

1. **URL as source of truth** — Map dimensions to query params (`color`, `size`, `brand`, `priceMin/Max`, `sort`, `q`); define **encoding** (repeated keys vs comma lists); **canonical** param order for sharing and **CDN keys**; **`pushState` debounced** so every intermediate checkbox doesn’t spam history (optional `replaceState` while panel open).
2. **Dependent facets** — Facet **counts** are usually valid **in context** of other selected filters; when one facet changes, **refetch facet metadata** or accept **stale counts** with refresh indicator; disable impossible combos if API supports **constrained** facet graph.
3. **Request churn** — On filter change: **abort** in-flight listing requests; **reset scroll** to top for new result set (usually); **key** virtual list by **serialized filter state** so rows don’t “recycle” wrong items across incompatible queries.
4. **Virtualized PLP** — Windowed grid/list; **stable row height** or measured cache; **overscan** for fast scroll; images **lazy** + fixed aspect ratio for **CLS**; **skeleton** first page, optional “keep previous results ghosted” (honest trade-off: can mislead).
5. **Pagination under filters** — **Cursor** for infinite scroll CSR; **offset/page** only when you must align with **SSR HTML** for bots; cap how many pages held in client memory or use **windowed** store (drop far pages).
6. **Search + browse** — Same URL machinery for `q=` + facets; **typeahead** may hit **search** while grid hits **browse**—BFF to unify or client **orchestrates** two calls with single loading UX.
7. **Mobile** — Filter **sheet/drawer**; “**Apply**” vs instant apply (reduces API calls); sync sheet state ↔ URL on apply.
8. **Edge / SSR** — ISR/edge cache **only** for **popular** filter combinations; long-tail filters **miss** origin—define **TTL** and **Vary** headers (locale, currency).

### Trade-offs

| Choice upside | Trade-off |
|---------------|-----------|
| Heavy SSR | TTFB vs edge cache complexity |
| Client-only filters | Bad shareable links, weak SEO |

### Failure modes & degradation

PLP without facets if facet service down (degraded default); PDP **buy box** errors surfaced inline.

### Accessibility checklist

Sort/filter announced; gallery keyboard; focus management on “added to cart.”

### Minute summary (closing)

“We make **routes and query params the contract** for SEO, **virtualize** listings, **prioritize PDP media**, and design **cart** around idempotent server reconciliation.”

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Guest vs account, locales, SEO must-haves, inventory rules |
| High-level architecture | 12–18 | PLP/PDP rendering strategy, URL design, cart service boundary |
| Deep dive 1 | 12–18 | **SEO + URL/filter state** or **PLP virtualization** |
| Deep dive 2 | 12–18 | **Filters/facets + virtualization** or **cart** or **PDP media** |
| Trade-offs, failure, metrics | 8–12 | Degraded faceted nav, observability |

### What to draw (whiteboard)

- **PLP:** `/search?query=&facet=color:red&sort=` ↔ client state.
- **PDP:** hero image → gallery → buy box → lazy tabs (reviews).
- **Cart:** optimistic `POST` → server line ids → **reconcile** on 409.
- **CDN/edge** box if you use ISR/edge HTML.

### Deep dives — pick 2

**A. SEO & routing** — SSR/ISR vs CSR; **canonical** URLs for filtered views; duplicate content pitfalls; structured data (mention briefly); bot vs human strategy.

**B. Filters & facets** — Dependent counts; debounced URL updates; **abort + resync** on facet change; inclusive vs exclusive facet UX; **price slider** debouncing; facet API down → **browse without facets** banner.

**C. PLP performance** — Virtualized grid at **large** counts; facet API failures → degraded facets; skeleton vs empty; image lazy and aspect ratio for CLS; memory caps for infinite scroll.

**D. PDP media** — Single LCP candidate; `srcset`/`sizes`; carousel a11y; zoom/lightbox trade-offs.

**E. Cart correctness** — **Idempotent** add with key; merge server cart on load; concurrency (two tabs); inventory **`409`** → inline fix; guest → login merge.

Pick any two; **B + C** pair well for **filters + listing scale** prompts.

### Common follow-ups

- **“Wishlist?”** — Separate surface; same isolation patterns; auth required.
- **“AB tests on PLP?”** — Don’t destroy SEO; cohort at edge; stable assignments; flash of wrong variant (FOOC) mitigation.
- **“International pricing?”** — Locale in URL or cookie—consistency with CDN cache keys; client displays formatted strings from server.

### What you’d measure

- **Perf:** LCP on PDP, PLP interaction (INP), CLS on image grids.
- **Biz:** add-to-cart rate, checkout funnel drop, facet usage.
- **Reliability:** cart API errors, reconciliation conflicts per session.

